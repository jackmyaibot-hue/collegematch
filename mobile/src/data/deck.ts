import { scoreProgram, type FitResult } from './fitScore';
import { placementMatchesAthlete, programMatchesAthlete, wantsLevel } from './sports';
import type { PlayerProfile, Program, RecruitingState, SponsoredPlacement } from './types';

export type DeckCard =
  | { type: 'program'; program: Program; fit: FitResult }
  | { type: 'sponsored'; placement: SponsoredPlacement };

/**
 * Rank remaining programs by fit, then drop sponsored placeholders into fixed slots.
 *
 * `insertAt` counts program cards from the start of the original deck. Passing or
 * saving a school moves the slot forward, so a card placed after 3 programs
 * actually reaches the top once those 3 are gone.
 */
export function buildDeck(
  programs: Program[],
  profile: PlayerProfile,
  recruiting: RecruitingState,
  sponsors: SponsoredPlacement[],
): DeckCard[] {
  const mine = programs.filter(
    (program) => programMatchesAthlete(program, profile) && wantsLevel(profile, program),
  );
  const seen = mine.filter((program) => recruiting.saved[program.id] || recruiting.passed[program.id]).length;
  const ranked = mine
    .filter((program) => !recruiting.saved[program.id] && !recruiting.passed[program.id])
    .map((program) => ({ program, fit: scoreProgram(profile, program) }))
    .sort((a, b) => b.fit.total - a.fit.total || a.program.schoolName.localeCompare(b.program.schoolName));

  const cards: DeckCard[] = ranked.map((row) => ({ type: 'program', program: row.program, fit: row.fit }));
  const active = sponsors
    .filter((placement) => placementMatchesAthlete(placement, profile) && !recruiting.sponsors[placement.id])
    .map((placement) => ({ placement, at: placement.insertAt - seen }))
    .filter((slot) => slot.at >= 0)
    .sort((a, b) => b.at - a.at);

  for (const slot of active) {
    const index = Math.min(slot.at, cards.length);
    cards.splice(index, 0, { type: 'sponsored', placement: slot.placement });
  }
  return cards;
}
