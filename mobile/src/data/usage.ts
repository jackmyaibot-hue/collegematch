import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';
import type { LevelPref, Sport } from './types';

const STORAGE_KEY = 'collegematch.usage.v1';
const PRODUCTION_URL = 'https://collegematch.expo.app/api/usage';

type UsageName = 'open' | 'profile' | 'swipe' | 'save' | 'email';

type StoredUsage = { id: string; profileCounted: boolean };

function randomId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') return crypto.randomUUID();
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (character) => {
    const rand = Math.floor(Math.random() * 16);
    const value = character === 'x' ? rand : (rand & 0x3) | 0x8;
    return value.toString(16);
  });
}

async function storedUsage(): Promise<StoredUsage> {
  const raw = await AsyncStorage.getItem(STORAGE_KEY);
  if (raw) {
    try {
      const parsed = JSON.parse(raw) as Partial<StoredUsage>;
      if (typeof parsed.id === 'string' && parsed.id.length > 0) {
        return { id: parsed.id, profileCounted: parsed.profileCounted === true };
      }
    } catch {
      // A broken local value is replaced below.
    }
  }
  const next = { id: randomId(), profileCounted: false };
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  return next;
}

function endpoint(): string {
  if (Platform.OS === 'web') return '/api/usage';
  const configured = process.env.EXPO_PUBLIC_USAGE_URL?.trim();
  if (!configured) return PRODUCTION_URL;
  return `${configured.replace(/\/$/, '')}/api/usage`;
}

/** Fire-and-forget. The server stores counts, not this payload's unused fields. */
export function trackUsage(name: UsageName, extra?: { sport?: Sport; levels?: (LevelPref | 'open')[] }): void {
  void (async () => {
    const usage = await storedUsage();
    await fetch(endpoint(), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: usage.id, name, sport: extra?.sport, levels: extra?.levels }),
    });
  })().catch(() => undefined);
}

/** Counts the first completed profile on this install. Later edits do not count again. */
export function trackProfileCompleted(sport: Sport, levels: (LevelPref | 'open')[]): void {
  void (async () => {
    const usage = await storedUsage();
    if (usage.profileCounted) return;
    usage.profileCounted = true;
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(usage));
    trackUsage('profile', { sport, levels });
  })().catch(() => undefined);
}

export async function resetUsageProfileCount(): Promise<void> {
  const usage = await storedUsage();
  usage.profileCounted = false;
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(usage));
}
