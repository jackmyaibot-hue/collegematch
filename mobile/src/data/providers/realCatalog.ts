import { schoolSizeFromEnrollment } from '../format';
import catalogFile from '../real/programs.json';
import { regionForState } from '../regions';
import type { Coach, Division, JucoDivision, Position, Program, ProgramSource, RosterCount, TeamRecord } from '../types';
import type { ProgramCatalog } from './types';

/**
 * Crest colors until a school's own colors are read off its athletics site.
 * These are the app's greens, not a claim about the school.
 */
const PLACEHOLDER_COLORS: [string, string] = ['#0C3B2C', '#D8F26A'];

type RawCoach = { name?: string; title?: string; email?: string | null };
type RawRoster = { position?: string; count?: number; graduating?: number };
type RawProgram = {
  id: string;
  schoolName: string;
  division: string;
  jucoDivision?: string | null;
  nationalRank?: number;
  city?: string | null;
  state?: string | null;
  conference?: string | null;
  mascot?: string | null;
  enrollment?: number | null;
  acceptanceRate?: number | null;
  acceptanceLabel?: string | null;
  colors?: [string, string] | null;
  colorNames?: string | null;
  colorSource?: 'brand-guide' | 'athletics-css' | null;
  estimatedNetCost?: number | null;
  sat?: number | null;
  act?: number | null;
  campusLife?: Program['campusLife'];
  record?: TeamRecord | null;
  roster?: RawRoster[];
  coaches?: RawCoach[];
  questionnaireUrl?: string | null;
  admissionsUrl?: string | null;
  costUrl?: string | null;
  athleticsUrl?: string | null;
  instagramHandle?: string | null;
  instagramKind?: 'team' | 'athletics' | 'school' | null;
  instagramConfirmation?: Program['instagramConfirmation'];
  externalIds?: { scorecard?: string };
  sources?: ProgramSource[];
  lastVerified?: string;
};

const POSITIONS = new Set<Position>(['GK', 'CB', 'FB', 'DM', 'CM', 'W', 'ST']);
const DIVISIONS = new Set<Division>(['NCAA D1', 'NCAA D2', 'NCAA D3', 'NAIA', 'NJCAA']);
const JUCO = new Set<JucoDivision>(['D1', 'D2', 'D3']);

function rosterRows(rows: RawRoster[] | undefined): RosterCount[] {
  if (!rows) return [];
  return rows.flatMap((row) => {
    if (!row.position || !POSITIONS.has(row.position as Position)) return [];
    const count = row.count ?? 0;
    const graduating = row.graduating ?? 0;
    if (count < 1 || graduating < 0 || graduating > count) return [];
    return [{ position: row.position as Position, count, graduating }];
  });
}

function coachesFor(programId: string, coaches: RawCoach[] | undefined): Coach[] {
  return (coaches ?? []).flatMap((coach, index) => {
    const name = coach.name?.trim() ?? '';
    const title = coach.title?.trim() ?? '';
    if (!name || !title) return [];
    const email = coach.email?.trim() || null;
    return [{ id: `${programId}-coach-${index + 1}`, name, title, email }];
  });
}

function verifiedColors(raw: RawProgram): { colors: [string, string]; colorsVerified: boolean } {
  const source = raw.colorSource;
  const pair = raw.colors;
  const hex = /^#[0-9A-Fa-f]{6}$/;
  if ((source === 'brand-guide' || source === 'athletics-css') && pair && hex.test(pair[0]) && hex.test(pair[1])) {
    return { colors: [pair[0].toUpperCase(), pair[1].toUpperCase()], colorsVerified: true };
  }
  return { colors: PLACEHOLDER_COLORS, colorsVerified: false };
}

function toProgram(raw: RawProgram): Program | null {
  if (!DIVISIONS.has(raw.division as Division)) return null;
  const city = raw.city?.trim() ?? '';
  const state = raw.state?.trim() ?? '';
  const region = regionForState(state);
  if (!city || !state || !region) return null;
  const division = raw.division as Division;
  const juco = raw.jucoDivision && JUCO.has(raw.jucoDivision as JucoDivision) ? (raw.jucoDivision as JucoDivision) : null;
  const enrollment = raw.enrollment ?? null;
  const palette = verifiedColors(raw);
  return {
    id: raw.id,
    sport: 'soccer',
    side: 'women',
    schoolName: raw.schoolName,
    division,
    jucoDivision: division === 'NJCAA' ? juco : null,
    campusLife: raw.campusLife ?? [],
    conference: raw.conference?.trim() ?? '',
    city,
    state,
    region,
    enrollment,
    acceptanceRate: raw.acceptanceRate ?? null,
    acceptanceLabel: raw.acceptanceLabel ?? null,
    estimatedNetCost: raw.estimatedNetCost ?? null,
    schoolSize: enrollment == null ? null : schoolSizeFromEnrollment(enrollment),
    academics: {
      avgGpa: null,
      avgSat: raw.sat ?? null,
      avgAct: raw.act ?? null,
    },
    majors: [],
    roster: rosterRows(raw.roster),
    coaches: coachesFor(raw.id, raw.coaches),
    questionnaireUrl: raw.questionnaireUrl ?? null,
    admissionsUrl: raw.admissionsUrl ?? null,
    costUrl: raw.costUrl ?? null,
    athleticsUrl: raw.athleticsUrl ?? null,
    mascot: raw.mascot ?? null,
    colors: palette.colors,
    colorSource: palette.colorsVerified ? raw.colorSource : null,
    colorNames: raw.colorNames ?? null,
    colorsVerified: palette.colorsVerified,
    record: raw.record ?? null,
    conferenceFinish: null,
    postseason: null,
    funFact: null,
    headCoachYears: null,
    coachPortrait: null,
    photoSet: null,
    instagramHandle: raw.instagramHandle ?? null,
    instagramKind: raw.instagramKind ?? null,
    instagramConfirmation: raw.instagramConfirmation ?? null,
    rosterOrigin: null,
    idCamps: [],
    sample: false,
    nationalRank: raw.nationalRank,
    lastVerified: raw.lastVerified,
    sources: raw.sources,
    externalIds: raw.externalIds?.scorecard ? { scorecard: raw.externalIds.scorecard } : undefined,
  };
}

export const REAL_PROGRAMS: Program[] = (catalogFile.programs as RawProgram[])
  .map(toProgram)
  .filter((program): program is Program => program != null);

export const realProgramCatalog: ProgramCatalog = {
  sourceId: 'composite',
  async listPrograms() {
    return REAL_PROGRAMS;
  },
  async getProgram(id: string) {
    return REAL_PROGRAMS.find((program) => program.id === id) ?? null;
  },
};
