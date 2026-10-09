import AsyncStorage from '@react-native-async-storage/async-storage';
import { emptyRecruiting } from '../format';
import type { PlayerProfile, RecruitingState } from '../types';
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

export const localPlayerStore: PlayerStore = {
  async load() {
    return readJson<PlayerProfile>(PROFILE_KEY);
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
