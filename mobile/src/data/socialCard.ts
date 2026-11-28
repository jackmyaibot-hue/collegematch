import { formatGpa } from './format';
import { dominantSideDisplay, leagueById, positionSlash, SPORT_LABEL } from './sports';
import type { LeagueId, PlayerProfile } from './types';

/** The public site. Social images link here, not to a player's bio. */
export const SOCIAL_SITE = 'https://collegematch.expo.app';

export type SocialNameStyle = 'first' | 'initial';

export const SOCIAL_STAMPS = [
  { id: 'uncommitted', label: 'Uncommitted', lines: ['UNCOMMITTED'] },
  { id: 'id-camp', label: 'ID Camp Ready', lines: ['ID CAMP', 'READY'] },
  { id: 'offers', label: 'Open to Offers', lines: ['OPEN TO', 'OFFERS'] },
  { id: 'committed', label: 'Committed', lines: ['COMMITTED'] },
  { id: 'signed', label: 'Signed', lines: ['SIGNED'] },
] as const;

export type SocialStampId = (typeof SOCIAL_STAMPS)[number]['id'];

export type SocialStatIcon = 'jersey' | 'years' | 'height' | 'gpa' | 'foot';

export type SocialCard = {
  name: string;
  sport: string;
  position: string;
  gradYear: number;
  club: string;
  jerseyNumber: number | null;
  league: { id: LeagueId; badge: string } | null;
  stats: { label: string; value: string; icon: SocialStatIcon }[];
  gpa: string | null;
  stamp: SocialStampId | null;
  schoolName: string | null;
  schoolColors: [string, string] | null;
  site: string;
};

const LEAGUE_BADGE: Record<LeagueId, string> = {
  ecnl: 'ECNL',
  'ecnl-rl': 'ECNL RL',
  ga: 'GA',
  nal: 'NAL',
  usys: 'USYS',
  'nwsl-academy': 'NWSL',
  'usl-academy': 'USL',
  other: 'HIGH SCHOOL',
};

/** Short badge for a saved league id. */
export function leagueBadge(id: LeagueId): string {
  return LEAGUE_BADGE[id] ?? leagueById(id)?.short ?? id;
}

/** The strongest saved league, which is the one the card features. */
export function featuredLeague(leagues: LeagueId[]): LeagueId | null {
  if (leagues.length === 0) return null;
  return leagues.reduce((best, id) => ((leagueById(id)?.level ?? 0) > (leagueById(best)?.level ?? 0) ? id : best));
}

/** School name the player typed, plus verified program colors when the catalog has them. */
export function matchSchool(
  name: string,
  programs: { schoolName: string; colors: [string, string]; colorsVerified?: boolean }[],
): { name: string; colors: [string, string] | null } {
  const trimmed = name.trim().replace(/\s+/g, ' ');
  if (!trimmed) return { name: '', colors: null };
  const exact = programs.find((program) => program.schoolName.toLowerCase() === trimmed.toLowerCase());
  const hit =
    exact ??
    programs.find((program) => program.schoolName.toLowerCase().startsWith(trimmed.toLowerCase()) && trimmed.length >= 4);
  if (!hit) return { name: trimmed, colors: null };
  const colors = hit.colorsVerified ? hit.colors : null;
  return { name: hit.schoolName, colors };
}

/** First name, or first name plus a last initial. Nothing else from the full name. */
export function socialName(fullName: string, style: SocialNameStyle): string {
  const parts = fullName.trim().split(/\s+/).filter(Boolean);
  const first = parts[0] ?? 'Player';
  if (style === 'first' || parts.length < 2) return first;
  return `${first} ${parts[parts.length - 1][0].toUpperCase()}.`;
}

/**
 * The only fields a social image may show. Email, phone, parent contact, NCAA ID,
 * address, and the school list are not copied onto this object. A school name
 * appears only when she types one for a Committed or Signed stamp.
 */
export function socialCard(
  profile: PlayerProfile,
  options: {
    nameStyle: SocialNameStyle;
    includeGpa: boolean;
    stamp?: SocialStampId | null;
    schoolName?: string;
    schoolColors?: [string, string] | null;
    leagueId?: LeagueId | null;
  },
): SocialCard {
  const stats: SocialCard['stats'] = [];
  if (profile.stats.jerseyNumber != null) {
    stats.push({ label: 'Jersey', value: `#${profile.stats.jerseyNumber}`, icon: 'jersey' });
  } else {
    const foot = dominantSideDisplay(profile.sport, profile.stats.dominantSide);
    if (foot) stats.push({ label: 'Foot', value: foot, icon: 'foot' });
  }
  const years = profile.stats.yearsAtLevel;
  stats.push({ label: 'Years', value: years === 1 ? '1 year' : `${years} years`, icon: 'years' });
  if (profile.stats.height) stats.push({ label: 'Height', value: profile.stats.height, icon: 'height' });
  const gpa = options.includeGpa ? formatGpa(profile.gpa, profile.gpaWeighted) : null;
  const shown = gpa ? [...stats.slice(0, 2), { label: 'GPA', value: gpa, icon: 'gpa' as const }] : stats.slice(0, 3);
  const stamp = options.stamp ?? null;
  const schoolName = stamp === 'committed' || stamp === 'signed' ? (options.schoolName?.trim() ?? '') : '';
  const leagueId = options.leagueId === undefined ? featuredLeague(profile.leagues) : options.leagueId;
  return {
    name: socialName(profile.name, options.nameStyle),
    sport: SPORT_LABEL[profile.sport],
    position: positionSlash(profile.positions, profile.primaryPosition),
    gradYear: profile.gradYear,
    club: profile.clubTeam.trim(),
    jerseyNumber: profile.stats.jerseyNumber,
    league: leagueId ? { id: leagueId, badge: leagueBadge(leagueId) } : null,
    stats: shown,
    gpa,
    stamp,
    schoolName: schoolName || null,
    schoolColors: schoolName && options.schoolColors ? options.schoolColors : null,
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
