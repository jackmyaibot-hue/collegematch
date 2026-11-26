import { formatGpa } from './format';
import { dominantSideDisplay, positionSlash, SPORT_LABEL } from './sports';
import type { PlayerProfile } from './types';

/** The public site. Social images link here, not to a player's bio. */
export const SOCIAL_SITE = 'https://collegematch.expo.app';

export type SocialNameStyle = 'first' | 'initial';

export type SocialCard = {
  name: string;
  sport: string;
  position: string;
  gradYear: number;
  club: string;
  stats: { label: string; value: string }[];
  gpa: string | null;
  site: string;
};

/** First name, or first name plus a last initial. Nothing else from the full name. */
export function socialName(fullName: string, style: SocialNameStyle): string {
  const parts = fullName.trim().split(/\s+/).filter(Boolean);
  const first = parts[0] ?? 'Player';
  if (style === 'first' || parts.length < 2) return first;
  return `${first} ${parts[parts.length - 1][0].toUpperCase()}.`;
}

/**
 * The only fields a social image may show. Email, phone, parent contact, NCAA ID,
 * address, and the school list are not copied onto this object.
 */
export function socialCard(profile: PlayerProfile, options: { nameStyle: SocialNameStyle; includeGpa: boolean }): SocialCard {
  const stats: SocialCard['stats'] = [];
  if (profile.stats.jerseyNumber != null) stats.push({ label: 'Jersey', value: `#${profile.stats.jerseyNumber}` });
  else {
    const foot = dominantSideDisplay(profile.sport, profile.stats.dominantSide);
    if (foot) stats.push({ label: 'Foot', value: foot });
  }
  const years = profile.stats.yearsAtLevel;
  stats.push({ label: 'Years', value: years === 1 ? '1 year' : `${years} years` });
  return {
    name: socialName(profile.name, options.nameStyle),
    sport: SPORT_LABEL[profile.sport],
    position: positionSlash(profile.positions, profile.primaryPosition),
    gradYear: profile.gradYear,
    club: profile.clubTeam.trim(),
    stats: stats.slice(0, 2),
    gpa: options.includeGpa ? formatGpa(profile.gpa, profile.gpaWeighted) : null,
    site: SOCIAL_SITE,
  };
}

/** QR modules for SOCIAL_SITE, error correction M. */
export const SITE_QR = [
  '11111110001010011101101111111',
  '10000010001100000010101000001',
  '10111010100000101010101011101',
  '10111010110100001100001011101',
  '10111010110011110001101011101',
  '10000010110001111010001000001',
  '11111110101010101010101111111',
  '00000000110011010011100000000',
  '10111110011000110101001111100',
  '11111100100010011111011110001',
  '11000011011100000100000010000',
  '11011100011100101000000101010',
  '11100111001100001111000001100',
  '11011101011101110111111110001',
  '00000110000101111100100011100',
  '10011001111101010011001100010',
  '11101010000010110100000001100',
  '10111001011110011011111110101',
  '10000110111000000010000100100',
  '10100001000000101000100100010',
  '10011110101010001100111110111',
  '00000000101111110001100011111',
  '11111110000001111011101011100',
  '10000010101111010011100010000',
  '10111010101000110100111110101',
  '10111010110100011001000001100',
  '10111010101011000010011111110',
  '10000010001011101010101101010',
  '11111110110011000011000010100',
].join('');
