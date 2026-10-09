import Constants, { ExecutionEnvironment } from 'expo-constants';
import { Platform } from 'react-native';

/**
 * Expo Go floats a tools button over the top-right of the progress bar.
 * The MVP is run in Expo Go, so every native screen keeps a right inset wide
 * enough that the bar ends before that button. Web has no floating button.
 */
export function expoGoToolsClearance(): number {
  if (Platform.OS === 'web') return 0;
  const inExpoGo =
    Constants.executionEnvironment === ExecutionEnvironment.StoreClient ||
    Constants.appOwnership === 'expo' ||
    Constants.expoGoConfig != null;
  // Always reserve the space on a phone. Detection has missed Expo Go before,
  // and the bar was sliding under the gear.
  return inExpoGo || Platform.OS === 'ios' || Platform.OS === 'android' ? 104 : 0;
}
