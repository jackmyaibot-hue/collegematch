import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useState } from 'react';
import { ImageBackground, KeyboardAvoidingView, Platform, Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ComingSoon } from '../components/ComingSoon';
import {
  AboutFields,
  AcademicFields,
  CoachFields,
  GameFields,
  IdentityFields,
  PreferenceFields,
  SoccerFields,
} from '../components/ProfileFields';
import { AppText, Button, ProgressBar, Screen } from '../components/ui';
import { PRIVACY_LINE } from '../copy';
import { joinLabels } from '../data/format';
import { emptyDraft, majorsFromDraft, profileFromDraft, validateDraft, type ProfileDraft } from '../data/profileDraft';
import { stateName } from '../data/regions';
import { welcomeImage } from '../components/welcomeImages';
import {
  dominantSideDisplay,
  GENDER_LABEL,
  leagueShortList,
  positionSlash,
  programMatchesAthlete,
  sportHeading,
  SPORT_LABEL,
} from '../data/sports';
import { SPORTS, type Sport } from '../data/types';
import { expoGoToolsClearance } from '../lib/expoGo';
import { useAppState } from '../state/AppState';
import { colors, radius } from '../theme';

const STEPS = ['welcome', 'you', 'soccer', 'game', 'coaches', 'academics', 'about', 'preferences', 'review', 'comingSoon'] as const;
type Step = (typeof STEPS)[number];

const STEP_FIELDS: Record<Step, (keyof ProfileDraft)[]> = {
  welcome: [],
  comingSoon: [],
  you: ['name', 'birthdate', 'gender', 'sport', 'gradYear', 'homeState'],
  soccer: ['positions', 'primaryPosition', 'clubTeam', 'leagues'],
  game: ['highlightVideoUrl', 'yearsAtLevel', 'dominantSide', 'jerseyNumber'],
  coaches: [
    'clubCoachName',
    'clubCoachEmail',
    'clubCoachPhone',
    'highSchoolCoachName',
    'highSchoolCoachEmail',
    'highSchoolCoachPhone',
  ],
  academics: [
    'gpa',
    'sat',
    'act',
    'intendedMajors',
    'customMajor',
    'asbRole',
    'apCourses',
    'honorsCourses',
    'scholarAthlete',
    'serviceHours',
    'otherAchievement',
  ],
  about: ['proudOf', 'funFact'],
  preferences: ['preferredRegions', 'schoolSizePreference', 'budgetId', 'parentEmail'],
  review: [],
};

const TITLES: Record<'you' | 'game' | 'coaches' | 'academics' | 'about' | 'preferences', string> = {
  you: 'About you',
  game: 'Your game',
  coaches: 'Your coaches',
  academics: 'Academics',
  about: 'About me',
  preferences: 'What you want',
};

export default function OnboardingScreen() {
  const { saveProfile, programs } = useAppState();
  const insets = useSafeAreaInsets();
  const toolsClearance = expoGoToolsClearance();
  const [step, setStep] = useState<Step>('welcome');
  const [draft, setDraft] = useState<ProfileDraft>(emptyDraft());
  const [errors, setErrors] = useState<Partial<Record<keyof ProfileDraft, string>>>({});
  const index = STEPS.indexOf(step);

  function patch(next: Partial<ProfileDraft>) {
    setDraft((current) => ({ ...current, ...next }));
    setErrors((current) => {
      const cleared = { ...current };
      for (const key of Object.keys(next) as (keyof ProfileDraft)[]) delete cleared[key];
      return cleared;
    });
  }

  function sportOpen(sport: Sport): boolean {
    if (!draft.gender) return programs.some((program) => program.sport === sport);
    return programs.some((program) => programMatchesAthlete(program, { sport, gender: draft.gender! }));
  }

  function back() {
    setErrors({});
    if (step === 'comingSoon') {
      setStep('you');
      return;
    }
    if (index <= 0) return;
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
    if (step === 'you') {
      const open = draft.sport != null && draft.gender != null && sportOpen(draft.sport);
      setStep(open ? 'soccer' : 'comingSoon');
      return;
    }
    if (step === 'review') {
      const all = validateDraft(draft);
      if (Object.keys(all).length > 0) {
        const order: Step[] = ['you', 'soccer', 'game', 'coaches', 'academics', 'about', 'preferences'];
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
      <ImageBackground
        source={welcomeImage(draft.sport)}
        style={[styles.welcome, { paddingTop: insets.top + 28 }]}
        imageStyle={styles.welcomeImage}
      >
        <StatusBar style="light" />
        <View style={styles.scrim} />
        <View style={styles.scrimBottom} />
        <View style={styles.welcomeBody}>
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
          <AppText variant="title" color="#F4F1EA" style={styles.welcomeLead}>
            You've got this.
          </AppText>
          <AppText variant="body" color="#E7F3EC" style={styles.welcomeCopy}>
            We'll help you find where you fit, one swipe at a time.
          </AppText>
          <AppText variant="caption" color="#D5E6DC">
            {PRIVACY_LINE}
          </AppText>
          <View style={styles.welcomeButton}>
            <Button label="Build my profile" kind="lime" onPress={forward} />
          </View>
        </View>
      </ImageBackground>
    );
  }

  if (step === 'comingSoon' && draft.sport) {
    return (
      <Screen extraTop={toolsClearance}>
        <StatusBar style="dark" />
        <Pressable accessibilityRole="button" accessibilityLabel="Back" onPress={back} hitSlop={12}>
          <Ionicons name="chevron-back" size={26} color={colors.ink} />
        </Pressable>
        <ComingSoon
          sport={draft.sport}
          detail={
            draft.gender === 'boys' && draft.sport === 'soccer'
              ? "Men's soccer is coming soon. We'll let you know when those programs are ready to swipe."
              : undefined
          }
          onTrySoccer={() => {
            setDraft((current) => ({ ...current, sport: 'soccer', gender: 'girls' }));
            setStep('you');
          }}
        />
      </Screen>
    );
  }

  const formProgress = step === 'review' ? 1 : index / 7;

  return (
    <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'android' ? undefined : 'padding'}>
      <StatusBar style="dark" />
      <Screen
        scroll
        footer={
          <Button label={step === 'review' ? 'Show my matches' : 'Continue'} onPress={forward} />
        }
      >
        <View style={[styles.stepHead, toolsClearance ? { paddingRight: toolsClearance } : null]}>
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
              {step === 'soccer'
                ? sportHeading(draft.sport ?? 'soccer')
                : step === 'you' ||
                    step === 'game' ||
                    step === 'coaches' ||
                    step === 'academics' ||
                    step === 'about' ||
                    step === 'preferences'
                  ? TITLES[step]
                  : ''}
            </AppText>
            {step === 'you' ? (
              <IdentityFields
                draft={draft}
                onChange={patch}
                errors={errors}
                openSports={SPORTS.filter((sport) => sportOpen(sport))}
              />
            ) : null}
            {step === 'soccer' ? <SoccerFields draft={draft} onChange={patch} errors={errors} /> : null}
            {step === 'game' ? <GameFields draft={draft} onChange={patch} errors={errors} /> : null}
            {step === 'coaches' ? <CoachFields draft={draft} onChange={patch} errors={errors} /> : null}
            {step === 'academics' ? <AcademicFields draft={draft} onChange={patch} errors={errors} /> : null}
            {step === 'about' ? <AboutFields draft={draft} onChange={patch} errors={errors} /> : null}
            {step === 'preferences' ? <PreferenceFields draft={draft} onChange={patch} errors={errors} /> : null}
          </>
        )}
      </Screen>
    </KeyboardAvoidingView>
  );
}

function Review({ draft }: { draft: ProfileDraft }) {
  const foot = draft.sport ? dominantSideDisplay(draft.sport, draft.dominantSide) : null;
  const hs = draft.highSchoolCoachName.trim();
  return (
    <View>
      <AppText variant="title">Look right?</AppText>
      <AppText variant="body" style={styles.reviewLead}>
        We'll rank the sample deck from this. You can edit it anytime.
      </AppText>
      <View style={styles.reviewCard}>
        <Line label="Name" value={`${draft.name} · ${draft.gradYear}`} />
        <Line label="Birthday" value={draft.birthdate} />
        <Line label="Programs" value={draft.gender ? GENDER_LABEL[draft.gender] : ''} />
        <Line label="Sport" value={draft.sport ? SPORT_LABEL[draft.sport] : ''} />
        <Line label="From" value={stateName(draft.homeState)} />
        <Line label="Positions" value={positionSlash(draft.positions, draft.primaryPosition)} />
        <Line label="Club" value={draft.clubTeam} />
        <Line label="Leagues" value={leagueShortList(draft.leagues)} />
        <Line label="Foot" value={foot ?? 'Not added'} />
        <Line label="Jersey" value={draft.jerseyNumber ? `#${draft.jerseyNumber}` : ''} />
        <Line label="Years at level" value={draft.yearsAtLevel} />
        <Line label="Club coach" value={draft.clubCoachName} />
        <Line label="High school coach" value={hs || 'Not added'} />
        <Line label="Highlight" value={draft.highlightVideoUrl || 'Not added'} />
        <Line label="GPA" value={draft.gpa} />
        <Line label="Majors" value={joinLabels(majorsFromDraft(draft))} />
        <Line label="Honors" value={honorLine(draft)} />
        <Line label="Proud of" value={draft.proudOf.trim() || 'Not added'} />
        <Line label="Fun fact" value={draft.funFact.trim() || 'Not added'} />
        <Line label="Regions" value={draft.preferredRegions.join(', ')} />
      </View>
    </View>
  );
}

function honorLine(draft: ProfileDraft): string {
  const bits = [
    draft.valedictorian ? 'Valedictorian' : null,
    draft.salutatorian ? 'Salutatorian' : null,
    draft.nationalHonorSociety ? 'National Honor Society' : null,
    draft.honorRoll ? "Principal's list" : null,
    draft.asb ? (draft.asbRole.trim() ? `ASB, ${draft.asbRole.trim()}` : 'ASB') : null,
    draft.teamCaptain ? 'Team captain' : null,
    draft.apCourses.trim() ? `${draft.apCourses.trim()} AP` : null,
    draft.serviceHours.trim() ? `${draft.serviceHours.trim()} service hours` : null,
    draft.otherAchievement.trim() || null,
  ].filter((item): item is string => Boolean(item));
  return bits.length > 0 ? joinLabels(bits) : 'Not added';
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
  },
  welcomeImage: { resizeMode: 'cover' },
  scrim: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    backgroundColor: 'rgba(6, 24, 18, 0.55)',
  },
  scrimBottom: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: '58%',
    backgroundColor: 'rgba(6, 24, 18, 0.5)',
  },
  welcomeBody: { flex: 1, paddingHorizontal: 24, paddingBottom: 28 },
  welcomeLead: { marginTop: 16, fontSize: 28, lineHeight: 34 },
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
