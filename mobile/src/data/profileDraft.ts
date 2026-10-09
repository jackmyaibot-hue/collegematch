import type {
  League,
  PlayerProfile,
  Position,
  Region,
  SchoolSizePreference,
} from './types';

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
  gradYear: number | null;
  positions: Position[];
  clubTeam: string;
  league: League | null;
  gamesPlayed: string;
  goals: string;
  assists: string;
  cleanSheets: string;
  savePercentage: string;
  highlightVideoUrl: string;
  gpa: string;
  sat: string;
  act: string;
  homeState: string;
  preferredRegions: Region[];
  schoolSizePreference: SchoolSizePreference | null;
  intendedMajor: string;
  budgetId: string | null;
  parentEmail: string;
};

export type FieldErrors = Partial<Record<keyof ProfileDraft, string>>;

export function emptyDraft(): ProfileDraft {
  return {
    name: '',
    gradYear: null,
    positions: [],
    clubTeam: '',
    league: null,
    gamesPlayed: '',
    goals: '',
    assists: '',
    cleanSheets: '',
    savePercentage: '',
    highlightVideoUrl: '',
    gpa: '',
    sat: '',
    act: '',
    homeState: '',
    preferredRegions: [],
    schoolSizePreference: null,
    intendedMajor: '',
    budgetId: null,
    parentEmail: '',
  };
}

export function draftFromProfile(profile: PlayerProfile): ProfileDraft {
  return {
    name: profile.name,
    gradYear: profile.gradYear,
    positions: [...profile.positions],
    clubTeam: profile.clubTeam,
    league: profile.league,
    gamesPlayed: String(profile.stats.gamesPlayed),
    goals: String(profile.stats.goals),
    assists: String(profile.stats.assists),
    cleanSheets: profile.stats.cleanSheets == null ? '' : String(profile.stats.cleanSheets),
    savePercentage: profile.stats.savePercentage == null ? '' : String(profile.stats.savePercentage),
    highlightVideoUrl: profile.highlightVideoUrl,
    gpa: String(profile.gpa),
    sat: profile.sat == null ? '' : String(profile.sat),
    act: profile.act == null ? '' : String(profile.act),
    homeState: profile.homeState,
    preferredRegions: [...profile.preferredRegions],
    schoolSizePreference: profile.schoolSizePreference,
    intendedMajor: profile.intendedMajor,
    budgetId: profile.budget.id,
    parentEmail: profile.parentEmail,
  };
}

function parseIntField(value: string): number | null {
  if (value.trim() === '') return null;
  if (!/^\d+$/.test(value.trim())) return null;
  return Number(value.trim());
}

export function validateDraft(draft: ProfileDraft): FieldErrors {
  const errors: FieldErrors = {};
  if (draft.name.trim().length < 2) errors.name = 'Add your name.';
  if (!draft.gradYear) errors.gradYear = 'Pick your grad year.';
  if (draft.positions.length === 0) errors.positions = 'Pick at least one position.';
  if (draft.clubTeam.trim().length < 2) errors.clubTeam = 'Add your club team.';
  if (!draft.league) errors.league = 'Pick a league.';

  const games = parseIntField(draft.gamesPlayed);
  const goals = draft.goals.trim() === '' ? 0 : parseIntField(draft.goals);
  const assists = draft.assists.trim() === '' ? 0 : parseIntField(draft.assists);
  if (games == null) errors.gamesPlayed = 'Add games played. Use 0 if the season has not started.';
  if (goals == null) errors.goals = 'Use a whole number, or leave goals blank.';
  if (assists == null) errors.assists = 'Use a whole number, or leave assists blank.';
  if (games === 0 && ((goals ?? 0) > 0 || (assists ?? 0) > 0)) {
    errors.gamesPlayed = 'Add the games those goals and assists came from.';
  }

  const isGk = draft.positions.includes('GK');
  if (isGk && draft.cleanSheets.trim() !== '' && parseIntField(draft.cleanSheets) == null) {
    errors.cleanSheets = 'Use a whole number, or leave it blank.';
  }
  if (isGk && draft.savePercentage.trim() !== '') {
    const saves = Number(draft.savePercentage);
    if (!Number.isFinite(saves) || saves < 0 || saves > 100) {
      errors.savePercentage = 'Save percentage should be between 0 and 100.';
    }
  }

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
  if (draft.preferredRegions.length === 0) errors.preferredRegions = 'Pick at least one region.';
  if (!draft.schoolSizePreference) errors.schoolSizePreference = 'Pick a campus size.';
  if (draft.intendedMajor.trim().length < 2) errors.intendedMajor = 'Add a major, or write Undeclared.';
  if (!draft.budgetId) errors.budgetId = 'Pick a budget range.';
  if (draft.parentEmail.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(draft.parentEmail.trim())) {
    errors.parentEmail = 'That email does not look right. You can also leave it blank.';
  }
  return errors;
}

export function profileFromDraft(draft: ProfileDraft, existingId?: string): PlayerProfile {
  const errors = validateDraft(draft);
  if (Object.keys(errors).length > 0) {
    throw new Error('Profile draft is incomplete.');
  }
  const budget = BUDGET_OPTIONS.find((option) => option.id === draft.budgetId);
  if (!budget || !draft.gradYear || !draft.league || !draft.schoolSizePreference) {
    throw new Error('Profile draft is incomplete.');
  }
  const isGk = draft.positions.includes('GK');
  return {
    id: existingId ?? `player-${Date.now()}`,
    name: draft.name.trim(),
    gradYear: draft.gradYear,
    positions: [...draft.positions],
    clubTeam: draft.clubTeam.trim(),
    league: draft.league,
    stats: {
      gamesPlayed: Number(draft.gamesPlayed),
      goals: draft.goals.trim() === '' ? 0 : Number(draft.goals),
      assists: draft.assists.trim() === '' ? 0 : Number(draft.assists),
      cleanSheets: isGk && draft.cleanSheets.trim() !== '' ? Number(draft.cleanSheets) : null,
      savePercentage: isGk && draft.savePercentage.trim() !== '' ? Number(draft.savePercentage) : null,
    },
    highlightVideoUrl: draft.highlightVideoUrl.trim(),
    gpa: Math.round(Number(draft.gpa) * 100) / 100,
    sat: draft.sat.trim() === '' ? null : Number(draft.sat),
    act: draft.act.trim() === '' ? null : Number(draft.act),
    homeState: draft.homeState,
    preferredRegions: [...draft.preferredRegions],
    schoolSizePreference: draft.schoolSizePreference,
    intendedMajor: draft.intendedMajor.trim(),
    budget: { id: budget.id, label: budget.label, min: budget.min, max: budget.max },
    parentEmail: draft.parentEmail.trim(),
    updatedAt: new Date().toISOString(),
  };
}
