import { SAMPLE_PROGRAMS } from '../samplePrograms';
import { SAMPLE_SPONSORS } from '../sponsored';
import type { ProgramCatalog, SponsorInventory } from './types';

export const sampleProgramCatalog: ProgramCatalog = {
  sourceId: 'sample',
  async listPrograms() {
    return SAMPLE_PROGRAMS;
  },
  async getProgram(id: string) {
    return SAMPLE_PROGRAMS.find((program) => program.id === id) ?? null;
  },
};

export const sampleSponsorInventory: SponsorInventory = {
  sourceId: 'sample-sponsors',
  async listPlacements() {
    return SAMPLE_SPONSORS;
  },
};
