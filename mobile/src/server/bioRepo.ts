import { sha256Hex } from './crypto';
import type { BioRecord, BioRepo } from './bio';

export const BIO_PLAYER_PREFIX = 'cm:bio:p:';
export const BIO_SLUG_PREFIX = 'cm:bio:slug:';
export const BIO_TOKEN_PREFIX = 'cm:bio:tok:';
export const BIO_PHOTO_PREFIX = 'cm:bio:pic:';
export const BIO_SMS_PREFIX = 'cm:bio:sms:';

type RedisResult = { result?: unknown; error?: string };

function redisConfig(): { url: string; token: string } | null {
  const url = process.env.UPSTASH_REDIS_REST_URL?.trim();
  const token = process.env.UPSTASH_REDIS_REST_TOKEN?.trim();
  if (!url || !token) return null;
  return { url: url.replace(/\/$/, ''), token };
}

async function redis(commands: (string | number)[][]): Promise<unknown[] | null> {
  const config = redisConfig();
  if (!config || commands.length === 0) return commands.length === 0 ? [] : null;
  const response = await fetch(`${config.url}/pipeline`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${config.token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(commands),
  });
  if (!response.ok) return null;
  const rows = (await response.json()) as RedisResult[];
  if (!Array.isArray(rows) || rows.some((row) => row.error)) return null;
  return rows.map((row) => row.result);
}

function cloneRecord(record: BioRecord): BioRecord {
  return {
    ...record,
    snapshot: { ...record.snapshot, colleges: record.snapshot.colleges.map((college) => ({ ...college })) },
    photo: record.photo ? { ...record.photo } : null,
    sentAt: [...record.sentAt],
  };
}

export function createMemoryRepo(): BioRepo {
  const byPlayer = new Map<string, BioRecord>();
  const phoneLog = new Map<string, number[]>();
  return {
    async getByPlayer(playerId) {
      const record = byPlayer.get(playerId);
      return record ? cloneRecord(record) : null;
    },
    async getBySlug(slug) {
      for (const record of byPlayer.values()) {
        if (record.slug === slug) return cloneRecord(record);
      }
      return null;
    },
    async getByTokenHash(tokenHash) {
      for (const record of byPlayer.values()) {
        if (record.tokenHash === tokenHash) return cloneRecord(record);
      }
      return null;
    },
    async save(record) {
      byPlayer.set(record.playerId, cloneRecord(record));
    },
    async remove(record) {
      byPlayer.delete(record.playerId);
    },
    async phoneSends(phone) {
      return [...(phoneLog.get(phone) ?? [])];
    },
    async rememberPhoneSend(phone, at) {
      const next = [...(phoneLog.get(phone) ?? []), at].filter((stamp) => at - stamp < 86_400_000);
      phoneLog.set(phone, next);
    },
  };
}

type StoredRecord = Omit<BioRecord, 'photo'> & { photo: null; hasPhoto: boolean };

function packRecord(record: BioRecord): string {
  const stored: StoredRecord = { ...record, photo: null, hasPhoto: record.photo != null };
  return JSON.stringify(stored);
}

function unpackRecord(raw: unknown, photo: BioRecord['photo']): BioRecord | null {
  if (typeof raw !== 'string') return null;
  try {
    const parsed = JSON.parse(raw) as StoredRecord;
    if (!parsed || parsed.playerId == null || parsed.snapshot == null) return null;
    const { hasPhoto: _hasPhoto, ...rest } = parsed;
    return { ...rest, photo };
  } catch {
    return null;
  }
}

export function saveCommands(record: BioRecord, previousToken: string | null, now: number): (string | number)[][] {
  const commands: (string | number)[][] = [
    ['SET', `${BIO_PLAYER_PREFIX}${record.playerId}`, packRecord(record)],
    ['SET', `${BIO_SLUG_PREFIX}${record.slug}`, record.playerId],
  ];
  if (record.photo) commands.push(['SET', `${BIO_PHOTO_PREFIX}${record.playerId}`, JSON.stringify(record.photo)]);
  else commands.push(['DEL', `${BIO_PHOTO_PREFIX}${record.playerId}`]);
  if (record.tokenHash && record.tokenExpiresAt) {
    const ttl = Math.max(60, Math.ceil((record.tokenExpiresAt - now) / 1000));
    commands.push(['SET', `${BIO_TOKEN_PREFIX}${record.tokenHash}`, record.playerId, 'EX', ttl]);
  }
  if (previousToken && previousToken !== record.tokenHash) {
    commands.push(['DEL', `${BIO_TOKEN_PREFIX}${previousToken}`]);
  }
  return commands;
}

export function removeCommands(record: BioRecord): (string | number)[][] {
  const commands: (string | number)[][] = [
    ['DEL', `${BIO_PLAYER_PREFIX}${record.playerId}`],
    ['DEL', `${BIO_SLUG_PREFIX}${record.slug}`],
    ['DEL', `${BIO_PHOTO_PREFIX}${record.playerId}`],
  ];
  if (record.tokenHash) commands.push(['DEL', `${BIO_TOKEN_PREFIX}${record.tokenHash}`]);
  return commands;
}

async function loadPhoto(playerId: string): Promise<BioRecord['photo']> {
  const rows = await redis([['GET', `${BIO_PHOTO_PREFIX}${playerId}`]]);
  if (!rows || typeof rows[0] !== 'string') return null;
  try {
    const parsed = JSON.parse(rows[0]) as BioRecord['photo'];
    if (!parsed || typeof parsed.data !== 'string' || typeof parsed.contentType !== 'string') return null;
    return parsed;
  } catch {
    return null;
  }
}

function createRedisRepo(): BioRepo {
  return {
    async getByPlayer(playerId) {
      const rows = await redis([['GET', `${BIO_PLAYER_PREFIX}${playerId}`]]);
      if (!rows) throw new Error('The bio store did not respond.');
      if (typeof rows[0] !== 'string') return null;
      const photo = await loadPhoto(playerId);
      return unpackRecord(rows[0], photo);
    },
    async getBySlug(slug) {
      const rows = await redis([['GET', `${BIO_SLUG_PREFIX}${slug}`]]);
      if (!rows || typeof rows[0] !== 'string') return null;
      return this.getByPlayer(rows[0]);
    },
    async getByTokenHash(tokenHash) {
      const rows = await redis([['GET', `${BIO_TOKEN_PREFIX}${tokenHash}`]]);
      if (!rows || typeof rows[0] !== 'string') return null;
      const record = await this.getByPlayer(rows[0]);
      if (!record || record.tokenHash !== tokenHash) return null;
      return record;
    },
    async save(record) {
      const current = await redis([['GET', `${BIO_PLAYER_PREFIX}${record.playerId}`]]);
      const previous = current && typeof current[0] === 'string' ? unpackRecord(current[0], null) : null;
      const saved = await redis(saveCommands(record, previous?.tokenHash ?? null, Date.now()));
      if (!saved) throw new Error('The bio store did not respond.');
    },
    async remove(record) {
      const saved = await redis(removeCommands(record));
      if (!saved) throw new Error('The bio store did not respond.');
    },
    async phoneSends(phone) {
      const rows = await redis([['GET', `${BIO_SMS_PREFIX}${await sha256Hex(phone)}`]]);
      if (!rows || typeof rows[0] !== 'string') return [];
      try {
        const parsed = JSON.parse(rows[0]) as unknown;
        return Array.isArray(parsed) ? parsed.filter((item): item is number => typeof item === 'number') : [];
      } catch {
        return [];
      }
    },
    async rememberPhoneSend(phone, at) {
      const key = `${BIO_SMS_PREFIX}${await sha256Hex(phone)}`;
      const existing = await this.phoneSends(phone);
      const next = [...existing, at].filter((stamp) => at - stamp < 86_400_000);
      const saved = await redis([['SET', key, JSON.stringify(next), 'EX', 172800]]);
      if (!saved) throw new Error('The bio store did not respond.');
    },
  };
}

const memoryHolder = globalThis as { __cmBioRepo?: BioRepo };
let warned = false;

export function appBioRepo(): BioRepo {
  if (redisConfig()) return createRedisRepo();
  if (!warned) {
    warned = true;
    console.warn(
      'CollegeMatch bio store is in memory for this process. Set UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN to keep bios and photos.',
    );
  }
  if (!memoryHolder.__cmBioRepo) memoryHolder.__cmBioRepo = createMemoryRepo();
  return memoryHolder.__cmBioRepo;
}
