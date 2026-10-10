/**
 * CollegeMatch data model.
 *
 * The UI only sees these types. Sample JSON implements them today.
 * A later provider can fill the same shapes from:
 * - Magisterial (division, conference, roster, sport identity)
 * - College Scorecard (enrollment, admission rate, net price, academics)
 * - a licensed coach-contact list (name, title, email)
 *
 * The real catalog joins College Scorecard with athletics pages. Coach emails
 * are included only when the collection script read them on a public staff page.
 */

export const POSITIONS = ['GK', 'CB', 'FB', 'DM', 'CM', 'W', 'ST'] as const;
export type Position = (typeof POSITIONS)[number];

export const DIVISIONS = ['NCAA D1', 'NCAA D2', 'NCAA D3', 'NAIA', 'NJCAA'] as const;
export type Division = (typeof DIVISIONS)[number];

export const JUCO_DIVISIONS = ['D1', 'D2', 'D3'] as const;
export type JucoDivision = (typeof JUCO_DIVISIONS)[number];

/** Levels an athlete can ask for. NJCAA is split so JUCO D1, D2, and D3 can be chosen apart. */
export const LEVEL_PREFS = ['NCAA D1', 'NCAA D2', 'NCAA D3', 'NAIA', 'NJCAA D1', 'NJCAA D2', 'NJCAA D3'] as const;
export type LevelPref = (typeof LEVEL_PREFS)[number];

export const LEVEL_LABEL: Record<LevelPref, string> = {
  'NCAA D1': 'NCAA D1',
  'NCAA D2': 'NCAA D2',
  'NCAA D3': 'NCAA D3',
  NAIA: 'NAIA',
  'NJCAA D1': 'NJCAA / JUCO D1',
  'NJCAA D2': 'NJCAA / JUCO D2',
  'NJCAA D3': 'NJCAA / JUCO D3',
};

export const CAMPUS_LIFE = [
  'game-days',
  'close-knit',
  'city',
  'college-town',
  'beach',
  'mountains',
  'faith',
  'greek',
  'diverse',
  'close-to-home',
  'far-from-home',
  'warm-weather',
  'four-seasons',
  'arts',
  'research',
] as const;
export type CampusLife = (typeof CAMPUS_LIFE)[number];

export const CAMPUS_LIFE_LABEL: Record<CampusLife, string> = {
  'game-days': 'Big-time game days',
  'close-knit': 'Close-knit community',
  city: 'City vibes',
  'college-town': 'College town',
  beach: 'Near the beach',
  mountains: 'Mountains and outdoors',
  faith: 'Strong faith community',
  greek: 'Greek life',
  diverse: 'Diverse campus',
  'close-to-home': 'Close to home',
  'far-from-home': 'Far from home adventure',
  'warm-weather': 'Warm weather',
  'four-seasons': 'Four seasons',
  arts: 'Arts and music scene',
  research: 'Research opportunities',
};

export const SPORTS = [
  'soccer',
  'basketball',
  'volleyball',
  'softball',
  'baseball',
  'lacrosse',
  'track',
  'swimming',
  'football',
  'tennis',
  'golf',
  'other',
] as const;
export type Sport = (typeof SPORTS)[number];

export const ATHLETE_GENDERS = ['girls', 'boys', 'unspecified'] as const;
export type AthleteGender = (typeof ATHLETE_GENDERS)[number];

/** College program side. Girls maps to women, boys maps to men. */
export const PROGRAM_SIDES = ['women', 'men'] as const;
export type ProgramSide = (typeof PROGRAM_SIDES)[number];

/**
 * Soccer pathways. Other sports will add their own ids beside this list.
 * See `sports.ts` for labels and the per-sport grouping.
 */
export const LEAGUE_IDS = [
  'ecnl',
  'ecnl-rl',
  'ga',
  'nal',
  'usys',
  'nwsl-academy',
  'usl-academy',
  'other',
] as const;
export type LeagueId = (typeof LEAGUE_IDS)[number];

export const REGIONS = [
  'Northeast',
  'Mid-Atlantic',
  'Southeast',
  'Midwest',
  'Southwest',
  'West',
] as const;
export type Region = (typeof REGIONS)[number];

export const SCHOOL_SIZES = ['small', 'medium', 'large'] as const;
export type SchoolSize = (typeof SCHOOL_SIZES)[number];
export type SchoolSizePreference = SchoolSize | 'any';

export const OUTREACH_STATUSES = [
  'not_contacted',
  'emailed',
  'replied',
  'follow_up_due',
] as const;
export type OutreachStatus = (typeof OUTREACH_STATUSES)[number];

export const DOMINANT_SIDES = ['left', 'right', 'both'] as const;
export type DominantSide = (typeof DOMINANT_SIDES)[number];

export type PersonContact = {
  name: string;
  email: string;
  phone: string;
};

/** Playing details coaches look for on film and at showcases. No scoring stats. */
export type PlayerStats = {
  /** Years at the current league level. */
  yearsAtLevel: number;
  /**
   * Soccer stores a foot. Other sports leave this empty until they have
   * their own equivalent, such as a dominant hand.
   */
  dominantSide: DominantSide | null;
  jerseyNumber: number | null;
  clubCoach: PersonContact;
  highSchoolCoach: PersonContact;
};

export type HonorsProfile = {
  asb: boolean;
  asbRole: string;
  valedictorian: boolean;
  salutatorian: boolean;
  honorRoll: boolean;
  nationalHonorSociety: boolean;
  /** A count or a short list. */
  apCourses: string;
  /** Honors, IB, or dual-enrollment courses. */
  honorsCourses: string;
  teamCaptain: boolean;
  scholarAthlete: string;
  serviceHours: string;
  otherAchievement: string;
};

export type PlayerProfile = {
  id: string;
  name: string;
  /** YYYY-MM-DD */
  birthdate: string;
  gender: AthleteGender;
  sport: Sport;
  gradYear: number;
  positions: Position[];
  /** One of `positions`. Listed first in emails and used to break roster ties. */
  primaryPosition: Position;
  clubTeam: string;
  /** Every pathway they play in. The strongest one drives the fit level. */
  leagues: LeagueId[];
  stats: PlayerStats;
  highlightVideoUrl: string;
  /** 4.0 scale. */
  gpa: number;
  sat: number | null;
  act: number | null;
  /** USPS abbreviation, including DC. */
  homeState: string;
  preferredRegions: Region[];
  /** False means `levels` is the allow-list for the deck. */
  openToAllLevels: boolean;
  levels: LevelPref[];
  /** Optional vibes. Close to home and far from home are scored from location. */
  campusLife: CampusLife[];
  schoolSizePreference: SchoolSizePreference;
  /** One or more majors. "Undeclared" is allowed. */
  intendedMajors: string[];
  honors: HonorsProfile;
  /** Optional. Anything, on or off the field. */
  proudOf: string;
  /** Optional. A light personal detail for the coach email. */
  funFact: string;
  budget: {
    id: string;
    label: string;
    /** Inclusive annual estimated net-cost range, in dollars. */
    min: number;
    max: number;
  };
  /** Optional. Stored on device. Copied on coach emails when set. */
  parentEmail: string;
  updatedAt: string;
};

export type Coach = {
  id: string;
  name: string;
  title: string;
  /** Published staff-directory address. Sample rows use *.example.com. Empty when the page did not list one. */
  email: string | null;
};

export type ProgramSource = {
  field: string;
  label: string;
  url: string;
};

export type IdCamp = {
  name: string;
  /** YYYY-MM-DD */
  date: string;
  notes: string;
};

export type RosterCount = {
  position: Position;
  count: number;
  graduating: number;
};

export type TeamRecord = {
  wins: number;
  losses: number;
  ties: number;
};

/**
 * Where players on the current roster came from.
 * Counts are fictional and do not have to add up to the roster size.
 */
export type RosterOrigin = {
  byState: Record<string, number>;
  byLeague: Partial<Record<LeagueId, number>>;
};

export type Program = {
  id: string;
  sport: Sport;
  side: ProgramSide;
  schoolName: string;
  division: Division;
  /** NJCAA programs name D1, D2, or D3. Everyone else leaves this empty. */
  jucoDivision: JucoDivision | null;
  /** School traits used for the optional campus-life match. Not a fit-score weight. */
  campusLife: CampusLife[];
  conference: string;
  city: string;
  state: string;
  region: Region;
  enrollment: number | null;
  /** 0–1. Empty when Scorecard does not publish it. */
  acceptanceRate: number | null;
  /** Average net price from College Scorecard, in dollars. Sample rows use a fictional estimate. */
  estimatedNetCost: number | null;
  schoolSize: SchoolSize | null;
  academics: {
    avgGpa: number | null;
    avgSat: number | null;
    avgAct: number | null;
  };
  majors: string[];
  roster: RosterCount[];
  coaches: Coach[];
  questionnaireUrl: string | null;
  admissionsUrl: string | null;
  costUrl: string | null;
  athleticsUrl: string | null;
  /** Nickname. Empty when the athletics page did not state one. */
  mascot: string | null;
  /**
   * Primary, then accent. Real schools use a neutral pair until school colors
   * are read off the athletics site. `colorsVerified` is true only then.
   */
  colors: [string, string];
  colorsVerified?: boolean;
  record: TeamRecord | null;
  conferenceFinish: string | null;
  postseason: string | null;
  /** One short line in the team snapshot. Real rows leave this empty. */
  funFact: string | null;
  headCoachYears: number | null;
  /** Index into the shared illustrated coach portraits. Empty for real coaches. */
  coachPortrait: number | null;
  /** Index into the shared campus photo sets. Empty when the school has no licensed photos. */
  photoSet: number | null;
  /**
   * Instagram handle, without @.
   * Sample rows use a `cm` prefix so the link is not a real account.
   */
  instagramHandle: string | null;
  rosterOrigin: RosterOrigin | null;
  idCamps: IdCamp[];
  /**
   * True for the bundled fictional catalog.
   * Real providers should set this to false.
   */
  sample: boolean;
  /** Final-poll rank for real programs. */
  nationalRank?: number;
  /** ISO date the public sources were fetched. */
  lastVerified?: string;
  sources?: ProgramSource[];
  externalIds?: {
    scorecard?: string;
    magisterial?: string;
  };
};

export type SponsoredPlacement = {
  id: string;
  sport: Sport;
  side: ProgramSide;
  /** Always shown in the UI. Sponsored cards are not college matches. */
  label: 'Sponsored';
  sponsorName: string;
  title: string;
  dateLabel: string;
  location: string;
  blurb: string;
  url: string;
  /** Index in the ranked program deck where this card is inserted. */
  insertAt: number;
  /** True while this slot is a placeholder, not a paid campaign. */
  placeholder: boolean;
};

export type SavedProgram = {
  programId: string;
  savedAt: string;
  status: OutreachStatus;
  /** YYYY-MM-DD, or null when no reminder is set. */
  followUpDate: string | null;
  coachId: string | null;
  subject: string | null;
  body: string | null;
};

export type RecruitingState = {
  saved: Record<string, SavedProgram>;
  passed: Record<string, { at: string }>;
  sponsors: Record<string, { status: 'saved' | 'dismissed'; at: string }>;
};

export const POSITION_LABEL: Record<Position, string> = {
  GK: 'Goalkeeper',
  CB: 'Center back',
  FB: 'Fullback',
  DM: 'Defensive mid',
  CM: 'Center mid',
  W: 'Winger',
  ST: 'Striker',
};

export const POSITION_PLURAL: Record<Position, string> = {
  GK: 'goalkeepers',
  CB: 'center backs',
  FB: 'fullbacks',
  DM: 'defensive mids',
  CM: 'center mids',
  W: 'wingers',
  ST: 'strikers',
};

export const SIZE_LABEL: Record<SchoolSize | 'any', string> = {
  small: 'Small · under 3,000',
  medium: 'Medium · 3,000–10,000',
  large: 'Large · 10,000+',
  any: 'No size preference',
};

export const STATUS_LABEL: Record<OutreachStatus, string> = {
  not_contacted: 'Not contacted',
  emailed: 'Emailed',
  replied: 'Replied',
  follow_up_due: 'Follow-up due',
};
