import { ADJACENT_REGIONS, regionForState } from './regions';
import { formatMoney, joinLabels } from './format';
import { leagueShortList, positionsInDisplayOrder, programLevel, strongestLeagueLevel } from './sports';
import {
  CAMPUS_LIFE_LABEL,
  LEVEL_LABEL,
  POSITION_PLURAL,
  type CampusLife,
  type PlayerProfile,
  type Position,
  type Program,
  type RosterCount,
  type SchoolSize,
} from './types';

export type FitFactorKey = 'academics' | 'level' | 'region' | 'size' | 'cost' | 'roster';

/**
 * Fit score, 0–100.
 *
 * It is a weighted average of six scores. Each one is computed with the
 * rules in this file so a player can see why a school ranked where it did.
 * It is not a scholarship prediction and not an admissions decision.
 *
 * Weights sum to 1:
 * academics 0.22, level 0.20, region 0.18, roster 0.16, cost 0.14, size 0.10.
 */
export const FIT_FACTORS: {
  key: FitFactorKey;
  label: string;
  weight: number;
  blurb: string;
}[] = [
  {
    key: 'academics',
    label: 'Academics',
    weight: 0.22,
    blurb: 'Your GPA and test scores against their typical admits.',
  },
  {
    key: 'level',
    label: 'Level',
    weight: 0.2,
    blurb: 'Your league against this division. Levels you skip stay out of the deck.',
  },
  {
    key: 'region',
    label: 'Region',
    weight: 0.18,
    blurb: 'Whether the campus is in a region you picked, or your home state.',
  },
  {
    key: 'roster',
    label: 'Roster need',
    weight: 0.16,
    blurb: 'How many players at your position are graduating.',
  },
  {
    key: 'cost',
    label: 'Cost',
    weight: 0.14,
    blurb: 'Estimated net cost against the budget you set.',
  },
  {
    key: 'size',
    label: 'Size',
    weight: 0.1,
    blurb: 'Enrollment against the campus size you want.',
  },
];

const WEIGHT = Object.fromEntries(FIT_FACTORS.map((factor) => [factor.key, factor.weight])) as Record<
  FitFactorKey,
  number
>;

const DIVISION_LEVEL: Record<Program['division'], number> = {
  'NCAA D1': 4.7,
  'NCAA D2': 3.6,
  'NCAA D3': 2.9,
  NAIA: 2.7,
  NJCAA: 1.7,
};

const SIZE_ORDER: SchoolSize[] = ['small', 'medium', 'large'];

export type FitFactor = {
  key: FitFactorKey;
  label: string;
  score: number;
  weight: number;
  detail: string;
};

export type FitResult = {
  total: number;
  factors: FitFactor[];
  /** Highest-scoring factor, written as one sentence for the card. */
  why: string;
  rosterPosition: Position;
  rosterSpot: RosterCount;
};

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function roundScore(value: number): number {
  return clamp(Math.round(value), 0, 100);
}

/** Rough 1–5 playing level from the strongest league they selected. */
export function playerLevel(profile: PlayerProfile): number {
  return clamp(strongestLeagueLevel(profile.leagues), 1.2, 5.2);
}

function academicsScore(profile: PlayerProfile, program: Program): number {
  const parts = [clamp(88 + (profile.gpa - program.academics.avgGpa) * 40, 5, 100)];
  if (profile.sat != null) {
    parts.push(clamp(88 + (profile.sat - program.academics.avgSat) / 8, 5, 100));
  }
  if (profile.act != null) {
    parts.push(clamp(88 + (profile.act - program.academics.avgAct) * 6, 5, 100));
  }
  const average = parts.reduce((sum, part) => sum + part, 0) / parts.length;
  return roundScore(average);
}

function levelScore(profile: PlayerProfile, program: Program): { score: number; playerHigher: boolean; chosen: boolean } {
  const diff = playerLevel(profile) - DIVISION_LEVEL[program.division];
  // Peak when the player is only a touch above the program and can contribute.
  const distance = Math.abs(diff - 0.25);
  let score = roundScore(100 - distance * 38);
  const chosen = !profile.openToAllLevels && profile.levels.includes(programLevel(program));
  // A level they asked for should not look like a poor fit. Closer matches still rank higher.
  if (chosen) score = Math.max(score, 74);
  return { score, playerHigher: diff > 0.9, chosen };
}

export function matchingCampusLife(profile: PlayerProfile, program: Program): CampusLife[] {
  const homeRegion = regionForState(profile.homeState);
  return profile.campusLife.filter((item) => {
    if (item === 'close-to-home') {
      return program.state === profile.homeState || (homeRegion != null && program.region === homeRegion);
    }
    if (item === 'far-from-home') {
      if (!homeRegion || program.state === profile.homeState || program.region === homeRegion) return false;
      return !ADJACENT_REGIONS[homeRegion].includes(program.region);
    }
    return program.campusLife.includes(item);
  });
}

function campusLifeNote(profile: PlayerProfile, program: Program): string | null {
  const hits = matchingCampusLife(profile, program);
  if (hits.length === 0) return null;
  const names = hits.slice(0, 2).map((item) => {
    const label = CAMPUS_LIFE_LABEL[item];
    return label.charAt(0).toLowerCase() + label.slice(1);
  });
  return `You'd also get ${joinLabels(names)}.`;
}

function regionScore(profile: PlayerProfile, program: Program): number {
  if (profile.preferredRegions.includes(program.region) || program.state === profile.homeState) {
    return 100;
  }
  const adjacent = profile.preferredRegions.some((region) =>
    ADJACENT_REGIONS[region].includes(program.region),
  );
  return adjacent ? 58 : 22;
}

function sizeScore(profile: PlayerProfile, program: Program): number {
  if (profile.schoolSizePreference === 'any') return 82;
  if (profile.schoolSizePreference === program.schoolSize) return 100;
  const wanted = SIZE_ORDER.indexOf(profile.schoolSizePreference);
  const actual = SIZE_ORDER.indexOf(program.schoolSize);
  return Math.abs(wanted - actual) === 1 ? 55 : 25;
}

function costScore(profile: PlayerProfile, program: Program): number {
  const { min, max } = profile.budget;
  const cost = program.estimatedNetCost;
  const wide = max - min >= 50000;
  if (cost <= max && cost >= min) {
    if (wide) return 78;
    const span = Math.max(1, max - min);
    const position = (cost - min) / span;
    return roundScore(100 - position * 25);
  }
  if (cost < min) return 90;
  const over = (cost - max) / Math.max(1, max);
  return roundScore(100 - over * 140);
}

function rosterMatch(profile: PlayerProfile, program: Program): { score: number; position: Position; spot: RosterCount } {
  let best: { score: number; position: Position; spot: RosterCount } | null = null;
  for (const position of positionsInDisplayOrder(profile.positions, profile.primaryPosition)) {
    const spot = program.roster.find((row) => row.position === position);
    if (!spot) continue;
    const ratio = spot.graduating / Math.max(1, spot.count);
    let score = 30 + ratio * 90;
    if (spot.graduating >= 2) score += 10;
    if (spot.count <= 3 && spot.graduating >= 1) score += 8;
    const rounded = roundScore(score);
    if (!best || rounded > best.score) best = { score: rounded, position, spot };
  }
  if (!best) {
    const spot = program.roster[0];
    return { score: 0, position: spot.position, spot };
  }
  return best;
}

function leagueName(profile: PlayerProfile): string {
  return leagueShortList(profile.leagues);
}

function factorDetail(
  key: FitFactorKey,
  score: number,
  profile: PlayerProfile,
  program: Program,
  roster: { position: Position; spot: RosterCount },
  playerHigher: boolean,
  chosenLevel: boolean,
): string {
  const inRegion = profile.preferredRegions.includes(program.region);
  const home = program.state === profile.homeState;
  switch (key) {
    case 'roster':
      if (roster.spot.graduating === 0) {
        return `No ${POSITION_PLURAL[roster.position]} are listed as graduating, so roster need is low.`;
      }
      return `${roster.spot.graduating} of ${roster.spot.count} ${POSITION_PLURAL[roster.position]} are graduating — there's room at your spot.`;
    case 'region':
      if (inRegion) {
        return `${program.city}, ${program.state} is in the ${program.region}, one of your regions.`;
      }
      if (home) return `${program.city} is in your home state.`;
      return `${program.city}, ${program.state} is outside the regions you picked.`;
    case 'cost':
      if (profile.budget.max - profile.budget.min >= 50000) {
        return `Estimated net cost is ${formatMoney(program.estimatedNetCost)}. Your budget is still flexible.`;
      }
      if (program.estimatedNetCost <= profile.budget.max) {
        return `Estimated net cost of ${formatMoney(program.estimatedNetCost)} fits your budget.`;
      }
      return `Estimated net cost is ${formatMoney(program.estimatedNetCost)}, above the budget you set.`;
    case 'academics':
      if (score >= 75) {
        return `Your GPA is in range of their typical admits (about ${program.academics.avgGpa.toFixed(1)}).`;
      }
      return `Academics are a stretch versus their typical GPA of ${program.academics.avgGpa.toFixed(1)}.`;
    case 'level': {
      const name = LEVEL_LABEL[programLevel(program)];
      if (chosenLevel && score >= 75) {
        return `${name} is a level you want, and it lines up with ${leagueName(profile)}.`;
      }
      if (chosenLevel && playerHigher) {
        return `${name} is a level you want. You may be a step above it from ${leagueName(profile)}.`;
      }
      if (chosenLevel) return `${name} is a level you want. It looks like a reach from ${leagueName(profile)}.`;
      if (score >= 75) return `${name} lines up with ${leagueName(profile)}.`;
      if (playerHigher) return `You may be a step above ${name} based on your league.`;
      return `${name} looks like a reach from ${leagueName(profile)}.`;
    }
    case 'size':
      if (score >= 80) {
        return `${program.enrollment.toLocaleString('en-US')} students matches the campus size you want.`;
      }
      return `This campus is ${program.schoolSize}, which is off from your size preference.`;
    default:
      return '';
  }
}

export function scoreProgram(profile: PlayerProfile, program: Program): FitResult {
  const academics = academicsScore(profile, program);
  const level = levelScore(profile, program);
  const region = regionScore(profile, program);
  const size = sizeScore(profile, program);
  const cost = costScore(profile, program);
  const roster = rosterMatch(profile, program);
  const scores: Record<FitFactorKey, number> = {
    academics,
    level: level.score,
    region,
    size,
    cost,
    roster: roster.score,
  };

  const factors: FitFactor[] = FIT_FACTORS.map((factor) => ({
    key: factor.key,
    label: factor.label,
    score: scores[factor.key],
    weight: factor.weight,
    detail: factorDetail(factor.key, scores[factor.key], profile, program, roster, level.playerHigher, level.chosen),
  }));

  const ranked = [...factors].sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    return FIT_FACTORS.findIndex((factor) => factor.key === a.key) -
      FIT_FACTORS.findIndex((factor) => factor.key === b.key);
  });

  const life = matchingCampusLife(profile, program);
  const lifeBump = life.length === 0 ? 0 : Math.min(4, 2 + life.length);
  const total = roundScore(
    factors.reduce((sum, factor) => sum + factor.score * WEIGHT[factor.key], 0) + lifeBump,
  );

  const lead = ranked[0];
  const baseWhy = lead.score < 55 ? `Mixed fit. ${lead.detail}` : lead.detail;
  const note = campusLifeNote(profile, program);
  const why = note ? `${baseWhy} ${note}` : baseWhy;

  return {
    total,
    factors,
    why,
    rosterPosition: roster.position,
    rosterSpot: roster.spot,
  };
}

export function costCaption(profile: PlayerProfile, program: Program): string {
  if (profile.budget.max - profile.budget.min >= 50000) return 'Flexible budget';
  if (program.estimatedNetCost <= profile.budget.max) return 'In budget';
  return 'Over budget';
}

export function offersMajor(program: Program, intendedMajor: string): boolean {
  const needle = intendedMajor.trim().toLowerCase();
  if (needle.length < 3) return false;
  return program.majors.some((major) => {
    const hay = major.toLowerCase();
    return hay.includes(needle) || needle.includes(hay);
  });
}
