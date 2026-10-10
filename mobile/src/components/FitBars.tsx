import { StyleSheet, View } from 'react-native';
import type { FitFactor } from '../data/fitScore';
import { colors, radius } from '../theme';
import { AppText } from './ui';

export function FitBars({ factors }: { factors: FitFactor[] }) {
  return (
    <View style={styles.list}>
      {factors.map((factor) => (
        <View key={factor.key} style={styles.row}>
          <View style={styles.meta}>
            <AppText variant="caption" color={colors.ink} style={styles.label}>
              {factor.label}
            </AppText>
            <AppText variant="caption">{factor.score}</AppText>
          </View>
          <View style={styles.track}>
            <View style={[styles.fill, { width: `${factor.score}%` }]} />
          </View>
          <AppText variant="caption">{factor.detail}</AppText>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  list: { gap: 14 },
  row: { gap: 6 },
  meta: { flexDirection: 'row', justifyContent: 'space-between' },
  label: { fontFamily: 'Outfit_600SemiBold' },
  track: {
    height: 8,
    borderRadius: radius.pill,
    backgroundColor: '#E7E4DC',
    overflow: 'hidden',
  },
  fill: {
    height: 8,
    borderRadius: radius.pill,
    backgroundColor: colors.green,
  },
});
