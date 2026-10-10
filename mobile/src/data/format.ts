import type { OutreachStatus, SavedProgram, SchoolSize } from './types';

export function joinLabels(items: string[]): string {
  if (items.length === 0) return '';
  if (items.length === 1) return items[0];
  if (items.length === 2) return `${items[0]} and ${items[1]}`;
  return `${items.slice(0, -1).join(', ')}, and ${items[items.length - 1]}`;
}

export function formatMoney(amount: number): string {
  return amount.toLocaleString('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  });
}

export function formatPercent(rate: number): string {
  return `${Math.round(rate * 100)}%`;
}

export function formatEnrollment(count: number): string {
  return count.toLocaleString('en-US');
}

export function schoolSizeFromEnrollment(enrollment: number): SchoolSize {
  if (enrollment < 3000) return 'small';
  if (enrollment < 10000) return 'medium';
  return 'large';
}

/** Local calendar date as YYYY-MM-DD. */
export function isoToday(date = new Date()): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function addDays(iso: string, days: number): string {
  const [year, month, day] = iso.split('-').map(Number);
  const date = new Date(year, month - 1, day);
  date.setDate(date.getDate() + days);
  return isoToday(date);
}

export function isIsoDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const [year, month, day] = value.split('-').map(Number);
  const date = new Date(year, month - 1, day);
  return (
    date.getFullYear() === year &&
    date.getMonth() === month - 1 &&
    date.getDate() === day
  );
}

export function formatLongDate(iso: string): string {
  if (!isIsoDate(iso)) return iso;
  const [year, month, day] = iso.split('-').map(Number);
  return new Date(year, month - 1, day).toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });
}

/**
 * Emailed schools with a reminder on or before today surface as follow-up due
 * without erasing a later "replied" status.
 */
export function effectiveStatus(saved: SavedProgram, today = isoToday()): OutreachStatus {
  if (
    (saved.status === 'emailed' || saved.status === 'follow_up_due') &&
    saved.followUpDate &&
    saved.followUpDate <= today
  ) {
    return 'follow_up_due';
  }
  return saved.status;
}

export function emptyRecruiting(): {
  saved: Record<string, SavedProgram>;
  passed: Record<string, { at: string }>;
  sponsors: Record<string, { status: 'saved' | 'dismissed'; at: string }>;
} {
  return { saved: {}, passed: {}, sponsors: {} };
}
