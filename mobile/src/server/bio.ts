import { acceptPhoto, type BioPhoto } from '../data/photo';
import { stateName } from '../data/regions';
import { dominantSideDisplay, leagueShortList, positionSlash, SPORT_LABEL } from '../data/sports';
import { LEAGUE_IDS, POSITIONS, SPORTS, type LeagueId, type PlayerProfile, type Position, type Sport } from '../data/types';
import { passwordsMatch } from './usage';
import { randomId, sha256Hex } from './crypto';
import { approvalEmail, type EmailProvider } from './email';

export const TOKEN_TTL_MS = 72 * 60 * 60 * 1000;
export const SEND_MIN_GAP_MS = 60 * 1000;
export const SEND_PLAYER_HOUR = 3;
export const SEND_PLAYER_DAY = 8;
export const SEND_PARENT_DAY = 5;
const DAY_MS = 24 * 60 * 60 * 1000;
const HOUR_MS = 60 * 60 * 1000;

export class BioError extends Error {
  readonly status: number;

  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

export type BioCollege = {
  name: string;
  division: string;
  place: string;
};

/** Fields a public page is allowed to show. No birthday, parent email, or phone. */
export type BioSnapshot = {
  name: string;
  sportLabel: string;
  position: string;
  gradYear: number;
  club: string;
  leagues: string;
  jersey: string;
  foot: string;
  /** "Foot" for soccer. "Hand" for flag football. Older bios omit this and stay "Foot". */
  sideLabel?: string;
  yearsAtLevel: string;
  yearsLabel?: string;
  forty?: string;
  shuttle?: string;
  vertical?: string;
  height: string;
  gpa: string;
  homeState: string;
  majors: string;
  honors: string;
  proudOf: string;
  funFact: string;
  highlightUrl: string;
  colleges: BioCollege[];
};

export type BioRecord = {
  playerId: string;
  slug: string;
  status: 'pending' | 'approved';
  parentEmail: string;
  secretHash: string;
  snapshot: BioSnapshot;
  photo: BioPhoto | null;
  tokenHash: string | null;
  tokenExpiresAt: number | null;
  createdAt: number;
  updatedAt: number;
  approvedAt: number | null;
  sentAt: number[];
};

export type BioRepo = {
  getByPlayer(playerId: string): Promise<BioRecord | null>;
  getBySlug(slug: string): Promise<BioRecord | null>;
  getByTokenHash(tokenHash: string): Promise<BioRecord | null>;
  save(record: BioRecord): Promise<void>;
  remove(record: BioRecord): Promise<void>;
  destinationSends(destination: string): Promise<number[]>;
  rememberDestinationSend(destination: string, at: number): Promise<void>;
};

export type PublishResult = {
  state: 'pending';
  slug: string;
  expiresAt: number;
  delivery: 'mock' | 'sent';
  mockApprovalUrl: string | null;
};

export type StatusResult = {
  state: 'none' | 'pending' | 'approved';
  publicPath: string | null;
  expiresAt: number | null;
};

const PLAYER_ID = /^[A-Za-z0-9_-]{8,80}$/;
const SECRET = /^[A-Za-z0-9_-]{20,120}$/;

export function isPublic(record: BioRecord | null): record is BioRecord {
  return record?.status === 'approved';
}

export function rateLimitReason(playerSends: number[], parentSends: number[], now: number): string | null {
  const recent = (stamps: number[], windowMs: number) => stamps.filter((at) => now - at < windowMs && at <= now);
  if (recent(playerSends, SEND_MIN_GAP_MS).length >= 1) return 'Wait a minute before sending another email.';
  if (recent(playerSends, HOUR_MS).length >= SEND_PLAYER_HOUR) {
    return 'Three emails have already gone out this hour. Try again later.';
  }
  if (recent(playerSends, DAY_MS).length >= SEND_PLAYER_DAY) return 'The daily email limit has been reached. Try again tomorrow.';
  if (recent(parentSends, DAY_MS).length >= SEND_PARENT_DAY) {
    return 'That parent email has received the daily limit.';
  }
  return null;
}

function normalizeEmail(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const email = value.trim().toLowerCase();
  if (email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return null;
  return email;
}

function cleanText(value: unknown, max: number): string {
  if (typeof value !== 'string') return '';
  return value.replace(/[\u0000-\u001f\u007f]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, max);
}

function asRecord(body: unknown): Record<string, unknown> {
  if (!body || typeof body !== 'object') throw new BioError('That publish request could not be read.', 400);
  return body as Record<string, unknown>;
}

function snapshotFrom(body: Record<string, unknown>): BioSnapshot {
  const sport = body.sport;
  if (typeof sport !== 'string' || !(SPORTS as readonly string[]).includes(sport)) {
    throw new BioError('Choose a sport before publishing.', 400);
  }
  const positions = Array.isArray(body.positions)
    ? body.positions.filter((item): item is Position => typeof item === 'string' && (POSITIONS as readonly string[]).includes(item))
    : [];
  const primary = positions.includes(body.primaryPosition as Position) ? (body.primaryPosition as Position) : positions[0];
  if (!primary || positions.length === 0) throw new BioError('Add a position before publishing.', 400);
  const leagues = Array.isArray(body.leagues)
    ? body.leagues.filter((item): item is LeagueId => typeof item === 'string' && (LEAGUE_IDS as readonly string[]).includes(item))
    : [];
  if (leagues.length === 0) throw new BioError('Add a league before publishing.', 400);
  const gradYear = Number(body.gradYear);
  if (!Number.isInteger(gradYear) || gradYear < 2024 || gradYear > 2036) {
    throw new BioError('Add a graduation year before publishing.', 400);
  }
  const name = cleanText(body.name, 80);
  if (name.length < 2) throw new BioError('Add a name before publishing.', 400);
  const home = typeof body.homeState === 'string' ? body.homeState : '';
  const homeLabel = stateName(home);
  if (!home || homeLabel === home) throw new BioError('Add a home state before publishing.', 400);
  const years = Number(body.yearsAtLevel);
  const jersey = body.jerseyNumber == null || body.jerseyNumber === '' ? null : Number(body.jerseyNumber);
  const otherLeague = cleanText(body.otherLeague, 80);
  const measurable = (value: unknown, min: number, max: number, digits: number): string => {
    const number = typeof value === 'number' ? value : Number(value);
    if (!Number.isFinite(number) || number < min || number > max) return '';
    return digits === 0 ? String(Math.round(number)) : number.toFixed(2).replace(/\.?0+$/, '');
  };
  const side = body.dominantSide === 'left' || body.dominantSide === 'right' || body.dominantSide === 'both' ? body.dominantSide : null;
  const majors = Array.isArray(body.majors)
    ? body.majors.map((item) => cleanText(item, 60)).filter((item) => item.length >= 2).slice(0, 8)
    : [];
  const colleges = Array.isArray(body.colleges) ? body.colleges.slice(0, 24).flatMap(readCollege) : [];
  const highlight = cleanText(body.highlightUrl, 300);
  return {
    name,
    sportLabel: SPORT_LABEL[sport as Sport],
    position: positionSlash(positions, primary),
    gradYear,
    club: cleanText(body.club, 80),
    leagues: leagueShortList(leagues, otherLeague),
    jersey: jersey != null && Number.isInteger(jersey) && jersey >= 0 && jersey <= 99 ? `#${jersey}` : '',
    foot: dominantSideDisplay(sport as Sport, side) ?? '',
    sideLabel: sport === 'flag-football' ? 'Hand' : 'Foot',
    yearsAtLevel: Number.isFinite(years) && years >= 0 && years <= 20 ? String(Math.round(years)) : '0',
    yearsLabel: sport === 'flag-football' ? 'Years playing' : 'Years at level',
    forty: sport === 'flag-football' ? measurable(body.fortyYard, 4, 8, 2) : '',
    shuttle: sport === 'flag-football' ? measurable(body.shuttle, 3.5, 7, 2) : '',
    vertical: sport === 'flag-football' ? measurable(body.vertical, 10, 50, 0) : '',
    height: cleanText(body.height, 20),
    gpa: cleanText(body.gpa, 24),
    homeState: homeLabel,
    majors: majors.join(', '),
    honors: cleanText(body.honors, 240),
    proudOf: cleanText(body.proudOf, 240),
    funFact: cleanText(body.funFact, 240),
    highlightUrl: /^https?:\/\/\S+$/i.test(highlight) ? highlight : '',
    colleges,
  };
}

function readCollege(value: unknown): BioCollege[] {
  if (!value || typeof value !== 'object') return [];
  const row = value as Record<string, unknown>;
  const name = cleanText(row.name, 80);
  if (name.length < 2) return [];
  const city = cleanText(row.city, 40);
  const state = cleanText(row.state, 20);
  const place = [city, state].filter(Boolean).join(', ');
  return [{ name, division: cleanText(row.division, 40), place }];
}

function idsFrom(body: Record<string, unknown>): { playerId: string; secret: string } {
  const playerId = typeof body.playerId === 'string' ? body.playerId : '';
  const secret = typeof body.secret === 'string' ? body.secret : '';
  if (!PLAYER_ID.test(playerId) || !SECRET.test(secret)) {
    throw new BioError('This profile cannot publish yet. Save it on the phone and try again.', 400);
  }
  return { playerId, secret };
}

async function assertOwner(record: BioRecord, secret: string): Promise<void> {
  const hash = await sha256Hex(secret);
  if (!passwordsMatch(hash, record.secretHash)) {
    throw new BioError('This phone cannot change that bio.', 401);
  }
}

function trimSends(stamps: number[], now: number): number[] {
  return stamps.filter((at) => now - at < DAY_MS && at <= now);
}

export async function publishBio(args: {
  repo: BioRepo;
  email: EmailProvider;
  body: unknown;
  origin: string;
  now: number;
}): Promise<PublishResult> {
  const row = asRecord(args.body);
  const { playerId, secret } = idsFrom(row);
  const parentEmail = normalizeEmail(row.parentEmail);
  if (!parentEmail) throw new BioError('Add a parent email before publishing.', 400);
  const snapshot = snapshotFrom(row);
  let photo: BioPhoto | null;
  try {
    photo = acceptPhoto(row.photo);
  } catch (error) {
    throw new BioError(error instanceof Error ? error.message : 'That photo could not be read.', 400);
  }
  const existing = await args.repo.getByPlayer(playerId);
  if (existing) await assertOwner(existing, secret);
  const parentSends = await args.repo.destinationSends(parentEmail);
  const limited = rateLimitReason(existing?.sentAt ?? [], parentSends, args.now);
  if (limited) throw new BioError(limited, 429);

  const token = randomId(32);
  const tokenHash = await sha256Hex(token);
  const next: BioRecord = {
    playerId,
    slug: existing?.slug ?? randomId(12),
    status: 'pending',
    parentEmail,
    secretHash: existing?.secretHash ?? (await sha256Hex(secret)),
    snapshot,
    photo,
    tokenHash,
    tokenExpiresAt: args.now + TOKEN_TTL_MS,
    createdAt: existing?.createdAt ?? args.now,
    updatedAt: args.now,
    approvedAt: null,
    sentAt: trimSends([...(existing?.sentAt ?? []), args.now], args.now),
  };
  const url = `${args.origin.replace(/\/$/, '')}/approve/${token}`;
  await args.repo.save(next);
  try {
    await args.email.send(
      approvalEmail({
        to: parentEmail,
        name: snapshot.name,
        url,
        position: snapshot.position,
        gradYear: snapshot.gradYear,
        hasPhoto: photo != null,
        colleges: snapshot.colleges.map((college) => college.name),
      }),
    );
  } catch (error) {
    if (existing) await args.repo.save(existing);
    else await args.repo.remove(next);
    const message = error instanceof BioError ? error.message : 'The email could not be sent. Nothing was changed.';
    throw new BioError(message, error instanceof BioError ? error.status : 502);
  }
  try {
    await args.repo.rememberDestinationSend(parentEmail, args.now);
  } catch {
    console.warn('CollegeMatch could not record the parent-email send count.');
  }
  return {
    state: 'pending',
    slug: next.slug,
    expiresAt: next.tokenExpiresAt ?? args.now,
    delivery: args.email.id === 'mock' ? 'mock' : 'sent',
    mockApprovalUrl: args.email.id === 'mock' ? url : null,
  };
}

export async function bioStatus(repo: BioRepo, body: unknown): Promise<StatusResult> {
  const row = asRecord(body);
  const { playerId, secret } = idsFrom(row);
  const record = await repo.getByPlayer(playerId);
  if (!record) return { state: 'none', publicPath: null, expiresAt: null };
  await assertOwner(record, secret);
  if (record.status === 'approved') return { state: 'approved', publicPath: `/bio/${record.slug}`, expiresAt: null };
  return { state: 'pending', publicPath: null, expiresAt: record.tokenExpiresAt };
}

export async function unpublishBio(repo: BioRepo, body: unknown): Promise<void> {
  const row = asRecord(body);
  const { playerId, secret } = idsFrom(row);
  const record = await repo.getByPlayer(playerId);
  if (!record) throw new BioError('Nothing is published.', 404);
  await assertOwner(record, secret);
  await repo.remove(record);
}

export async function previewBio(repo: BioRepo, token: string, now: number): Promise<BioRecord | null> {
  if (!/^[A-Za-z0-9_-]{20,80}$/.test(token)) return null;
  const record = await repo.getByTokenHash(await sha256Hex(token));
  if (!record || record.status !== 'pending') return null;
  if (!record.tokenExpiresAt || record.tokenExpiresAt <= now) return null;
  return record;
}

export async function approveBio(repo: BioRepo, token: string, now: number): Promise<BioRecord | null> {
  const record = await previewBio(repo, token, now);
  if (!record) return null;
  const next: BioRecord = {
    ...record,
    status: 'approved',
    tokenHash: null,
    tokenExpiresAt: null,
    approvedAt: now,
    updatedAt: now,
  };
  await repo.save(next);
  return next;
}

export async function publicBio(repo: BioRepo, slug: string): Promise<BioRecord | null> {
  if (!/^[A-Za-z0-9_-]{10,24}$/.test(slug)) return null;
  const record = await repo.getBySlug(slug);
  return isPublic(record) ? record : null;
}

/** Used by the client payload. Keeps the server allowlist in one place for tests. */
export type PublishBody = {
  playerId: string;
  secret: string;
  parentEmail: string;
  name: string;
  sport: PlayerProfile['sport'];
  positions: PlayerProfile['positions'];
  primaryPosition: PlayerProfile['primaryPosition'];
  gradYear: number;
  club: string;
  leagues: PlayerProfile['leagues'];
  jerseyNumber: number | null;
  dominantSide: PlayerProfile['stats']['dominantSide'];
  yearsAtLevel: number;
  height: string;
  gpa: string;
  homeState: string;
  majors: string[];
  honors: string;
  proudOf: string;
  funFact: string;
  highlightUrl: string;
  colleges: { name: string; division: string; city: string; state: string }[];
  photo: BioPhoto | null;
};
