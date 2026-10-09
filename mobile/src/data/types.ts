/**
 * CollegeMatch data model.
 *
 * The UI only sees these types. Sample JSON implements them today.
 * A later provider can fill the same shapes from:
 * - Magisterial (division, conference, roster, sport identity)
 * - College Scorecard (enrollment, admission rate, net price, academics)
 * - a licensed coach-contact list (name, title, email)
 *
 * Join those later on `externalIds`. Do not scrape coach emails.
 */

export const POSITIONS = ['GK', 'CB', 'FB', 'DM', 'CM', 'W', 'ST'] as const;
export type Position = (typeof POSITIONS)[number];

export const DIVISIONS = ['NCAA D1', 'NCAA D2', 'NCAA D3', 'NAIA', 'NJCAA'] as const;
export type Division = (typeof DIVISIONS)[number];

export const LEAGUES = ['ECNL', 'Girls Academy', 'other'] as const;
export type League = (typeof LEAGUES)[number];

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

export type PlayerStats = {
  gamesPlayed: number;
  goals: number;
  assists: number;
  /** Goalkeepers only. Null for field players. */
  cleanSheets: number | null;
  /** 0–100. Goalkeepers only. */
  savePercentage: number | null;
};

export type PlayerProfile = {
  id: string;
  name: string;
  gradYear: number;
  positions: Position[];
  clubTeam: string;
  league: League;
  stats: PlayerStats;
  highlightVideoUrl: string;
  /** 4.0 scale. */
  gpa: number;
  sat: number | null;
  act: number | null;
  /** USPS abbreviation, including DC. */
  homeState: string;
  preferredRegions: Region[];
  schoolSizePreference: SchoolSizePreference;
  intendedMajor: string;
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
  /** Sample data uses *.example.com only. */
  email: string;
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

export type Program = {
  id: string;
  schoolName: string;
  division: Division;
  conference: string;
  city: string;
  state: string;
  region: Region;
  enrollment: number;
  /** 0–1 */
  acceptanceRate: number;
  /** Estimated annual net cost after typical aid, in dollars. */
  estimatedNetCost: number;
  schoolSize: SchoolSize;
  academics: {
    avgGpa: number;
    avgSat: number;
    avgAct: number;
  };
  majors: string[];
  roster: RosterCount[];
  coaches: Coach[];
  questionnaireUrl: string;
  admissionsUrl: string;
  costUrl: string;
  athleticsUrl: string;
  idCamps: IdCamp[];
  /**
   * True for the bundled fictional catalog.
   * Real providers should set this to false.
   */
  sample: boolean;
  externalIds?: {
    scorecard?: string;
    magisterial?: string;
  };
};

export type SponsoredPlacement = {
  id: string;
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
