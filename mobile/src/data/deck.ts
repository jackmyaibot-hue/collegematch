import { scoreProgram, type FitResult } from './fitScore';
import type { PlayerProfile, Program, RecruitingState, SponsoredPlacement } from './types';

export type DeckCard =
  | { type: 'program'; program: Program; fit: FitResult }
  | { type: 'sponsored'; placement: SponsoredPlacement };

/** Rank remaining programs by fit, then drop sponsored placeholders into fixed slots. */
export function buildDeck(
  programs: Program[],
  profile: PlayerProfile,
  recruiting: RecruitingState,
  sponsors: SponsoredPlacement[],
): DeckCard[] {
  const ranked = programs
    .filter((program) => !recruiting.saved[program.id] && !recruiting.passed[program.id])
    .map((program) => ({ program, fit: scoreProgram(profile, program) }))
    .sort((a, b) => b.fit.total - a.fit.total || a.program.schoolName.localeCompare(b.program.schoolName));

  const cards: DeckCard[] = ranked.map((row) => ({ type: 'program', program: row.program, fit: row.fit }));
  const active = sponsors
    .filter((placement) => !recruiting.sponsors[placement.id])
    .sort((a, b) => b.insertAt - a.insertAt);

  for (const placement of active) {
    const index = Math.min(placement.insertAt, cards.length);
    cards.splice(index, 0, { type: 'sponsored', placement });
  }
  return cards;
}
