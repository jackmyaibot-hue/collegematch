import type { PlayerProfile, Program, RecruitingState, SponsoredPlacement } from '../types';

/**
 * Program catalog.
 *
 * `sample` is the bundled fictional JSON.
 * A future composite provider can merge:
 * - Magisterial for division, conference, roster, and sport identity
 * - College Scorecard for enrollment, acceptance, net price, and academics
 * - a licensed coach-contact list for name, title, and email
 *
 * The screen layer should depend on this interface, not on the sample file.
 */
export interface ProgramCatalog {
  readonly sourceId: 'sample' | 'magisterial' | 'scorecard' | 'composite';
  listPrograms(): Promise<Program[]>;
  getProgram(id: string): Promise<Program | null>;
}

export interface SponsorInventory {
  readonly sourceId: 'sample-sponsors' | 'sponsor-api';
  listPlacements(): Promise<SponsoredPlacement[]>;
}

export interface PlayerStore {
  load(): Promise<PlayerProfile | null>;
  save(profile: PlayerProfile): Promise<void>;
  clear(): Promise<void>;
}

export interface RecruitingStore {
  load(): Promise<RecruitingState>;
  save(state: RecruitingState): Promise<void>;
  clear(): Promise<void>;
}
