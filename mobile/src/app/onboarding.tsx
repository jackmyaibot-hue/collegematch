import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  AcademicFields,
  IdentityFields,
  PreferenceFields,
  SoccerFields,
  StatsFields,
} from '../components/ProfileFields';
import { AppText, Button, ProgressBar, Screen } from '../components/ui';
import { PRIVACY_LINE } from '../copy';
import { POSITION_LABEL } from '../data/types';
import { emptyDraft, profileFromDraft, validateDraft, type ProfileDraft } from '../data/profileDraft';
import { stateName } from '../data/regions';
import { useAppState } from '../state/AppState';
import { colors, radius } from '../theme';

const STEPS = ['welcome', 'you', 'soccer', 'stats', 'academics', 'preferences', 'review'] as const;
type Step = (typeof STEPS)[number];

const STEP_FIELDS: Record<Step, (keyof ProfileDraft)[]> = {
  welcome: [],
  you: ['name', 'gradYear', 'homeState'],
  soccer: ['positions', 'clubTeam', 'league'],
  stats: ['gamesPlayed', 'goals', 'assists', 'cleanSheets', 'savePercentage', 'highlightVideoUrl'],
  academics: ['gpa', 'sat', 'act', 'intendedMajor'],
  preferences: ['preferredRegions', 'schoolSizePreference', 'budgetId', 'parentEmail'],
  review: [],
};

const TITLES: Record<Exclude<Step, 'welcome' | 'review'>, string> = {
  you: 'About you',
  soccer: 'Your soccer',
  stats: 'Key stats',
  academics: 'Academics',
  preferences: 'What you want',
};

export default function OnboardingScreen() {
  const { saveProfile } = useAppState();
  const insets = useSafeAreaInsets();
  const [step, setStep] = useState<Step>('welcome');
  const [draft, setDraft] = useState<ProfileDraft>(emptyDraft());
  const [errors, setErrors] = useState<Partial<Record<keyof ProfileDraft, string>>>({});
  const index = STEPS.indexOf(step);

  function patch(next: Partial<ProfileDraft>) {
    setDraft((current) => ({ ...current, ...next }));
  }

  function back() {
    if (index <= 0) return;
    setErrors({});
    setStep(STEPS[index - 1]);
  }

  async function forward() {
    const fields = STEP_FIELDS[step];
    const found = validateDraft(draft);
    const visible = Object.fromEntries(fields.filter((field) => found[field]).map((field) => [field, found[field]]));
    if (Object.keys(visible).length > 0) {
      setErrors(visible);
      return;
    }
    setErrors({});
    if (step === 'review') {
      const all = validateDraft(draft);
      if (Object.keys(all).length > 0) {
        const order: Step[] = ['you', 'soccer', 'stats', 'academics', 'preferences'];
        const next = order.find((item) => STEP_FIELDS[item].some((field) => all[field]));
        setErrors(all);
        if (next) setStep(next);
        return;
      }
      await saveProfile(profileFromDraft(draft));
      router.replace('/(tabs)');
      return;
    }
    setStep(STEPS[index + 1]);
  }

  if (step === 'welcome') {
    return (
      <View style={[styles.welcome, { paddingTop: insets.top + 28 }]}>
        <StatusBar style="light" />
        <View style={styles.fan}>
          <View style={[styles.fanCard, styles.fanLeft]} />
          <View style={[styles.fanCard, styles.fanRight]} />
          <View style={[styles.fanCard, styles.fanFront]}>
            <AppText variant="label" color={colors.ink} style={styles.fitLabel}>
              Fit
            </AppText>
            <AppText variant="title" style={styles.fitNumber}>
              91
            </AppText>
            <AppText variant="caption" color={colors.ink}>
              Your next campus
            </AppText>
          </View>
        </View>
        <AppText variant="display" color="#F4F1EA">
          College{'\n'}
          <AppText variant="displayItalic" color={colors.lime}>
            Match
          </AppText>
        </AppText>
        <AppText variant="body" color="#D5E6DC" style={styles.welcomeCopy}>
          Swipe women’s college soccer programs that fit your game, your grades, and your budget. Then write the coach.
        </AppText>
        <AppText variant="caption" color="#B7D0C4">
          {PRIVACY_LINE}
        </AppText>
        <View style={styles.welcomeButton}>
          <Button label="Build my profile" kind="lime" onPress={forward} />
        </View>
      </View>
    );
  }

  const formProgress = step === 'review' ? 1 : index / 5;

  return (
    <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'android' ? undefined : 'padding'}>
      <StatusBar style="dark" />
      <Screen
        scroll
        footer={
          <Button label={step === 'review' ? 'Show my matches' : 'Continue'} onPress={forward} />
        }
      >
        <View style={styles.stepHead}>
          <Pressable accessibilityRole="button" accessibilityLabel="Back" onPress={back} hitSlop={12}>
            <Ionicons name="chevron-back" size={26} color={colors.ink} />
          </Pressable>
          <View style={styles.progress}>
            <ProgressBar value={formProgress} />
          </View>
        </View>
        {step === 'review' ? (
          <Review draft={draft} />
        ) : (
          <>
            <AppText variant="title" style={styles.stepTitle}>
              {TITLES[step]}
            </AppText>
            {step === 'you' ? <IdentityFields draft={draft} onChange={patch} errors={errors} /> : null}
            {step === 'soccer' ? <SoccerFields draft={draft} onChange={patch} errors={errors} /> : null}
            {step === 'stats' ? <StatsFields draft={draft} onChange={patch} errors={errors} /> : null}
            {step === 'academics' ? <AcademicFields draft={draft} onChange={patch} errors={errors} /> : null}
            {step === 'preferences' ? <PreferenceFields draft={draft} onChange={patch} errors={errors} /> : null}
          </>
        )}
      </Screen>
    </KeyboardAvoidingView>
  );
}

function Review({ draft }: { draft: ProfileDraft }) {
  const positions = draft.positions.map((position) => POSITION_LABEL[position]).join(', ');
  return (
    <View>
      <AppText variant="title">Look right?</AppText>
      <AppText variant="body" style={styles.reviewLead}>
        We’ll rank the sample deck from this. You can edit it anytime.
      </AppText>
      <View style={styles.reviewCard}>
        <Line label="Name" value={`${draft.name} · ${draft.gradYear}`} />
        <Line label="From" value={stateName(draft.homeState)} />
        <Line label="Soccer" value={`${positions} · ${draft.clubTeam}`} />
        <Line label="League" value={draft.league === 'other' ? 'Other' : draft.league ?? ''} />
        <Line label="GPA" value={draft.gpa} />
        <Line label="Major" value={draft.intendedMajor} />
        <Line label="Regions" value={draft.preferredRegions.join(', ')} />
      </View>
    </View>
  );
}

function Line({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.line}>
      <AppText variant="caption">{label}</AppText>
      <AppText variant="headline">{value}</AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: colors.bg },
  welcome: {
    flex: 1,
    backgroundColor: colors.greenDark,
    paddingHorizontal: 24,
    paddingBottom: 28,
  },
  fan: { height: 170, marginBottom: 28 },
  fanCard: {
    position: 'absolute',
    width: 150,
    height: 120,
    borderRadius: 22,
  },
  fanLeft: { backgroundColor: '#145C40', left: 18, top: 28, transform: [{ rotate: '-10deg' }] },
  fanRight: { backgroundColor: '#1C6B4A', right: 18, top: 22, transform: [{ rotate: '8deg' }] },
  fanFront: {
    backgroundColor: colors.lime,
    left: 78,
    top: 18,
    padding: 14,
    justifyContent: 'center',
  },
  fitLabel: { marginBottom: 0 },
  fitNumber: { fontSize: 36, lineHeight: 40 },
  welcomeCopy: { marginTop: 14, marginBottom: 16 },
  welcomeButton: { marginTop: 'auto' },
  stepHead: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 18 },
  progress: { flex: 1 },
  stepTitle: { marginBottom: 18 },
  reviewLead: { marginTop: 8, marginBottom: 16 },
  reviewCard: {
    backgroundColor: colors.white,
    borderRadius: radius.lg,
    padding: 16,
    gap: 12,
  },
  line: { gap: 2 },
});
