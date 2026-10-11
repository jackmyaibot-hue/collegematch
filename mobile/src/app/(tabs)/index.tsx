import { useMemo } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ComingSoon } from '../../components/ComingSoon';
import { SwipeDeck } from '../../components/SwipeDeck';
import { AppText, Button, SampleBanner } from '../../components/ui';
import { buildDeck, type DeckCard } from '../../data/deck';
import { programMatchesAthlete, SPORT_LABEL, wantsLevel } from '../../data/sports';
import { useAppState } from '../../state/AppState';
import { colors } from '../../theme';

export default function DiscoverScreen() {
  const insets = useSafeAreaInsets();
  const { profile, programs, sponsors, recruiting, saveProfile, saveProgram, passProgram, saveSponsor, dismissSponsor, resetPasses, undo, canUndo } =
    useAppState();

  const deck = useMemo(
    () => (profile ? buildDeck(programs, profile, recruiting, sponsors) : []),
    [profile, programs, recruiting, sponsors],
  );

  if (!profile) return null;

  const hasCatalog = programs.some((program) => programMatchesAthlete(program, profile));
  if (!hasCatalog) {
    return (
      <View style={[styles.screen, { paddingTop: insets.top + 16 }]}>
        <AppText variant="title" style={styles.wordmark}>
          CollegeMatch
        </AppText>
        <ComingSoon
          sport={profile.sport}
          detail={`${SPORT_LABEL[profile.sport]} programs that match your profile are coming soon. We'll let you know when you can swipe them.`}
          onTrySoccer={() => saveProfile({ ...profile, sport: 'soccer', gender: 'girls' })}
        />
      </View>
    );
  }

  async function onSwipe(direction: 'left' | 'right', item: DeckCard) {
    if (item.type === 'sponsored') {
      if (direction === 'right') await saveSponsor(item.placement.id);
      else await dismissSponsor(item.placement.id);
      return;
    }
    if (direction === 'right') await saveProgram(item.program.id);
    else await passProgram(item.program.id);
  }

  const remaining = deck.filter((card) => card.type === 'program').length;
  const passed = Object.keys(recruiting.passed).length;

  return (
    <View style={[styles.screen, { paddingTop: insets.top + 8 }]}>
      <View style={styles.header}>
        <View style={styles.headerRow}>
          <AppText variant="title" style={styles.wordmark}>
            CollegeMatch
          </AppText>
          {canUndo ? (
            <Pressable accessibilityRole="button" onPress={undo} hitSlop={8}>
              <AppText variant="caption" color={colors.green} style={styles.undo}>
                Undo
              </AppText>
            </Pressable>
          ) : null}
        </View>
        <AppText variant="caption">
          {profile.name.split(' ')[0]}, {remaining} programs left · best fits first
        </AppText>
        <SampleBanner />
      </View>
      {deck.length === 0 ? (
        <View style={styles.empty}>
          {programs.some((program) => programMatchesAthlete(program, profile) && wantsLevel(profile, program)) ? (
            <>
              <AppText variant="title">You’re through the deck.</AppText>
              <AppText variant="body">
                Every program is saved or passed. Saved schools are ready for a coach email.
              </AppText>
              {passed > 0 ? <Button label="Put passes back in the deck" kind="ghost" onPress={resetPasses} /> : null}
            </>
          ) : (
            <>
              <AppText variant="title">No schools at those levels.</AppText>
              <AppText variant="body">
                This deck doesn't have a program for every level you picked. Add a level, or choose Open to all, on your profile.
              </AppText>
            </>
          )}
        </View>
      ) : (
        <View style={styles.deck}>
          <SwipeDeck items={deck} profile={profile} onSwipe={onSwipe} />
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg, paddingHorizontal: 16 },
  header: { gap: 8, marginBottom: 12 },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  wordmark: { fontSize: 28, lineHeight: 32 },
  undo: { fontFamily: 'Outfit_700Bold' },
  deck: { flex: 1, paddingBottom: 8 },
  empty: { flex: 1, justifyContent: 'center', gap: 14, paddingBottom: 40 },
});
