/**
 * Active data bindings.
 * Swap these exports when a real catalog, sponsor feed, or account backend exists.
 * Screens import from here, not from the sample JSON.
 */
export { sampleProgramCatalog as programCatalog, sampleSponsorInventory as sponsorInventory } from './providers/sampleCatalog';
export { localPlayerStore as playerStore, localRecruitingStore as recruitingStore } from './providers/localStore';
export type { PlayerStore, ProgramCatalog, RecruitingStore, SponsorInventory } from './providers/types';
