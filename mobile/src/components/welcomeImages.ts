import type { ImageSourcePropType } from 'react-native';
import type { Sport } from '../data/types';

const WELCOME_IMAGES: Record<Sport | 'default', ImageSourcePropType> = {
  default: require('../../assets/welcome/welcome-default.jpg'),
  soccer: require('../../assets/welcome/welcome-soccer.jpg'),
  basketball: require('../../assets/welcome/welcome-basketball.jpg'),
  volleyball: require('../../assets/welcome/welcome-volleyball.jpg'),
  softball: require('../../assets/welcome/welcome-softball.jpg'),
  baseball: require('../../assets/welcome/welcome-baseball.jpg'),
  lacrosse: require('../../assets/welcome/welcome-lacrosse.jpg'),
  track: require('../../assets/welcome/welcome-track.jpg'),
  swimming: require('../../assets/welcome/welcome-swimming.jpg'),
  football: require('../../assets/welcome/welcome-football.jpg'),
  tennis: require('../../assets/welcome/welcome-tennis.jpg'),
  golf: require('../../assets/welcome/welcome-golf.jpg'),
  other: require('../../assets/welcome/welcome-other.jpg'),
};

/** Sports that rotate on the welcome screen before a sport is chosen. */
export const WELCOME_SHOWCASE: Sport[] = ['football', 'soccer', 'basketball', 'track', 'volleyball', 'baseball'];

export function welcomeImage(sport: Sport | null): ImageSourcePropType {
  if (!sport) return WELCOME_IMAGES[WELCOME_SHOWCASE[0]];
  return WELCOME_IMAGES[sport];
}
