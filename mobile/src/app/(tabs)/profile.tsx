import { useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  AcademicFields,
  IdentityFields,
  PreferenceFields,
  SoccerFields,
  StatsFields,
} from '../../components/ProfileFields';
import { AppText, Button, SampleBanner } from '../../components/ui';
import { PRIVACY_LINE } from '../../copy';
import { FIT_FACTORS } from '../../data/fitScore';
import { draftFromProfile, profileFromDraft, validateDraft, type ProfileDraft } from '../../data/profileDraft';
import { POSITION_LABEL } from '../../data/types';
import { stateName } from '../../data/regions';
import { useAppState } from '../../state/AppState';
import { colors, radius } from '../../theme';

export default function ProfileScreen() {
  const insets = useSafeAreaInsets();
  const { profile, recruiting, saveProfile, clearAll, resetPasses } = useAppState();
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState<ProfileDraft | null>(profile ? draftFromProfile(profile) : null);
  const [errors, setErrors] = useState<Partial<Record<keyof ProfileDraft, string>>>({});
  const [confirmReset, setConfirmReset] = useState(false);

  if (!profile || !draft) return null;
  const passed = Object.keys(recruiting.passed).length;
  const saved = Object.keys(recruiting.saved).length;

  function patch(next: Partial<ProfileDraft>) {
    setDraft((current) => (current ? { ...current, ...next } : current));
  }

  async function save() {
    const found = validateDraft(draft!);
    if (Object.keys(found).length > 0) {
      setErrors(found);
      return;
    }
    await saveProfile(profileFromDraft(draft!, profile!.id));
    setErrors({});
    setEditing(false);
  }

  function erase() {
    if (!confirmReset) {
      setConfirmReset(true);
      return;
    }
    clearAll().catch(() => undefined);
  }

  return (
    <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'android' ? undefined : 'padding'}>
      <ScrollView
        style={styles.flex}
        contentContainerStyle={{ paddingTop: insets.top + 16, paddingHorizontal: 20, paddingBottom: insets.bottom + 32 }}
        keyboardShouldPersistTaps="handled"
      >
        <AppText variant="title">{profile.name}</AppText>
        <AppText variant="body" style={styles.lead}>
          Class of {profile.gradYear} · {profile.positions.map((position) => POSITION_LABEL[position]).join(', ')} ·{' '}
          {profile.clubTeam}
        </AppText>
        <SampleBanner />
        <View style={styles.stats}>
          <Stat label="Saved" value={String(saved)} />
          <Stat label="Passed" value={String(passed)} />
          <Stat label="Home" value={stateName(profile.homeState)} />
        </View>

        {editing ? (
          <View style={styles.form}>
            <IdentityFields draft={draft} onChange={patch} errors={errors} />
            <SoccerFields draft={draft} onChange={patch} errors={errors} />
            <StatsFields draft={draft} onChange={patch} errors={errors} />
            <AcademicFields draft={draft} onChange={patch} errors={errors} />
            <PreferenceFields draft={draft} onChange={patch} errors={errors} />
            <Button label="Save profile" onPress={save} />
            <Button
              label="Cancel"
              kind="ghost"
              onPress={() => {
                setDraft(draftFromProfile(profile));
                setErrors({});
                setEditing(false);
              }}
            />
          </View>
        ) : (
          <View style={styles.summary}>
            <Row label="League" value={profile.league === 'other' ? 'Other' : profile.league} />
            <Row label="GPA" value={profile.gpa.toFixed(2)} />
            <Row label="Tests" value={tests(profile.sat, profile.act)} />
            <Row label="Major" value={profile.intendedMajor} />
            <Row label="Regions" value={profile.preferredRegions.join(', ')} />
            <Row label="Budget" value={profile.budget.label} />
            <Row label="Highlight" value={profile.highlightVideoUrl || 'Not added'} />
            <Row label="Parent email" value={profile.parentEmail || 'Not added'} />
            <Button label="Edit profile" onPress={() => setEditing(true)} />
          </View>
        )}

        <View style={styles.how}>
          <AppText variant="headline">How the fit score works</AppText>
          <AppText variant="body">
            Each school gets a 0–100 score from six pieces. The card’s “why this fits” line is the strongest piece.
          </AppText>
          {FIT_FACTORS.map((factor) => (
            <AppText key={factor.key} variant="caption" color={colors.inkSoft}>
              {factor.label} · {Math.round(factor.weight * 100)}% — {factor.blurb}
            </AppText>
          ))}
        </View>

        {passed > 0 ? <Button label="Put passed schools back" kind="ghost" onPress={resetPasses} /> : null}
        <Button label={confirmReset ? 'Tap again to erase profile' : 'Start over'} kind="danger" onPress={erase} />
        <AppText variant="caption" style={styles.privacy}>
          {PRIVACY_LINE}
        </AppText>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

function tests(sat: number | null, act: number | null): string {
  const parts = [sat != null ? `SAT ${sat}` : null, act != null ? `ACT ${act}` : null].filter(Boolean);
  return parts.length > 0 ? parts.join(' · ') : 'Not added';
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.stat}>
      <AppText variant="label" style={styles.statLabel}>
        {label}
      </AppText>
      <AppText variant="headline" numberOfLines={1}>
        {value}
      </AppText>
    </View>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.row}>
      <AppText variant="caption">{label}</AppText>
      <AppText variant="body" color={colors.ink}>
        {value}
      </AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: colors.bg },
  lead: { marginTop: 6, marginBottom: 12 },
  stats: { flexDirection: 'row', gap: 8, marginTop: 14 },
  stat: { flex: 1, backgroundColor: colors.white, borderRadius: radius.md, padding: 12 },
  statLabel: { marginBottom: 4 },
  summary: { marginTop: 18, gap: 12 },
  row: { gap: 2 },
  form: { marginTop: 18, gap: 8 },
  how: { marginTop: 28, marginBottom: 18, gap: 8 },
  privacy: { marginTop: 16 },
});
