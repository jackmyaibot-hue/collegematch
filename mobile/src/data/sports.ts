import {
  POSITIONS,
  POSITION_LABEL,
  type AthleteGender,
  type DominantSide,
  type JucoDivision,
  type LeagueId,
  type LevelPref,
  type PlayerProfile,
  type Position,
  type Program,
  type ProgramSide,
  type Sport,
  type SponsoredPlacement,
} from './types';

export const SPORT_LABEL: Record<Sport, string> = {
  soccer: 'Soccer',
  basketball: 'Basketball',
  volleyball: 'Volleyball',
  softball: 'Softball',
  baseball: 'Baseball',
  lacrosse: 'Lacrosse',
  track: 'Track & field',
  swimming: 'Swimming',
  football: 'Football',
  tennis: 'Tennis',
  golf: 'Golf',
  other: 'Other',
};

export const GENDER_OPTIONS: { id: AthleteGender; label: string }[] = [
  { id: 'girls', label: 'Girls' },
  { id: 'boys', label: 'Boys' },
  { id: 'unspecified', label: 'Prefer not to say' },
];

export const GENDER_LABEL: Record<AthleteGender, string> = {
  girls: 'Girls',
  boys: 'Boys',
  unspecified: 'Prefer not to say',
};

/** Inclusive birthdate window for a high school athlete in this MVP. */
export const BIRTHDATE_MIN = '2004-01-01';
export const BIRTHDATE_MAX = '2014-06-01';

type LeagueDef = { id: LeagueId; label: string; short: string; level: number };

/**
 * Soccer pathways. `level` is the 1–5 playing level used by the fit score.
 * The strongest selected league is the one that counts.
 * Other sports leave this list empty until they have their own pathways.
 */
export const SOCCER_LEAGUES: LeagueDef[] = [
  { id: 'ecnl', label: 'Elite Clubs National League (ECNL)', short: 'ECNL', level: 4.1 },
  { id: 'ecnl-rl', label: 'ECNL Regional League (ECNL-RL)', short: 'ECNL-RL', level: 3.55 },
  { id: 'ga', label: 'Girls Academy (GA)', short: 'GA', level: 3.15 },
  { id: 'nal', label: 'National Academy League (NAL)', short: 'NAL', level: 2.95 },
  { id: 'usys', label: 'US Youth Soccer National League (USYS)', short: 'USYS', level: 2.75 },
  { id: 'nwsl-academy', label: 'NWSL Academy (club academies)', short: 'NWSL Academy', level: 3.7 },
  { id: 'usl-academy', label: 'USL Academy', short: 'USL Academy', level: 3.35 },
  { id: 'other', label: 'Other / High school', short: 'high school', level: 2.25 },
];

type SportPosition = { id: string; label: string };

export type SportSetup = {
  id: Sport;
  label: string;
  /** Empty until that sport has a roster model. Soccer ids match `Position`. */
  positions: SportPosition[];
  leagues: LeagueDef[];
};

const EMPTY: Pick<SportSetup, 'positions' | 'leagues'> = { positions: [], leagues: [] };

export const SPORT_SETUPS: SportSetup[] = [
  {
    id: 'soccer',
    label: SPORT_LABEL.soccer,
    positions: POSITIONS.map((id) => ({ id, label: `${id} · ${POSITION_LABEL[id]}` })),
    leagues: SOCCER_LEAGUES,
  },
  { id: 'basketball', label: SPORT_LABEL.basketball, ...EMPTY },
  { id: 'volleyball', label: SPORT_LABEL.volleyball, ...EMPTY },
  { id: 'softball', label: SPORT_LABEL.softball, ...EMPTY },
  { id: 'baseball', label: SPORT_LABEL.baseball, ...EMPTY },
  { id: 'lacrosse', label: SPORT_LABEL.lacrosse, ...EMPTY },
  { id: 'track', label: SPORT_LABEL.track, ...EMPTY },
  { id: 'swimming', label: SPORT_LABEL.swimming, ...EMPTY },
  { id: 'football', label: SPORT_LABEL.football, ...EMPTY },
  { id: 'tennis', label: SPORT_LABEL.tennis, ...EMPTY },
  { id: 'golf', label: SPORT_LABEL.golf, ...EMPTY },
  { id: 'other', label: SPORT_LABEL.other, ...EMPTY },
];

export function sportSetup(sport: Sport): SportSetup {
  return SPORT_SETUPS.find((item) => item.id === sport) ?? SPORT_SETUPS[0];
}

export function sportHeading(sport: Sport): string {
  if (sport === 'other') return 'Your sport';
  return `Your ${SPORT_LABEL[sport].toLowerCase()}`;
}

export function leagueById(id: LeagueId): LeagueDef | undefined {
  return SOCCER_LEAGUES.find((league) => league.id === id);
}

/** Strongest selected pathway. Multiple leagues are allowed; the top one sets the level. */
export function strongestLeagueLevel(leagues: LeagueId[] | null | undefined): number {
  if (!leagues || leagues.length === 0) return 2.25;
  return Math.max(...leagues.map((id) => leagueById(id)?.level ?? 2.25));
}

export function leagueShortList(leagues: LeagueId[]): string {
  const names = leagues.map((id) => leagueById(id)?.short ?? id);
  if (names.length === 0) return 'club';
  if (leagues.length === 1 && leagues[0] === 'other') return 'high school or another club league';
  return names.join(', ');
}

export function positionsInDisplayOrder(positions: Position[], primary: Position | null): Position[] {
  if (primary && positions.includes(primary)) {
    return [primary, ...positions.filter((position) => position !== primary)];
  }
  return positions;
}

/** Primary first, then secondary positions, as in "Center back / Winger". */
export function positionSlash(positions: Position[], primary: Position | null): string {
  return positionsInDisplayOrder(positions, primary)
    .map((position) => POSITION_LABEL[position])
    .join(' / ');
}

export type SidePrompt = {
  label: string;
  hint: string;
  options: { id: DominantSide; label: string }[];
};

/**
 * Soccer asks for a foot. Other sports return null until they have an
 * equivalent, such as a dominant hand.
 */
export function dominantSidePrompt(sport: Sport): SidePrompt | null {
  if (sport !== 'soccer') return null;
  return {
    label: 'Dominant foot',
    hint: 'Left-footed center backs and wingers are highly sought after.',
    options: [
      { id: 'left', label: 'Left' },
      { id: 'right', label: 'Right' },
      { id: 'both', label: 'Both' },
    ],
  };
}

export function dominantSideDisplay(sport: Sport, side: DominantSide | null): string | null {
  if (!side || sport !== 'soccer') return null;
  if (side === 'left') return 'Left foot';
  if (side === 'right') return 'Right foot';
  return 'Both feet';
}

export function dominantSidePhrase(sport: Sport, side: DominantSide | null): string | null {
  if (sport !== 'soccer' || !side) return null;
  if (side === 'left') return "I'm left-footed";
  if (side === 'right') return "I'm right-footed";
  return 'I play with both feet';
}

export function programLevel(program: Pick<Program, 'division' | 'jucoDivision'>): LevelPref {
  if (program.division === 'NJCAA') {
    const tier: JucoDivision = program.jucoDivision ?? 'D1';
    if (tier === 'D2') return 'NJCAA D2';
    if (tier === 'D3') return 'NJCAA D3';
    return 'NJCAA D1';
  }
  return program.division;
}

/** Open to all, or an empty list from an older profile, keeps every division in the deck. */
export function wantsLevel(
  profile: Pick<PlayerProfile, 'openToAllLevels' | 'levels'>,
  program: Pick<Program, 'division' | 'jucoDivision'>,
): boolean {
  if (profile.openToAllLevels || profile.levels.length === 0) return true;
  return profile.levels.includes(programLevel(program));
}

export function programSidePhrase(program: Pick<Program, 'side' | 'sport'>): string {
  const side = program.side === 'men' ? "men's" : "women's";
  return `${side} ${SPORT_LABEL[program.sport].toLowerCase()}`;
}

export function programMatchesAthlete(
  program: Pick<Program, 'sport' | 'side'>,
  athlete: Pick<PlayerProfile, 'sport' | 'gender'>,
): boolean {
  if (program.sport !== athlete.sport) return false;
  if (athlete.gender === 'unspecified') return true;
  const side: ProgramSide = athlete.gender === 'boys' ? 'men' : 'women';
  return program.side === side;
}

export function placementMatchesAthlete(
  placement: Pick<SponsoredPlacement, 'sport' | 'side'>,
  athlete: Pick<PlayerProfile, 'sport' | 'gender'>,
): boolean {
  return programMatchesAthlete(placement, athlete);
}
