import { Image, Platform, StyleSheet, View } from 'react-native';
import { AppText } from './ui';
import { colors } from '../theme';

/**
 * One logo path for the public site and the app.
 * Drop the real file in at public/brand/logo.svg when it is ready.
 */
export const LOGO_PATH = '/brand/logo.svg';

export function BrandLogo({ height = 36, onDark = true }: { height?: number; onDark?: boolean }) {
  const width = Math.round(height * (280 / 48));
  if (Platform.OS === 'web') {
    return (
      <Image
        accessibilityLabel="CollegeMatch"
        source={{ uri: LOGO_PATH }}
        style={{ width, height }}
      />
    );
  }
  return (
    <View style={styles.row}>
      <View style={[styles.mark, { width: height, height }]}>
        <AppText variant="headline" color={colors.greenDark}>
          CM
        </AppText>
      </View>
      <AppText variant="headline" color={onDark ? '#F4F1EA' : colors.greenDark}>
        CollegeMatch
      </AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  mark: {
    borderRadius: 12,
    backgroundColor: colors.lime,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
