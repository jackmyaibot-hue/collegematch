import { LEVEL_PREFS, SPORTS } from '../data/types';

/** Counts only. A random install id is used to dedupe people, then discarded after 40 days. */
export const USAGE_EVENTS = ['open', 'profile', 'swipe', 'save', 'email'] as const;
export type UsageEventName = (typeof USAGE_EVENTS)[number];

const INSTALL_ID = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const DAY_TTL_SECONDS = 40 * 24 * 60 * 60;

export type ParsedUsage = {
  id: string;
  name: UsageEventName;
  sport: string | null;
  levels: string[];
};

export type UsageSnapshot = {
  totals: Record<UsageEventName, number>;
  /** Day (UTC) -> anonymous install ids that opened the app. */
  days: Record<string, string[]>;
  profiles: string[];
  sports: Record<string, number>;
  levels: Record<string, number>;
};

export type UsageReport = {
  active: { day: number; week: number; month: number };
  totals: Record<UsageEventName, number>;
  sports: Record<string, number>;
  levels: Record<string, number>;
};

/** Reads only the allowlisted fields. Names, emails, and anything else are ignored. */
export function parseUsage(body: unknown): ParsedUsage | null {
  if (!body || typeof body !== 'object') return null;
  const row = body as Record<string, unknown>;
  if (typeof row.id !== 'string' || !INSTALL_ID.test(row.id)) return null;
  if (typeof row.name !== 'string' || !(USAGE_EVENTS as readonly string[]).includes(row.name)) return null;
  const name = row.name as UsageEventName;
  let sport: string | null = null;
  let levels: string[] = [];
  if (name === 'profile') {
    if (typeof row.sport === 'string' && (SPORTS as readonly string[]).includes(row.sport)) sport = row.sport;
    if (Array.isArray(row.levels)) {
      levels = row.levels
        .filter((item): item is string => item === 'open' || (LEVEL_PREFS as readonly string[]).includes(item))
        .slice(0, LEVEL_PREFS.length);
    }
  }
  return { id: row.id.toLowerCase(), name, sport, levels };
}

export function emptyUsage(): UsageSnapshot {
  return {
    totals: { open: 0, profile: 0, swipe: 0, save: 0, email: 0 },
    days: {},
    profiles: [],
    sports: {},
    levels: {},
  };
}

export function applyUsage(state: UsageSnapshot, event: ParsedUsage, day: string): UsageSnapshot {
  const totals = { ...state.totals };
  const days = { ...state.days };
  let profiles = state.profiles;
  let sports = state.sports;
  let levels = state.levels;

  if (event.name === 'open') {
    totals.open += 1;
    const seen = new Set(days[day] ?? []);
    seen.add(event.id);
    days[day] = [...seen];
  } else if (event.name === 'profile') {
    if (!profiles.includes(event.id)) {
      totals.profile += 1;
      profiles = [...profiles, event.id];
      if (event.sport) sports = { ...sports, [event.sport]: (sports[event.sport] ?? 0) + 1 };
      if (event.levels.length > 0) {
        levels = { ...levels };
        for (const level of event.levels) levels[level] = (levels[level] ?? 0) + 1;
      }
    }
  } else {
    totals[event.name] += 1;
  }

  return { totals, days, profiles, sports, levels };
}

export function utcDay(offset = 0, now = new Date()): string {
  const date = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  date.setUTCDate(date.getUTCDate() + offset);
  return date.toISOString().slice(0, 10);
}

function recentDays(today: string, count: number): string[] {
  const [year, month, day] = today.split('-').map(Number);
  const start = new Date(Date.UTC(year, month - 1, day));
  const days: string[] = [];
  for (let index = 0; index < count; index += 1) {
    const date = new Date(start);
    date.setUTCDate(start.getUTCDate() - index);
    days.push(date.toISOString().slice(0, 10));
  }
  return days;
}

export function usageReport(state: UsageSnapshot, today: string): UsageReport {
  const monthDays = recentDays(today, 30);
  const month = new Set<string>();
  const week = new Set<string>();
  monthDays.forEach((day, index) => {
    for (const id of state.days[day] ?? []) {
      month.add(id);
      if (index < 7) week.add(id);
    }
  });
  return {
    active: { day: (state.days[today] ?? []).length, week: week.size, month: month.size },
    totals: state.totals,
    sports: state.sports,
    levels: state.levels,
  };
}

export function passwordsMatch(given: string, expected: string): boolean {
  const left = new TextEncoder().encode(given);
  const right = new TextEncoder().encode(expected);
  const length = Math.max(left.length, right.length);
  let mismatch = left.length === right.length ? 0 : 1;
  for (let index = 0; index < length; index += 1) {
    mismatch |= (left[index] ?? 0) ^ (right[index] ?? 0);
  }
  return mismatch === 0;
}

type RedisResult = { result?: unknown; error?: string };

function upstashConfig(): { url: string; token: string } | null {
  const url = process.env.UPSTASH_REDIS_REST_URL?.trim();
  const token = process.env.UPSTASH_REDIS_REST_TOKEN?.trim();
  if (!url || !token) return null;
  return { url: url.replace(/\/$/, ''), token };
}

async function redis(commands: (string | number)[][]): Promise<unknown[] | null> {
  const config = upstashConfig();
  if (!config) return null;
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

function hashGetAll(value: unknown): Record<string, number> {
  const counts: Record<string, number> = {};
  if (value && typeof value === 'object' && !Array.isArray(value)) {
    for (const [key, raw] of Object.entries(value)) counts[key] = Number(raw) || 0;
    return counts;
  }
  if (!Array.isArray(value)) return counts;
  for (let index = 0; index + 1 < value.length; index += 2) {
    const key = value[index];
    const raw = value[index + 1];
    if (typeof key === 'string') counts[key] = Number(raw) || 0;
  }
  return counts;
}

function asCount(value: unknown): number {
  const count = Number(value);
  return Number.isFinite(count) ? count : 0;
}

function asIds(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === 'string') : [];
}

export function storageConfigured(): boolean {
  return upstashConfig() != null;
}

export async function recordUsage(event: ParsedUsage, day = utcDay()): Promise<boolean> {
  const commands: (string | number)[][] = [];
  if (event.name === 'open') {
    commands.push(['INCR', 'cm:t:open'], ['SADD', `cm:d:${day}`, event.id], ['EXPIRE', `cm:d:${day}`, DAY_TTL_SECONDS]);
  } else if (event.name === 'profile') {
    const seen = await redis([['SISMEMBER', 'cm:profiles', event.id]]);
    if (!seen) return false;
    if (Number(seen[0]) === 1) return true;
    commands.push(['SADD', 'cm:profiles', event.id], ['EXPIRE', 'cm:profiles', DAY_TTL_SECONDS], ['INCR', 'cm:t:profile']);
    if (event.sport) commands.push(['HINCRBY', 'cm:sports', event.sport, 1]);
    for (const level of event.levels) commands.push(['HINCRBY', 'cm:levels', level, 1]);
  } else {
    commands.push(['INCR', `cm:t:${event.name}`]);
  }
  const saved = await redis(commands);
  return saved != null;
}

export async function readUsage(today = utcDay()): Promise<UsageReport | null> {
  const days = recentDays(today, 30);
  const commands: (string | number)[][] = [
    ['MGET', 'cm:t:open', 'cm:t:profile', 'cm:t:swipe', 'cm:t:save', 'cm:t:email'],
    ['HGETALL', 'cm:sports'],
    ['HGETALL', 'cm:levels'],
    ['SUNION', ...days.map((day) => `cm:d:${day}`)],
    ['SUNION', ...days.slice(0, 7).map((day) => `cm:d:${day}`)],
    ['SMEMBERS', `cm:d:${today}`],
  ];
  const rows = await redis(commands);
  if (!rows) return null;
  const totalsRaw = Array.isArray(rows[0]) ? rows[0] : [];
  const month = new Set(asIds(rows[3]));
  const week = new Set(asIds(rows[4]));
  return {
    active: { day: asIds(rows[5]).length, week: week.size, month: month.size },
    totals: {
      open: asCount(totalsRaw[0]),
      profile: asCount(totalsRaw[1]),
      swipe: asCount(totalsRaw[2]),
      save: asCount(totalsRaw[3]),
      email: asCount(totalsRaw[4]),
    },
    sports: hashGetAll(rows[1]),
    levels: hashGetAll(rows[2]),
  };
}

function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (character) => {
    if (character === '&') return '&amp;';
    if (character === '<') return '&lt;';
    if (character === '>') return '&gt;';
    if (character === '"') return '&quot;';
    return '&#39;';
  });
}

function countTable(title: string, rows: [string, number][]): string {
  const body = rows
    .map(([label, count]) => `<tr><td>${escapeHtml(label)}</td><td>${count}</td></tr>`)
    .join('');
  return `<h2>${escapeHtml(title)}</h2><table>${body || '<tr><td>None yet</td><td>0</td></tr>'}</table>`;
}

export function statsPage(report: UsageReport | null, message?: string): string {
  const numbers = report
    ? [
        countTable('Active people', [
          ['Today', report.active.day],
          ['Last 7 days', report.active.week],
          ['Last 30 days', report.active.month],
        ]),
        countTable('Counts', [
          ['App opens', report.totals.open],
          ['Profiles completed', report.totals.profile],
          ['Swipes', report.totals.swipe],
          ['Schools saved', report.totals.save],
          ['Coach emails drafted', report.totals.email],
        ]),
        countTable('Profiles by sport', Object.entries(report.sports)),
        countTable('Profiles by level', Object.entries(report.levels)),
      ].join('')
    : '';
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <meta name="robots" content="noindex" />
  <title>CollegeMatch usage</title>
  <style>
    body { font-family: Georgia, serif; margin: 32px auto; max-width: 640px; color: #17211c; background: #f3f0e8; }
    table { border-collapse: collapse; width: 100%; margin-bottom: 24px; }
    td { border-bottom: 1px solid #e4ddd2; padding: 8px 0; }
    td:last-child { text-align: right; }
    input, button { font: inherit; padding: 8px 12px; }
    .note { color: #3c4a43; }
  </style>
</head>
<body>
  <h1>CollegeMatch usage</h1>
  <p class="note">Anonymous counts only. No names, emails, profiles, or IP addresses.</p>
  ${message ? `<p>${escapeHtml(message)}</p>` : ''}
  <form method="POST" action="/stats">
    <label>Password <input type="password" name="password" autocomplete="current-password" /></label>
    <button type="submit">Show counts</button>
  </form>
  ${numbers}
</body>
</html>`;
}
