import type { ImageSourcePropType } from 'react-native';

/**
 * Shared card photos. Each school reuses one of four sets so the bundle stays small.
 * Campus, field, team, and city pictures are Unsplash stock under the Unsplash License,
 * cropped and compressed. Coach pictures are original illustrations made for this app,
 * not photographs of real people.
 */
const CAMPUS: ImageSourcePropType[] = [
  require('../../assets/cards/campus-1.jpg'),
  require('../../assets/cards/campus-2.jpg'),
  require('../../assets/cards/campus-3.jpg'),
  require('../../assets/cards/campus-4.jpg'),
];

const STADIUM: ImageSourcePropType[] = [
  require('../../assets/cards/stadium-1.jpg'),
  require('../../assets/cards/stadium-2.jpg'),
  require('../../assets/cards/stadium-3.jpg'),
  require('../../assets/cards/stadium-4.jpg'),
];

const TEAM: ImageSourcePropType[] = [
  require('../../assets/cards/team-1.jpg'),
  require('../../assets/cards/team-2.jpg'),
  require('../../assets/cards/team-3.jpg'),
  require('../../assets/cards/team-4.jpg'),
];

const CITY: ImageSourcePropType[] = [
  require('../../assets/cards/city-1.jpg'),
  require('../../assets/cards/city-2.jpg'),
  require('../../assets/cards/city-3.jpg'),
  require('../../assets/cards/city-4.jpg'),
];

const COACHES: ImageSourcePropType[] = [
  require('../../assets/cards/coach-1.jpg'),
  require('../../assets/cards/coach-2.jpg'),
  require('../../assets/cards/coach-3.jpg'),
  require('../../assets/cards/coach-4.jpg'),
];

/** Campus, field, team, then city. Neighboring sets do not repeat the same frame. */
export function cardPhotos(photoSet: number): ImageSourcePropType[] {
  const index = ((photoSet % 4) + 4) % 4;
  return [CAMPUS[index], STADIUM[(index + 1) % 4], TEAM[(index + 2) % 4], CITY[(index + 3) % 4]];
}

export function coachPortrait(index: number): ImageSourcePropType {
  const slot = ((index % COACHES.length) + COACHES.length) % COACHES.length;
  return COACHES[slot];
}
