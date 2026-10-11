import { BIRTHDATE_MAX, BIRTHDATE_MIN } from './sports';
import type {
  AthleteGender,
  DominantSide,
  LeagueId,
  PlayerProfile,
  Position,
  Region,
  SchoolSizePreference,
  Sport,
} from './types';
import { isIsoDate } from './format';
import type { CampusLife, HonorsProfile, LevelPref } from './types';

export const BUDGET_OPTIONS = [
  { id: 'under-15', label: 'Under $15k', min: 0, max: 15000 },
  { id: '15-30', label: '$15–30k', min: 15000, max: 30000 },
  { id: '30-45', label: '$30–45k', min: 30000, max: 45000 },
  { id: '45-plus', label: '$45k and up', min: 45000, max: 70000 },
  { id: 'unsure', label: 'Not sure yet', min: 0, max: 80000 },
] as const;

export const GRAD_YEARS = [2026, 2027, 2028, 2029, 2030, 2031];

export const MAJOR_SUGGESTIONS = [
  'Biology',
  'Business',
  'Psychology',
  'Nursing',
  'Kinesiology',
  'Communications',
  'Education',
  'Computer Science',
  'Undeclared',
];

export type ProfileDraft = {
  name: string;
  birthdate: string;
  gender: AthleteGender | null;
  sport: Sport | null;
  gradYear: number | null;
  positions: Position[];
  primaryPosition: Position | null;
  clubTeam: string;
  leagues: LeagueId[];
  yearsAtLevel: string;
  dominantSide: DominantSide | null;
  jerseyNumber: string;
  clubCoachName: string;
  clubCoachEmail: string;
  clubCoachPhone: string;
  highSchoolCoachName: string;
  highSchoolCoachEmail: string;
  highSchoolCoachPhone: string;
  highlightVideoUrl: string;
  gpa: string;
  sat: string;
  act: string;
  homeState: string;
  preferredRegions: Region[];
  openToAllLevels: boolean;
  levels: LevelPref[];
  campusLife: CampusLife[];
  schoolSizePreference: SchoolSizePreference | null;
  intendedMajors: string[];
  /** Typed into "add your own" and merged when it is long enough to keep. */
  customMajor: string;
  asb: boolean;
  asbRole: string;
  valedictorian: boolean;
  salutatorian: boolean;
  honorRoll: boolean;
  nationalHonorSociety: boolean;
  apCourses: string;
  honorsCourses: string;
  teamCaptain: boolean;
  scholarAthlete: string;
  serviceHours: string;
  otherAchievement: string;
  proudOf: string;
  funFact: string;
  budgetId: string | null;
  parentEmail: string;
};

export type FieldErrors = Partial<Record<keyof ProfileDraft, string>>;

export function emptyDraft(): ProfileDraft {
  return {
    name: '',
    birthdate: '',
    gender: null,
    sport: null,
    gradYear: null,
    positions: [],
    primaryPosition: null,
    clubTeam: '',
    leagues: [],
    yearsAtLevel: '',
    dominantSide: null,
    jerseyNumber: '',
    clubCoachName: '',
    clubCoachEmail: '',
    clubCoachPhone: '',
    highSchoolCoachName: '',
    highSchoolCoachEmail: '',
    highSchoolCoachPhone: '',
    highlightVideoUrl: '',
    gpa: '',
    sat: '',
    act: '',
    homeState: '',
    preferredRegions: [],
    openToAllLevels: false,
    levels: [],
    campusLife: [],
    schoolSizePreference: null,
    intendedMajors: [],
    customMajor: '',
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
    proudOf: '',
    funFact: '',
    budgetId: null,
    parentEmail: '',
  };
}

export function draftFromProfile(profile: PlayerProfile): ProfileDraft {
  return {
    name: profile.name,
    birthdate: profile.birthdate,
    gender: profile.gender,
    sport: profile.sport,
    gradYear: profile.gradYear,
    positions: [...profile.positions],
    primaryPosition: profile.primaryPosition,
    clubTeam: profile.clubTeam,
    leagues: [...profile.leagues],
    yearsAtLevel: String(profile.stats.yearsAtLevel ?? 0),
    dominantSide: profile.stats.dominantSide ?? null,
    jerseyNumber: profile.stats.jerseyNumber == null ? '' : String(profile.stats.jerseyNumber),
    clubCoachName: profile.stats.clubCoach?.name ?? '',
    clubCoachEmail: profile.stats.clubCoach?.email ?? '',
    clubCoachPhone: profile.stats.clubCoach?.phone ?? '',
    highSchoolCoachName: profile.stats.highSchoolCoach?.name ?? '',
    highSchoolCoachEmail: profile.stats.highSchoolCoach?.email ?? '',
    highSchoolCoachPhone: profile.stats.highSchoolCoach?.phone ?? '',
    highlightVideoUrl: profile.highlightVideoUrl,
    gpa: String(profile.gpa),
    sat: profile.sat == null ? '' : String(profile.sat),
    act: profile.act == null ? '' : String(profile.act),
    homeState: profile.homeState,
    preferredRegions: [...profile.preferredRegions],
    openToAllLevels: profile.openToAllLevels ?? false,
    levels: [...(profile.levels ?? [])],
    campusLife: [...(profile.campusLife ?? [])],
    schoolSizePreference: profile.schoolSizePreference,
    intendedMajors: [...(profile.intendedMajors ?? [])],
    customMajor: '',
    asb: profile.honors?.asb ?? false,
    asbRole: profile.honors?.asbRole ?? '',
    valedictorian: profile.honors?.valedictorian ?? false,
    salutatorian: profile.honors?.salutatorian ?? false,
    honorRoll: profile.honors?.honorRoll ?? false,
    nationalHonorSociety: profile.honors?.nationalHonorSociety ?? false,
    apCourses: profile.honors?.apCourses ?? '',
    honorsCourses: profile.honors?.honorsCourses ?? '',
    teamCaptain: profile.honors?.teamCaptain ?? false,
    scholarAthlete: profile.honors?.scholarAthlete ?? '',
    serviceHours: profile.honors?.serviceHours ?? '',
    otherAchievement: profile.honors?.otherAchievement ?? '',
    proudOf: profile.proudOf ?? '',
    funFact: profile.funFact ?? '',
    budgetId: profile.budget.id,
    parentEmail: profile.parentEmail,
  };
}

export function majorsFromDraft(draft: ProfileDraft): string[] {
  const majors = draft.intendedMajors.map((major) => major.trim()).filter((major) => major.length >= 2);
  const custom = draft.customMajor.trim();
  if (custom.length >= 2 && !majors.some((major) => major.toLowerCase() === custom.toLowerCase())) {
    majors.push(custom);
  }
  return majors;
}

function honorsFromDraft(draft: ProfileDraft): HonorsProfile {
  return {
    asb: draft.asb,
    asbRole: draft.asb ? draft.asbRole.trim() : '',
    valedictorian: draft.valedictorian,
    salutatorian: draft.valedictorian ? false : draft.salutatorian,
    honorRoll: draft.honorRoll,
    nationalHonorSociety: draft.nationalHonorSociety,
    apCourses: draft.apCourses.trim(),
    honorsCourses: draft.honorsCourses.trim(),
    teamCaptain: draft.teamCaptain,
    scholarAthlete: draft.scholarAthlete.trim(),
    serviceHours: draft.serviceHours.trim(),
    otherAchievement: draft.otherAchievement.trim(),
  };
}

function parseIntField(value: string): number | null {
  if (value.trim() === '') return null;
  if (!/^\d+$/.test(value.trim())) return null;
  return Number(value.trim());
}

function validEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
}

function validPhone(value: string): boolean {
  const digits = value.replace(/\D/g, '');
  return digits.length >= 7 && digits.length <= 15;
}

function applyContactErrors(
  errors: FieldErrors,
  prefix: 'clubCoach' | 'highSchoolCoach',
  draft: ProfileDraft,
) {
  const email = draft[`${prefix}Email`];
  const phone = draft[`${prefix}Phone`];
  if (email.trim() && !validEmail(email)) errors[`${prefix}Email`] = 'That email does not look right.';
  if (phone.trim() && !validPhone(phone)) {
    errors[`${prefix}Phone`] = 'Use a phone number with at least 7 digits.';
  }
}

export function validateDraft(draft: ProfileDraft): FieldErrors {
  const errors: FieldErrors = {};
  if (draft.name.trim().length < 2) errors.name = 'Add your name.';
  if (!draft.birthdate || !isIsoDate(draft.birthdate)) errors.birthdate = 'Add your birthday.';
  else if (draft.birthdate < BIRTHDATE_MIN || draft.birthdate > BIRTHDATE_MAX) {
    errors.birthdate = 'Use a birthday that fits a high school athlete.';
  }
  if (!draft.gender) errors.gender = 'Pick Girls, Boys, or Prefer not to say.';
  if (!draft.sport) errors.sport = 'Pick your sport.';
  if (!draft.gradYear) errors.gradYear = 'Pick your grad year.';
  if (draft.positions.length === 0) errors.positions = 'Pick at least one position.';
  if (draft.primaryPosition && !draft.positions.includes(draft.primaryPosition)) {
    errors.primaryPosition = 'Pick a primary from the positions you selected.';
  }
  if (!draft.primaryPosition && draft.positions.length > 0) {
    errors.primaryPosition = 'Mark one position as primary.';
  }
  if (draft.clubTeam.trim().length < 2) errors.clubTeam = 'Add your club team.';
  if (draft.leagues.length === 0) errors.leagues = 'Pick at least one league.';

  const years = parseIntField(draft.yearsAtLevel);
  if (years == null || years > 15) {
    errors.yearsAtLevel = 'Use a whole number from 0 to 15. 0 means this is your first year at this level.';
  }
  if (draft.sport === 'soccer' && !draft.dominantSide) {
    errors.dominantSide = 'Pick Left, Right, or Both.';
  }
  const jersey = parseIntField(draft.jerseyNumber);
  if (jersey == null || jersey > 99) errors.jerseyNumber = 'Use a jersey number from 0 to 99.';
  applyContactErrors(errors, 'clubCoach', draft);
  applyContactErrors(errors, 'highSchoolCoach', draft);

  const highlight = draft.highlightVideoUrl.trim();
  if (highlight && !/^https?:\/\//i.test(highlight)) {
    errors.highlightVideoUrl = 'Start the link with http:// or https://, or leave it blank.';
  }

  const gpa = Number(draft.gpa);
  if (draft.gpa.trim() === '' || !Number.isFinite(gpa) || gpa < 0 || gpa > 4) {
    errors.gpa = 'Enter a GPA from 0.0 to 4.0.';
  }
  if (draft.sat.trim() !== '') {
    const sat = parseIntField(draft.sat);
    if (sat == null || sat < 400 || sat > 1600) errors.sat = 'SAT scores run from 400 to 1600.';
  }
  if (draft.act.trim() !== '') {
    const act = parseIntField(draft.act);
    if (act == null || act < 1 || act > 36) errors.act = 'ACT scores run from 1 to 36.';
  }
  if (!draft.homeState) errors.homeState = 'Pick your home state.';
  if (!draft.openToAllLevels && draft.levels.length === 0) {
    errors.levels = 'Pick at least one level, or Open to all.';
  }
  if (draft.preferredRegions.length === 0) errors.preferredRegions = 'Pick at least one region.';
  if (!draft.schoolSizePreference) errors.schoolSizePreference = 'Pick a campus size.';
  if (majorsFromDraft(draft).length === 0) {
    errors.intendedMajors = 'Pick at least one major, or add your own.';
  }
  if (draft.customMajor.trim().length === 1) {
    errors.customMajor = 'Add a little more, or clear this box.';
  }
  for (const [key, label] of [
    ['apCourses', 'AP courses'],
    ['honorsCourses', 'honors courses'],
    ['scholarAthlete', 'scholar-athlete awards'],
    ['serviceHours', 'community service'],
    ['otherAchievement', 'the other achievement'],
    ['asbRole', 'the role'],
    ['proudOf', 'what you are proud of'],
    ['funFact', 'the fun fact'],
  ] as const) {
    if (draft[key].trim().length > 240) errors[key] = `Keep ${label} to a sentence or two.`;
  }
  if (!draft.budgetId) errors.budgetId = 'Pick a budget range.';
  if (!draft.parentEmail.trim()) {
    errors.parentEmail = 'Add a parent email. It is copied on coach emails and stays on this phone.';
  } else if (!validEmail(draft.parentEmail)) {
    errors.parentEmail = 'That email does not look right.';
  }
  return errors;
}

export function profileFromDraft(draft: ProfileDraft, existingId?: string): PlayerProfile {
  const errors = validateDraft(draft);
  if (Object.keys(errors).length > 0) {
    throw new Error('Profile draft is incomplete.');
  }
  const budget = BUDGET_OPTIONS.find((option) => option.id === draft.budgetId);
  if (
    !budget ||
    !draft.gradYear ||
    !draft.gender ||
    !draft.sport ||
    !draft.primaryPosition ||
    !draft.schoolSizePreference
  ) {
    throw new Error('Profile draft is incomplete.');
  }
  return {
    id: existingId ?? `player-${Date.now()}`,
    name: draft.name.trim(),
    birthdate: draft.birthdate,
    gender: draft.gender,
    sport: draft.sport,
    gradYear: draft.gradYear,
    positions: [...draft.positions],
    primaryPosition: draft.primaryPosition,
    clubTeam: draft.clubTeam.trim(),
    leagues: [...draft.leagues],
    stats: {
      yearsAtLevel: Number(draft.yearsAtLevel),
      dominantSide: draft.sport === 'soccer' ? draft.dominantSide : null,
      jerseyNumber: Number(draft.jerseyNumber),
      clubCoach: {
        name: draft.clubCoachName.trim(),
        email: draft.clubCoachEmail.trim(),
        phone: draft.clubCoachPhone.trim(),
      },
      highSchoolCoach: {
        name: draft.highSchoolCoachName.trim(),
        email: draft.highSchoolCoachEmail.trim(),
        phone: draft.highSchoolCoachPhone.trim(),
      },
    },
    highlightVideoUrl: draft.highlightVideoUrl.trim(),
    gpa: Math.round(Number(draft.gpa) * 100) / 100,
    sat: draft.sat.trim() === '' ? null : Number(draft.sat),
    act: draft.act.trim() === '' ? null : Number(draft.act),
    homeState: draft.homeState,
    preferredRegions: [...draft.preferredRegions],
    openToAllLevels: draft.openToAllLevels,
    levels: draft.openToAllLevels ? [] : [...draft.levels],
    campusLife: [...draft.campusLife],
    schoolSizePreference: draft.schoolSizePreference,
    intendedMajors: majorsFromDraft(draft),
    honors: honorsFromDraft(draft),
    proudOf: draft.proudOf.trim(),
    funFact: draft.funFact.trim(),
    budget: { id: budget.id, label: budget.label, min: budget.min, max: budget.max },
    parentEmail: draft.parentEmail.trim(),
    updatedAt: new Date().toISOString(),
  };
}
