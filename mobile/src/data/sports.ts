import {
  POSITIONS,
  POSITION_LABEL,
  type AthleteGender,
  type DominantSide,
  type JucoDivision,
  type LeagueId,
  LEVEL_LABEL,
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
  'flag-football': 'Flag football',
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
  { id: 'female', label: 'Female' },
  { id: 'male', label: 'Male' },
];

export const GENDER_LABEL: Record<AthleteGender, string> = {
  female: 'Female',
  male: 'Male',
};

/**
 * Older profiles used girls/boys/unspecified. girls and women become Female,
 * boys and men become Male. Prefer not to say stays unset so the app can ask.
 */
export function migrateGender(value: unknown): AthleteGender | null {
  if (typeof value !== 'string') return null;
  const text = value.trim().toLowerCase().replace(/[_-]+/g, ' ');
  if (text === 'female' || text === 'woman' || text === 'women' || text === 'girl' || text === 'girls') return 'female';
  if (text === 'male' || text === 'man' || text === 'men' || text === 'boy' || text === 'boys') return 'male';
  return null;
}

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
  { id: 'other', label: 'Other / High school', short: 'High school', level: 2.25 },
];

/**
 * Flag football pathways. `level` is the same 1–5 scale the fit score uses for
 * soccer. It is a sorting aid, not an official ranking.
 */
export const FLAG_LEAGUES: LeagueDef[] = [
  { id: 'ff-nfl', label: 'NFL FLAG', short: 'NFL FLAG', level: 3.6 },
  { id: 'ff-usa', label: 'USA Football', short: 'USA Football', level: 3.3 },
  { id: 'ff-7v7', label: '7v7 club or travel', short: '7v7', level: 3.1 },
  { id: 'ff-hs', label: 'High School (state-sanctioned)', short: 'High school', level: 2.6 },
  { id: 'ff-other', label: 'Other', short: 'Other', level: 2.25 },
];

const ALL_LEAGUES = [...SOCCER_LEAGUES, ...FLAG_LEAGUES];

type SportPosition = { id: string; label: string };

export type SportSetup = {
  id: Sport;
  label: string;
  /** The name on the signup and profile picker. Add a sport by adding one of these. */
  choiceLabel: string;
  /** True when athletes can pick it. Other sports stay in the model for older profiles. */
  offered: boolean;
  /** Empty until that sport has a roster model. Soccer ids match `Position`. */
  positions: SportPosition[];
  leagues: LeagueDef[];
  yearsLabel: string;
  yearsHint: string;
};

const EMPTY: Pick<SportSetup, 'positions' | 'leagues' | 'yearsLabel' | 'yearsHint'> = {
  positions: [],
  leagues: [],
  yearsLabel: 'Years at this league level',
  yearsHint: "How many years you've played at your current league level. Use 0 if this is year one.",
};

const FLAG_POSITIONS = ['QB', 'C', 'WR', 'RB', 'RUS', 'S', 'CBK', 'LB', 'ATH'] as const;

export const SPORT_SETUPS: SportSetup[] = [
  {
    id: 'soccer',
    label: SPORT_LABEL.soccer,
    choiceLabel: "Women's Soccer",
    offered: true,
    positions: POSITIONS.filter((id) => !FLAG_POSITIONS.includes(id as (typeof FLAG_POSITIONS)[number])).map((id) => ({
      id,
      label: `${id} · ${POSITION_LABEL[id]}`,
    })),
    leagues: SOCCER_LEAGUES,
    yearsLabel: 'Years at this league level',
    yearsHint: "How many years you've played at your current league level. Use 0 if this is year one.",
  },
  {
    id: 'flag-football',
    label: SPORT_LABEL['flag-football'],
    choiceLabel: "Women's Flag Football",
    offered: true,
    positions: FLAG_POSITIONS.map((id) => ({ id, label: POSITION_LABEL[id] })),
    leagues: FLAG_LEAGUES,
    yearsLabel: 'Years playing',
    yearsHint: "How many years you've played flag football. Use 0 if this is your first year.",
  },
  { id: 'basketball', label: SPORT_LABEL.basketball, choiceLabel: SPORT_LABEL.basketball, offered: false, ...EMPTY },
  { id: 'volleyball', label: SPORT_LABEL.volleyball, choiceLabel: SPORT_LABEL.volleyball, offered: false, ...EMPTY },
  { id: 'softball', label: SPORT_LABEL.softball, choiceLabel: SPORT_LABEL.softball, offered: false, ...EMPTY },
  { id: 'baseball', label: SPORT_LABEL.baseball, choiceLabel: SPORT_LABEL.baseball, offered: false, ...EMPTY },
  { id: 'lacrosse', label: SPORT_LABEL.lacrosse, choiceLabel: SPORT_LABEL.lacrosse, offered: false, ...EMPTY },
  { id: 'track', label: SPORT_LABEL.track, choiceLabel: SPORT_LABEL.track, offered: false, ...EMPTY },
  { id: 'swimming', label: SPORT_LABEL.swimming, choiceLabel: SPORT_LABEL.swimming, offered: false, ...EMPTY },
  { id: 'football', label: SPORT_LABEL.football, choiceLabel: SPORT_LABEL.football, offered: false, ...EMPTY },
  { id: 'tennis', label: SPORT_LABEL.tennis, choiceLabel: SPORT_LABEL.tennis, offered: false, ...EMPTY },
  { id: 'golf', label: SPORT_LABEL.golf, choiceLabel: SPORT_LABEL.golf, offered: false, ...EMPTY },
  { id: 'other', label: SPORT_LABEL.other, choiceLabel: SPORT_LABEL.other, offered: false, ...EMPTY },
];

/** Sports on the signup and profile picker. Pass `current` so an older profile still shows its sport. */
export function offeredSports(current?: Sport | null): SportSetup[] {
  return SPORT_SETUPS.filter((item) => item.offered || item.id === current);
}

export function sportChoiceLabel(sport: Sport): string {
  return sportSetup(sport).choiceLabel;
}

export function sportSetup(sport: Sport): SportSetup {
  return SPORT_SETUPS.find((item) => item.id === sport) ?? SPORT_SETUPS[0];
}

export function sportHeading(sport: Sport): string {
  if (sport === 'other') return 'Your sport';
  return `Your ${SPORT_LABEL[sport].toLowerCase()}`;
}

export function leagueById(id: LeagueId): LeagueDef | undefined {
  return ALL_LEAGUES.find((league) => league.id === id);
}

/** Strongest selected pathway. Multiple leagues are allowed; the top one sets the level. */
export function strongestLeagueLevel(leagues: LeagueId[] | null | undefined): number {
  if (!leagues || leagues.length === 0) return 2.25;
  return Math.max(...leagues.map((id) => leagueById(id)?.level ?? 2.25));
}

export function leagueShortList(leagues: LeagueId[], otherLeague = ''): string {
  const note = otherLeague.trim();
  if (leagues.length === 1 && leagues[0] === 'other') return 'high school or another club league';
  if (leagues.length === 1 && leagues[0] === 'ff-other') return note || 'another flag league';
  const names = leagues.map((id) => {
    if (id === 'ff-other' && note) return note;
    return leagueById(id)?.short ?? id;
  });
  if (names.length === 0) return 'club';
  return names.join(', ');
}

/** Full league names for review and profile, such as "Elite Clubs National League (ECNL)". */
export function leagueNameList(leagues: LeagueId[], otherLeague = ''): string {
  if (!leagues || leagues.length === 0) return '';
  const note = otherLeague.trim();
  return leagues
    .map((id) => {
      const label = leagueById(id)?.label ?? id;
      if (id === 'ff-other' && note) return `${label} (${note})`;
      return label;
    })
    .join(', ');
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
  if (sport === 'soccer') {
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
  if (sport === 'flag-football') {
    return {
      label: 'Throwing hand',
      hint: 'Coaches look for this on film, next to your 40 and your shuttle.',
      options: [
        { id: 'left', label: 'Left' },
        { id: 'right', label: 'Right' },
      ],
    };
  }
  return null;
}

export function dominantSideDisplay(sport: Sport, side: DominantSide | null): string | null {
  if (!side) return null;
  if (sport === 'soccer') {
    if (side === 'left') return 'Left foot';
    if (side === 'right') return 'Right foot';
    return 'Both feet';
  }
  if (sport === 'flag-football') {
    if (side === 'left') return 'Left hand';
    if (side === 'right') return 'Right hand';
    return 'Both hands';
  }
  return null;
}

export function dominantSidePhrase(sport: Sport, side: DominantSide | null): string | null {
  if (!side) return null;
  if (sport === 'soccer') {
    if (side === 'left') return "I'm left-footed";
    if (side === 'right') return "I'm right-footed";
    return 'I play with both feet';
  }
  if (sport === 'flag-football') {
    if (side === 'left') return 'I throw with my left hand';
    if (side === 'right') return 'I throw with my right hand';
    return 'I can throw with either hand';
  }
  return null;
}

export function sideStatLabel(sport: Sport): string {
  if (sport === 'flag-football') return 'Throwing hand';
  if (sport === 'soccer') return 'Foot';
  return 'Dominant side';
}

export function yearsStatLabel(sport: Sport): string {
  return sport === 'flag-football' ? 'Years playing' : 'Years at level';
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

/**
 * Open to all, or an empty list from an older profile, keeps every division in the deck.
 * An NJCAA program with no published tier stays in the deck for any NJCAA choice.
 */
export function wantsLevel(
  profile: Pick<PlayerProfile, 'openToAllLevels' | 'levels'>,
  program: Pick<Program, 'division' | 'jucoDivision'>,
): boolean {
  if (profile.openToAllLevels || profile.levels.length === 0) return true;
  if (program.division === 'NJCAA' && program.jucoDivision == null) {
    return profile.levels.some((level) => level.startsWith('NJCAA'));
  }
  return profile.levels.includes(programLevel(program));
}

export function programLevelName(program: Pick<Program, 'division' | 'jucoDivision'>): string {
  if (program.division === 'NJCAA' && program.jucoDivision == null) return 'NJCAA';
  return LEVEL_LABEL[programLevel(program)];
}

export function programSidePhrase(program: Pick<Program, 'side' | 'sport'>): string {
  const side = program.side === 'men' ? "men's" : "women's";
  return `${side} ${SPORT_LABEL[program.sport].toLowerCase()}`;
}

export function programMatchesAthlete(
  program: Pick<Program, 'sport' | 'side'>,
  athlete: Pick<PlayerProfile, 'sport' | 'gender'>,
): boolean {
  if (program.sport !== athlete.sport || athlete.gender == null) return false;
  const side: ProgramSide = athlete.gender === 'male' ? 'men' : 'women';
  return program.side === side;
}

export function placementMatchesAthlete(
  placement: Pick<SponsoredPlacement, 'sport' | 'side'>,
  athlete: Pick<PlayerProfile, 'sport' | 'gender'>,
): boolean {
  return programMatchesAthlete(placement, athlete);
}
