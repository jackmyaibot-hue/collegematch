/**
 * Active data bindings.
 * Screens import from here, not from a catalog file.
 * Real women's soccer programs are the deck. Set EXPO_PUBLIC_CATALOG=sample
 * to load the fictional schools instead.
 */
import { useSampleCatalog } from './catalogMode';
import { localPlayerStore, localRecruitingStore } from './providers/localStore';
import { realProgramCatalog } from './providers/realCatalog';
import { sampleProgramCatalog, sampleSponsorInventory } from './providers/sampleCatalog';

export const programCatalog = useSampleCatalog ? sampleProgramCatalog : realProgramCatalog;
export const sponsorInventory = sampleSponsorInventory;
export const playerStore = localPlayerStore;
export const recruitingStore = localRecruitingStore;
export type { PlayerStore, ProgramCatalog, RecruitingStore, SponsorInventory } from './providers/types';
