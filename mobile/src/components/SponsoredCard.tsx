import { StyleSheet, View } from 'react-native';
import type { SponsoredPlacement } from '../data/types';
import { colors, radius } from '../theme';
import { AppText } from './ui';

export function SponsoredCard({ placement }: { placement: SponsoredPlacement }) {
  return (
    <View style={styles.card} accessibilityLabel={`Sponsored. ${placement.sponsorName}. ${placement.title}`}>
      <View style={styles.badge}>
        <AppText variant="label" color={colors.sponsoredInk} style={styles.badgeText}>
          Sponsored
        </AppText>
      </View>
      <AppText variant="caption" color={colors.sponsoredInk}>
        {placement.sponsorName}
      </AppText>
      <AppText variant="title" style={styles.title}>
        {placement.title}
      </AppText>
      <AppText variant="headline" style={styles.when}>
        {placement.dateLabel}
      </AppText>
      <AppText variant="body">{placement.location}</AppText>
      <View style={styles.blurb}>
        <AppText variant="body" color={colors.ink}>
          {placement.blurb}
        </AppText>
      </View>
      <AppText variant="caption">This is a sponsor slot, not a college match. Swipe right to save it, left to skip.</AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    flex: 1,
    backgroundColor: colors.sponsoredBg,
    borderRadius: radius.xl,
    padding: 20,
    borderWidth: 1.5,
    borderColor: colors.sponsoredLine,
    borderStyle: 'dashed',
    justifyContent: 'flex-start',
    gap: 8,
    boxShadow: '0 16px 40px rgba(20, 40, 30, 0.08)',
  },
  badge: {
    alignSelf: 'flex-start',
    backgroundColor: '#F6E2B8',
    borderRadius: radius.pill,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  badgeText: { marginBottom: 0 },
  title: { fontSize: 34, lineHeight: 38, marginTop: 8 },
  when: { color: colors.sponsoredInk },
  blurb: {
    marginTop: 12,
    backgroundColor: 'rgba(255,255,255,0.7)',
    borderRadius: radius.md,
    padding: 14,
  },
});
