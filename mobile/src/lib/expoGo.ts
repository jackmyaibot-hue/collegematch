import Constants, { ExecutionEnvironment } from 'expo-constants';
import { Platform } from 'react-native';

/**
 * Expo Go floats a tools button over the top-right corner, on the same row as
 * the progress bar. Store builds do not, so the extra space is only for that app.
 * The value is a right inset, in points, wide enough that the bar ends before the button.
 */
export function expoGoToolsClearance(): number {
  if (Platform.OS === 'web') return 0;
  const inExpoGo =
    Constants.executionEnvironment === ExecutionEnvironment.StoreClient || Constants.appOwnership === 'expo';
  return inExpoGo ? 88 : 0;
}
