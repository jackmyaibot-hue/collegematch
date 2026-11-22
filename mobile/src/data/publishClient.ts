import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';
import { formatGpa } from './format';
import type { BioPhoto } from './photo';
import type { PlayerProfile, Program, RecruitingState } from './types';

const SECRET_KEY = 'collegematch.publish.v1';
const PHOTO_KEY = 'collegematch.photo.v1';
const PRODUCTION_ORIGIN = 'https://collegematch.expo.app';

type SecretRow = { secret: string; mockApprovalUrl?: string };
type SecretFile = Record<string, SecretRow>;
type PhotoFile = { playerId: string; photo: BioPhoto };

export type BioState = 'none' | 'pending' | 'approved';

export type BioStatus = {
  state: BioState;
  publicUrl: string | null;
  expiresAt: number | null;
  mockApprovalUrl: string | null;
};

function origin(): string {
  if (Platform.OS === 'web' && typeof window !== 'undefined' && window.location?.origin) return window.location.origin;
  const configured = process.env.EXPO_PUBLIC_WEB_URL?.trim();
  if (configured) return configured.replace(/\/$/, '');
  return PRODUCTION_ORIGIN;
}

function randomSecret(): string {
  const buffer = new Uint8Array(32);
  const cryptoObj = globalThis.crypto;
  if (!cryptoObj?.getRandomValues) throw new Error('This device cannot create a publish secret.');
  cryptoObj.getRandomValues(buffer);
  let binary = '';
  for (const byte of buffer) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
}

async function readSecrets(): Promise<SecretFile> {
  const raw = await AsyncStorage.getItem(SECRET_KEY);
  if (!raw) return {};
  try {
    const parsed = JSON.parse(raw) as SecretFile;
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    return {};
  }
}

async function ensureSecret(playerId: string): Promise<SecretRow> {
  const file = await readSecrets();
  const existing = file[playerId];
  if (existing?.secret) return existing;
  const created = { secret: randomSecret() };
  file[playerId] = created;
  await AsyncStorage.setItem(SECRET_KEY, JSON.stringify(file));
  return created;
}

async function writeMockUrl(playerId: string, mockApprovalUrl: string | null): Promise<void> {
  const file = await readSecrets();
  const row = file[playerId];
  if (!row) return;
  if (mockApprovalUrl) row.mockApprovalUrl = mockApprovalUrl;
  else delete row.mockApprovalUrl;
  await AsyncStorage.setItem(SECRET_KEY, JSON.stringify(file));
}

export async function loadLocalPhoto(playerId: string): Promise<BioPhoto | null> {
  const raw = await AsyncStorage.getItem(PHOTO_KEY);
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as PhotoFile;
    if (parsed.playerId !== playerId || !parsed.photo?.data) return null;
    return parsed.photo;
  } catch {
    return null;
  }
}

export async function saveLocalPhoto(playerId: string, photo: BioPhoto | null): Promise<void> {
  if (!photo) {
    await AsyncStorage.removeItem(PHOTO_KEY);
    return;
  }
  const file: PhotoFile = { playerId, photo };
  await AsyncStorage.setItem(PHOTO_KEY, JSON.stringify(file));
}

export function collegesForBio(programs: Program[], recruiting: RecruitingState) {
  return Object.values(recruiting.saved)
    .sort((left, right) => right.savedAt.localeCompare(left.savedAt))
    .map((saved) => programs.find((program) => program.id === saved.programId))
    .filter((program): program is Program => Boolean(program))
    .slice(0, 24)
    .map((program) => ({
      name: program.schoolName,
      division: program.division === 'NJCAA' && program.jucoDivision ? `NJCAA ${program.jucoDivision}` : program.division,
      city: program.city,
      state: program.state,
    }));
}

function honorLine(profile: PlayerProfile): string {
  const honors = profile.honors;
  const bits = [
    honors.valedictorian ? 'Valedictorian' : null,
    honors.salutatorian ? 'Salutatorian' : null,
    honors.nationalHonorSociety ? 'National Honor Society' : null,
    honors.honorRoll ? "Principal's list" : null,
    honors.asb ? (honors.asbRole ? `ASB, ${honors.asbRole}` : 'ASB') : null,
    honors.teamCaptain ? 'Team captain' : null,
    honors.apCourses ? `${honors.apCourses} AP` : null,
    honors.scholarAthlete || null,
    honors.serviceHours ? `${honors.serviceHours} service hours` : null,
    honors.otherAchievement || null,
  ].filter((item): item is string => Boolean(item));
  return bits.join(', ');
}

function payload(profile: PlayerProfile, recruiting: RecruitingState, programs: Program[], photo: BioPhoto | null, secret: string) {
  return {
    action: 'publish' as const,
    playerId: profile.id,
    secret,
    parentPhone: profile.parentPhone,
    name: profile.name,
    sport: profile.sport,
    positions: profile.positions,
    primaryPosition: profile.primaryPosition,
    gradYear: profile.gradYear,
    club: profile.clubTeam,
    leagues: profile.leagues,
    jerseyNumber: profile.stats.jerseyNumber,
    dominantSide: profile.stats.dominantSide,
    yearsAtLevel: profile.stats.yearsAtLevel,
    height: profile.stats.height,
    gpa: formatGpa(profile.gpa, profile.gpaWeighted),
    homeState: profile.homeState,
    majors: profile.intendedMajors,
    honors: honorLine(profile),
    proudOf: profile.proudOf,
    funFact: profile.funFact,
    highlightUrl: profile.highlightVideoUrl,
    colleges: collegesForBio(programs, recruiting),
    photo,
  };
}

async function post(body: unknown): Promise<{ ok: boolean; error?: string; [key: string]: unknown }> {
  const response = await fetch(`${origin()}/api/bio`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const parsed = (await response.json().catch(() => null)) as { ok?: boolean; error?: string } | null;
  if (!parsed || typeof parsed !== 'object') {
    return { ok: false, error: 'The bio server did not respond.' };
  }
  return parsed as { ok: boolean; error?: string };
}

export async function loadBioStatus(playerId: string): Promise<BioStatus> {
  const file = await readSecrets();
  const row = file[playerId];
  if (!row?.secret) return { state: 'none', publicUrl: null, expiresAt: null, mockApprovalUrl: null };
  const result = await post({ action: 'status', playerId, secret: row.secret });
  if (!result.ok) {
    throw new Error(typeof result.error === 'string' ? result.error : 'The bio status could not be loaded.');
  }
  const state = result.state === 'pending' || result.state === 'approved' ? result.state : 'none';
  const publicPath = typeof result.publicPath === 'string' ? result.publicPath : null;
  if (state === 'approved' && row.mockApprovalUrl) await writeMockUrl(playerId, null);
  return {
    state,
    publicUrl: state === 'approved' && publicPath ? `${origin()}${publicPath}` : null,
    expiresAt: typeof result.expiresAt === 'number' ? result.expiresAt : null,
    mockApprovalUrl: state === 'pending' ? (row.mockApprovalUrl ?? null) : null,
  };
}

export async function publishProfile(
  profile: PlayerProfile,
  recruiting: RecruitingState,
  programs: Program[],
  photo: BioPhoto | null,
): Promise<BioStatus> {
  const row = await ensureSecret(profile.id);
  const result = await post(payload(profile, recruiting, programs, photo, row.secret));
  if (!result.ok) throw new Error(typeof result.error === 'string' ? result.error : 'Publish did not go through.');
  const mockApprovalUrl = typeof result.mockApprovalUrl === 'string' ? result.mockApprovalUrl : null;
  await writeMockUrl(profile.id, mockApprovalUrl);
  return {
    state: 'pending',
    publicUrl: null,
    expiresAt: typeof result.expiresAt === 'number' ? result.expiresAt : null,
    mockApprovalUrl,
  };
}

export async function unpublishProfile(playerId: string): Promise<void> {
  const file = await readSecrets();
  const row = file[playerId];
  if (!row?.secret) return;
  const result = await post({ action: 'unpublish', playerId, secret: row.secret });
  if (!result.ok && result.error !== 'Nothing is published.') {
    throw new Error(typeof result.error === 'string' ? result.error : 'Unpublish did not go through.');
  }
  await writeMockUrl(playerId, null);
}

/** Deletes a server bio when this phone published one, then forgets the local secret. */
export async function removePublishedBio(playerId: string): Promise<void> {
  const file = await readSecrets();
  const row = file[playerId];
  if (!row?.secret) {
    await saveLocalPhoto(playerId, null);
    return;
  }
  let result: { ok: boolean; error?: string };
  try {
    result = await post({ action: 'unpublish', playerId, secret: row.secret });
  } catch {
    throw new Error('The published bio is still on the server. Stay online and try Start over again.');
  }
  const alreadyGone = result.error === 'Nothing is published.';
  if (!result.ok && !alreadyGone) {
    throw new Error('The published bio is still on the server. Stay online and try Start over again.');
  }
  delete file[playerId];
  await AsyncStorage.setItem(SECRET_KEY, JSON.stringify(file));
  await saveLocalPhoto(playerId, null);
}
