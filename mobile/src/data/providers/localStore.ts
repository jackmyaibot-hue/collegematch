import AsyncStorage from '@react-native-async-storage/async-storage';
import { emptyRecruiting, isIsoDate } from '../format';
import {
  ATHLETE_GENDERS,
  CAMPUS_LIFE,
  LEAGUE_IDS,
  LEVEL_PREFS,
  SPORTS,
  type AthleteGender,
  type DominantSide,
  type LeagueId,
  type CampusLife,
  type HonorsProfile,
  type LevelPref,
  type PersonContact,
  type PlayerProfile,
  type PlayerStats,
  type Position,
  type RecruitingState,
  type Sport,
} from '../types';
import type { PlayerStore, RecruitingStore } from './types';

const PROFILE_KEY = 'collegematch.profile.v1';
const RECRUITING_KEY = 'collegematch.recruiting.v1';

async function readJson<T>(key: string): Promise<T | null> {
  const raw = await AsyncStorage.getItem(key);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

function isSport(value: unknown): value is Sport {
  return typeof value === 'string' && (SPORTS as readonly string[]).includes(value);
}

function isGender(value: unknown): value is AthleteGender {
  return typeof value === 'string' && (ATHLETE_GENDERS as readonly string[]).includes(value);
}

function isLeagueId(value: unknown): value is LeagueId {
  return typeof value === 'string' && (LEAGUE_IDS as readonly string[]).includes(value);
}

function emptyContact(): PersonContact {
  return { name: '', email: '', phone: '' };
}

function readContact(value: unknown): PersonContact {
  if (!value || typeof value !== 'object') return emptyContact();
  const row = value as Partial<PersonContact>;
  return {
    name: typeof row.name === 'string' ? row.name : '',
    email: typeof row.email === 'string' ? row.email : '',
    phone: typeof row.phone === 'string' ? row.phone : '',
  };
}

function readSide(value: unknown): DominantSide | null {
  return value === 'left' || value === 'right' || value === 'both' ? value : null;
}

/** Older profiles stored goals and games. Those fields are ignored. */
function readStats(raw: PlayerProfile): PlayerStats {
  const stats = raw.stats;
  const years = stats && typeof stats.yearsAtLevel === 'number' && Number.isFinite(stats.yearsAtLevel) ? Math.max(0, Math.round(stats.yearsAtLevel)) : 0;
  const jersey = stats && typeof stats.jerseyNumber === 'number' && Number.isFinite(stats.jerseyNumber) ? Math.round(stats.jerseyNumber) : null;
  return {
    yearsAtLevel: years,
    dominantSide: readSide(stats?.dominantSide),
    jerseyNumber: jersey,
    clubCoach: readContact(stats?.clubCoach),
    highSchoolCoach: readContact(stats?.highSchoolCoach),
  };
}

function emptyHonors(): HonorsProfile {
  return {
    asb: false,
    asbRole: '',
    valedictorian: false,
    salutatorian: false,
    honorRoll: false,
    nationalHonorSociety: false,
    apCourses: '',
    honorsCourses: '',
    teamCaptain: false,
    scholarAthlete: '',
    serviceHours: '',
    otherAchievement: '',
  };
}

function readHonors(value: unknown): HonorsProfile {
  const base = emptyHonors();
  if (!value || typeof value !== 'object') return base;
  const row = value as Partial<HonorsProfile>;
  return {
    asb: row.asb === true,
    asbRole: typeof row.asbRole === 'string' ? row.asbRole : '',
    valedictorian: row.valedictorian === true,
    salutatorian: row.valedictorian === true ? false : row.salutatorian === true,
    honorRoll: row.honorRoll === true,
    nationalHonorSociety: row.nationalHonorSociety === true,
    apCourses: typeof row.apCourses === 'string' ? row.apCourses : '',
    honorsCourses: typeof row.honorsCourses === 'string' ? row.honorsCourses : '',
    teamCaptain: row.teamCaptain === true,
    scholarAthlete: typeof row.scholarAthlete === 'string' ? row.scholarAthlete : '',
    serviceHours: typeof row.serviceHours === 'string' ? row.serviceHours : '',
    otherAchievement: typeof row.otherAchievement === 'string' ? row.otherAchievement : '',
  };
}

function readLevels(value: unknown): LevelPref[] {
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is LevelPref => typeof item === 'string' && (LEVEL_PREFS as readonly string[]).includes(item));
}

function readCampusLife(value: unknown): CampusLife[] {
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is CampusLife => typeof item === 'string' && (CAMPUS_LIFE as readonly string[]).includes(item));
}

function readMajors(raw: PlayerProfile & { intendedMajor?: string }): string[] {
  if (Array.isArray(raw.intendedMajors)) {
    const majors = raw.intendedMajors.filter((major): major is string => typeof major === 'string' && major.trim().length >= 2);
    if (majors.length > 0) return majors;
  }
  if (typeof raw.intendedMajor === 'string' && raw.intendedMajor.trim().length >= 2) return [raw.intendedMajor.trim()];
  return [];
}

/** Older profiles stored one league string and no sport, birthday, or gender. */
function normalizeProfile(raw: PlayerProfile & { league?: string; intendedMajor?: string }): PlayerProfile {
  const legacy = raw.league;
  const fromLegacy: LeagueId[] =
    legacy === 'ECNL' ? ['ecnl'] : legacy === 'Girls Academy' ? ['ga'] : legacy === 'other' ? ['other'] : [];
  const leagues = Array.isArray(raw.leagues) ? raw.leagues.filter(isLeagueId) : fromLegacy;
  const positions = Array.isArray(raw.positions) && raw.positions.length > 0 ? raw.positions : (['CB'] as Position[]);
  const primary = positions.includes(raw.primaryPosition) ? raw.primaryPosition : positions[0];
  return {
    ...raw,
    sport: isSport(raw.sport) ? raw.sport : 'soccer',
    gender: isGender(raw.gender) ? raw.gender : 'girls',
    birthdate: isIsoDate(raw.birthdate) ? raw.birthdate : '2010-06-15',
    leagues: leagues.length > 0 ? leagues : ['other'],
    positions,
    primaryPosition: primary,
    stats: readStats(raw),
    intendedMajors: readMajors(raw),
    honors: readHonors(raw.honors),
    proudOf: typeof raw.proudOf === 'string' ? raw.proudOf : '',
    funFact: typeof raw.funFact === 'string' ? raw.funFact : '',
    openToAllLevels: raw.openToAllLevels !== false,
    levels: readLevels(raw.levels),
    campusLife: readCampusLife(raw.campusLife),
  };
}

export const localPlayerStore: PlayerStore = {
  async load() {
    const stored = await readJson<PlayerProfile & { league?: string }>(PROFILE_KEY);
    return stored ? normalizeProfile(stored) : null;
  },
  async save(profile) {
    await AsyncStorage.setItem(PROFILE_KEY, JSON.stringify(profile));
  },
  async clear() {
    await AsyncStorage.removeItem(PROFILE_KEY);
  },
};

export const localRecruitingStore: RecruitingStore = {
  async load() {
    const stored = await readJson<RecruitingState>(RECRUITING_KEY);
    if (!stored || !stored.saved || !stored.passed || !stored.sponsors) return emptyRecruiting();
    return stored;
  },
  async save(state) {
    await AsyncStorage.setItem(RECRUITING_KEY, JSON.stringify(state));
  },
  async clear() {
    await AsyncStorage.removeItem(RECRUITING_KEY);
  },
};
