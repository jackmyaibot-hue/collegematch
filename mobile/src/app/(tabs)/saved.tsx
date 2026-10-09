import { router } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ComingSoon } from '../../components/ComingSoon';
import { AppText, SampleBanner, StatusPill } from '../../components/ui';
import { scoreProgram } from '../../data/fitScore';
import { effectiveStatus } from '../../data/format';
import { programMatchesAthlete } from '../../data/sports';
import { useAppState } from '../../state/AppState';
import { colors, divisionTone, fitTone, radius } from '../../theme';

export default function SavedScreen() {
  const insets = useSafeAreaInsets();
  const { profile, programs, sponsors, recruiting, saveProfile } = useAppState();
  if (!profile) return null;

  const hasCatalog = programs.some((program) => programMatchesAthlete(program, profile));

  const saved = Object.values(recruiting.saved)
    .map((item) => {
      const program = programs.find((candidate) => candidate.id === item.programId);
      if (!program) return null;
      return { item, program, fit: scoreProgram(profile, program) };
    })
    .filter((row): row is NonNullable<typeof row> => row != null)
    .sort((a, b) => b.fit.total - a.fit.total);

  const savedSponsors = sponsors.filter((sponsor) => recruiting.sponsors[sponsor.id]?.status === 'saved');

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={{ paddingTop: insets.top + 16, paddingHorizontal: 20, paddingBottom: insets.bottom + 28 }}
    >
      <AppText variant="title">Saved</AppText>
      <AppText variant="body" style={styles.lead}>
        Schools you swiped right on. Open one to see coaches and write an intro.
      </AppText>
      <SampleBanner />
      {!hasCatalog ? (
        <ComingSoon
          sport={profile.sport}
          onTrySoccer={() => saveProfile({ ...profile, sport: 'soccer', gender: 'girls' })}
        />
      ) : saved.length === 0 ? (
        <View style={styles.empty}>
          <AppText variant="headline">No schools saved yet.</AppText>
          <AppText variant="body">Swipe right on Discover when a program looks like a fit.</AppText>
        </View>
      ) : (
        <View style={styles.list}>
          {saved.map(({ item, program, fit }) => {
            const division = divisionTone(program.division);
            const tone = fitTone(fit.total);
            const status = effectiveStatus(item);
            return (
              <Pressable
                key={program.id}
                accessibilityRole="button"
                onPress={() => router.push({ pathname: '/school/[id]', params: { id: program.id } })}
                style={styles.row}
              >
                <View style={[styles.score, { backgroundColor: tone.bg }]}>
                  <AppText variant="headline" color={tone.fg}>
                    {fit.total}
                  </AppText>
                </View>
                <View style={styles.copy}>
                  <AppText variant="headline" numberOfLines={1}>
                    {program.schoolName}
                  </AppText>
                  <AppText variant="caption">
                    {program.city}, {program.state} · {program.division}
                  </AppText>
                  <View style={styles.pills}>
                    <View style={[styles.mini, { backgroundColor: division.bg }]}>
                      <AppText variant="caption" color={division.fg} style={styles.miniText}>
                        {program.conference}
                      </AppText>
                    </View>
                    <StatusPill status={status} />
                  </View>
                </View>
              </Pressable>
            );
          })}
        </View>
      )}
      {savedSponsors.length > 0 ? (
        <View style={styles.sponsorBlock}>
          <AppText variant="label">Sponsored</AppText>
          {savedSponsors.map((sponsor) => (
            <Pressable
              key={sponsor.id}
              accessibilityRole="button"
              onPress={() => router.push({ pathname: '/camp/[id]', params: { id: sponsor.id } })}
              style={styles.sponsorRow}
            >
              <AppText variant="label" color={colors.sponsoredInk} style={styles.sponsoredLabel}>
                Sponsored
              </AppText>
              <AppText variant="headline">{sponsor.title}</AppText>
              <AppText variant="caption">
                {sponsor.sponsorName} · {sponsor.location}
              </AppText>
            </Pressable>
          ))}
        </View>
      ) : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  lead: { marginTop: 6, marginBottom: 12 },
  empty: { marginTop: 28, gap: 8 },
  list: { marginTop: 16, gap: 10 },
  row: {
    flexDirection: 'row',
    gap: 12,
    backgroundColor: colors.white,
    borderRadius: radius.lg,
    padding: 12,
    alignItems: 'center',
  },
  score: {
    width: 52,
    height: 52,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  copy: { flex: 1, gap: 3 },
  pills: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 4 },
  mini: { borderRadius: radius.pill, paddingHorizontal: 8, paddingVertical: 3, maxWidth: '100%' },
  miniText: { fontFamily: 'Outfit_600SemiBold' },
  sponsorBlock: { marginTop: 28, gap: 10 },
  sponsorRow: {
    backgroundColor: colors.sponsoredBg,
    borderRadius: radius.lg,
    padding: 14,
    borderWidth: 1,
    borderColor: colors.sponsoredLine,
    gap: 4,
  },
  sponsoredLabel: { marginBottom: 0 },
});
