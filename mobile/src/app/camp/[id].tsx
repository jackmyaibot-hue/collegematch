import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AppText, Button } from '../../components/ui';
import { openExternal } from '../../lib/links';
import { useAppState } from '../../state/AppState';
import { colors, radius } from '../../theme';

function one(value: string | string[] | undefined): string {
  return Array.isArray(value) ? value[0] ?? '' : value ?? '';
}

export default function CampScreen() {
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{ id: string }>();
  const id = one(params.id);
  const { sponsors, recruiting, saveSponsor, dismissSponsor } = useAppState();
  const placement = sponsors.find((item) => item.id === id);
  const status = recruiting.sponsors[id]?.status;

  if (!placement) {
    return (
      <View style={styles.missing}>
        <AppText variant="title">That sponsored card is not in the sample deck.</AppText>
        <Button label="Back" onPress={() => router.back()} />
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={{ paddingTop: insets.top + 12, paddingHorizontal: 20, paddingBottom: insets.bottom + 28, gap: 12 }}
    >
      <Pressable accessibilityRole="button" accessibilityLabel="Back" onPress={() => router.back()} hitSlop={10}>
        <Ionicons name="chevron-back" size={26} color={colors.ink} />
      </Pressable>
      <View style={styles.badge}>
        <AppText variant="label" color={colors.sponsoredInk} style={styles.badgeText}>
          Sponsored
        </AppText>
      </View>
      <AppText variant="caption" color={colors.sponsoredInk}>
        {placement.sponsorName}
      </AppText>
      <AppText variant="title">{placement.title}</AppText>
      <AppText variant="headline">{placement.dateLabel}</AppText>
      <AppText variant="body">{placement.location}</AppText>
      <View style={styles.blurb}>
        <AppText variant="body" color={colors.ink}>
          {placement.blurb}
        </AppText>
      </View>
      <AppText variant="caption">
        Placeholder slot. CollegeMatch is free for players and would be funded by sponsors like this, not by player fees.
        No ad network is loaded.
      </AppText>
      {status ? <AppText variant="caption">Saved on this phone as {status}.</AppText> : null}
      <Button label="Open sample link" kind="ghost" icon="open-outline" onPress={() => openExternal(placement.url)} />
      {status !== 'saved' ? <Button label="Save camp" onPress={() => saveSponsor(placement.id)} /> : null}
      {status !== 'dismissed' ? (
        <Button label="Not interested" kind="ghost" onPress={() => dismissSponsor(placement.id)} />
      ) : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  missing: { flex: 1, backgroundColor: colors.bg, padding: 24, justifyContent: 'center', gap: 16 },
  badge: {
    alignSelf: 'flex-start',
    backgroundColor: '#F6E2B8',
    borderRadius: radius.pill,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  badgeText: { marginBottom: 0 },
  blurb: { backgroundColor: colors.sponsoredBg, borderRadius: radius.md, padding: 14 },
});