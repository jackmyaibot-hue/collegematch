import type { LeagueId, RosterOrigin, TeamRecord } from './types';

/** Sample handles are `cm` plus the school id, so they do not point at real accounts. */
export function instagramHandleFor(id: string): string {
  return `cm${id.replace(/-/g, '')}`;
}

/** https URL so a phone can open Instagram in the app or the browser. */
export function instagramProfileUrl(handle: string): string {
  const clean = handle.replace(/^@/, '').trim();
  return `https://www.instagram.com/${clean}/`;
}

/** Short button label for a confirmed official account. */
export function instagramLinkLabel(kind: 'team' | 'athletics' | 'school' | null | undefined): string {
  if (kind === 'team') return 'Team IG';
  if (kind === 'athletics') return 'Athletics IG';
  if (kind === 'school') return 'School IG';
  return 'Instagram';
}

export function recordLine(record: TeamRecord | null): string {
  if (!record) return '';
  return `${record.wins}\u2013${record.losses}\u2013${record.ties}`;
}

const FINISHES = [
  '1st in conference',
  '2nd in conference',
  '3rd in conference',
  'tied for 2nd',
  '4th in conference',
  '5th in conference',
];

const POSTSEASONS = [
  'NCAA second round',
  'Conference final',
  'NCAA first round',
  'Conference semifinals',
  'Conference quarterfinals',
  'Missed the postseason',
];

const NOTES = [
  'Seniors pick the Monday warm-up playlist.',
  'The bench rings a bell after every shutout.',
  'Home games start with a lap for the student section.',
  'Captains write a note to every freshman.',
  'One evening a week they train under the lights.',
  'A campus bakery sends pretzels after conference wins.',
];

/** Deterministic fictional season, so the same school always tells the same story. */
export function seasonStory(index: number): {
  record: TeamRecord;
  conferenceFinish: string;
  postseason: string;
  funFact: string;
  headCoachYears: number;
} {
  return {
    record: {
      wins: 6 + ((index * 3) % 11),
      losses: 2 + ((index * 5) % 8),
      ties: index % 4 === 0 ? 2 : index % 3,
    },
    conferenceFinish: FINISHES[index % FINISHES.length],
    postseason: POSTSEASONS[index % POSTSEASONS.length],
    funFact: NOTES[index % NOTES.length],
    headCoachYears: 2 + ((index * 3) % 13),
  };
}

const ORIGIN_STATES = ['CA', 'TX', 'FL', 'NY', 'WA', 'CO', 'NC', 'GA', 'IL', 'OH', 'PA', 'AZ', 'VA', 'MI', 'OR', 'MA'];
const ORIGIN_LEAGUES: LeagueId[] = ['ecnl', 'ecnl-rl', 'ga', 'nal', 'usys', 'nwsl-academy', 'usl-academy', 'other'];

export function rosterOrigin(homeState: string, index: number): RosterOrigin {
  const byState: Record<string, number> = { [homeState]: 2 + (index % 4) };
  for (let step = 1; step <= 3; step += 1) {
    const code = ORIGIN_STATES[(index + step * 5) % ORIGIN_STATES.length];
    if (code === homeState) continue;
    byState[code] = (byState[code] ?? 0) + (1 + ((index + step) % 2));
  }
  const byLeague: Partial<Record<LeagueId, number>> = {
    ecnl: 1 + (index % 4),
  };
  for (let step = 0; step < 3; step += 1) {
    const id = ORIGIN_LEAGUES[(index + step + 1) % ORIGIN_LEAGUES.length];
    byLeague[id] = 1 + ((index + step) % 3);
  }
  return { byState, byLeague };
}

export function playersFromState(origin: RosterOrigin | null, state: string): number {
  if (!origin) return 0;
  return origin.byState[state] ?? 0;
}

export function playersFromLeagues(origin: RosterOrigin | null, leagues: LeagueId[]): number {
  if (!origin) return 0;
  return leagues.reduce((sum, id) => sum + (origin.byLeague[id] ?? 0), 0);
}
