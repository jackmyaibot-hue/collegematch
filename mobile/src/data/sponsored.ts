import type { SponsoredPlacement } from './types';

/**
 * Placeholder sponsor inventory.
 * These cards are slots a real sponsor could buy later. They are not ads
 * from an ad network, and the app does not load any ad or analytics SDK.
 */
export const SAMPLE_SPONSORS: SponsoredPlacement[] = [
  {
    id: 'sponsor-harborlight-winter',
    sport: 'soccer',
    side: 'women',
    label: 'Sponsored',
    sponsorName: 'Harborlight Soccer',
    title: 'Winter ID Camp',
    dateLabel: 'December 12–13, 2026',
    location: 'Richmond, VA',
    blurb:
      'Placeholder for a sponsored camp. Two sample days of training plus a college-coach panel. A real sponsor would replace this copy.',
    url: 'https://example.com/sponsors/harborlight-winter',
    insertAt: 3,
    placeholder: true,
  },
  {
    id: 'sponsor-pitchweek-spring',
    sport: 'soccer',
    side: 'women',
    label: 'Sponsored',
    sponsorName: 'Pitchweek',
    title: 'Spring Showcase',
    dateLabel: 'March 6–8, 2027',
    location: 'Dallas, TX',
    blurb:
      'Placeholder for a sponsored showcase. Clearly marked so it is never confused with a college match.',
    url: 'https://example.com/sponsors/pitchweek-spring',
    insertAt: 8,
    placeholder: true,
  },
];
