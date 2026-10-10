import type { Division, OutreachStatus } from './data/types';

export const colors = {
  bg: '#F3F0E8',
  desk: '#D9D3C7',
  ink: '#17211C',
  inkSoft: '#3C4A43',
  muted: '#6E7C74',
  line: '#E4DDD2',
  white: '#FFFCF7',
  green: '#0F7A45',
  greenDark: '#0C3B2C',
  greenMid: '#146C43',
  lime: '#D8F26A',
  rose: '#E4376A',
  roseSoft: '#FDE8EF',
  amber: '#C47B09',
  amberSoft: '#FFF3D6',
  card: '#FFFFFF',
  sponsoredBg: '#FFF6E4',
  sponsoredInk: '#8A4E09',
  sponsoredLine: '#F0D7A4',
};

export const radius = {
  sm: 12,
  md: 16,
  lg: 22,
  xl: 28,
  pill: 999,
};

export function divisionTone(division: Division): { bg: string; fg: string } {
  switch (division) {
    case 'NCAA D1':
      return { bg: colors.greenDark, fg: '#F4F1EA' };
    case 'NCAA D2':
      return { bg: colors.green, fg: '#F4F1EA' };
    case 'NCAA D3':
      return { bg: '#1F3A4D', fg: '#F4F1EA' };
    case 'NAIA':
      return { bg: '#F0D48A', fg: colors.ink };
    case 'NJCAA':
      return { bg: '#F0C9B2', fg: colors.ink };
  }
}

export function statusTone(status: OutreachStatus): { bg: string; fg: string } {
  switch (status) {
    case 'not_contacted':
      return { bg: '#E7E4DC', fg: colors.ink };
    case 'emailed':
      return { bg: '#E5F4EC', fg: colors.greenDark };
    case 'replied':
      return { bg: colors.lime, fg: colors.ink };
    case 'follow_up_due':
      return { bg: '#FDE8C8', fg: colors.sponsoredInk };
  }
}

export function fitTone(score: number): { bg: string; fg: string } {
  if (score >= 80) return { bg: colors.lime, fg: colors.ink };
  if (score >= 65) return { bg: colors.amberSoft, fg: colors.ink };
  return { bg: colors.roseSoft, fg: colors.rose };
}
