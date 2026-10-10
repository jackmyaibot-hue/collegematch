import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { FitBars } from '../../components/FitBars';
import { AppText, Button, Pill, SampleBanner, StatusPill } from '../../components/ui';
import { offersMajor, scoreProgram } from '../../data/fitScore';
import { addDays, effectiveStatus, formatEnrollment, formatLongDate, formatMoney, formatPercent, isoToday, isIsoDate } from '../../data/format';
import { instagramLinkLabel, instagramProfileUrl, recordLine } from '../../data/poster';
import { OUTREACH_STATUSES, POSITION_LABEL, STATUS_LABEL, type OutreachStatus } from '../../data/types';
import { openExternal } from '../../lib/links';
import { useAppState } from '../../state/AppState';
import { colors, divisionTone, fitTone, radius } from '../../theme';

function one(value: string | string[] | undefined): string {
  return Array.isArray(value) ? value[0] ?? '' : value ?? '';
}

export default function SchoolScreen() {
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{ id: string }>();
  const id = one(params.id);
  const { profile, programs, recruiting, setOutreach, unsaveProgram, saveProgram } = useAppState();
  const program = programs.find((item) => item.id === id);
  const [dateDraft, setDateDraft] = useState(recruiting.saved[id]?.followUpDate ?? '');

  if (!profile || !program) {
    return (
      <View style={styles.missing}>
        <AppText variant="title">That school is not in the catalog.</AppText>
        <Button label="Back" kind="ghost" onPress={() => router.back()} />
      </View>
    );
  }

  const fit = scoreProgram(profile, program);
  const saved = recruiting.saved[program.id];
  const tone = fitTone(fit.total);
  const division = divisionTone(program.division);
  const matchedMajors = profile.intendedMajors.filter((major) => offersMajor(program, major));
  const status = saved ? effectiveStatus(saved) : null;

  const chooseStatus = async (next: OutreachStatus) => {
    await setOutreach(program.id, { status: next });
  };

  const chooseDate = async (iso: string) => {
    setDateDraft(iso);
    if (isIsoDate(iso)) await setOutreach(program.id, { followUpDate: iso });
  };

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={{ paddingBottom: insets.bottom + 32 }}
    >
      <View style={[styles.hero, { paddingTop: insets.top + 12 }]}>
        <Pressable accessibilityRole="button" accessibilityLabel="Back" onPress={() => router.back()} hitSlop={10}>
          <Ionicons name="chevron-back" size={26} color="#F4F1EA" />
        </Pressable>
        <View style={styles.heroTop}>
          <View style={[styles.fit, { backgroundColor: tone.bg }]}>
            <AppText variant="label" color={tone.fg} style={styles.fitLabel}>
              Fit
            </AppText>
            <AppText variant="title" color={tone.fg}>
              {fit.total}
            </AppText>
          </View>
          <Pill label={program.division} bg={division.bg} fg={division.fg} />
        </View>
        <AppText variant="title" color="#F4F1EA">
          {program.schoolName}
        </AppText>
        <AppText variant="body" color="#D5E6DC">
          {[program.mascot, `${program.city}, ${program.state}`].filter(Boolean).join(' · ')}
        </AppText>
        {recordLine(program.record) || program.conferenceFinish ? (
          <AppText variant="caption" color="#D5E6DC">
            {[recordLine(program.record), program.conferenceFinish].filter(Boolean).join(' · ')}
          </AppText>
        ) : null}
      </View>

      <View style={styles.body}>
        <SampleBanner />
        <View style={styles.why}>
          <AppText variant="label" color={colors.greenDark} style={styles.whyLabel}>
            Why this fits
          </AppText>
          <AppText variant="body" color={colors.ink}>
            {fit.why}
          </AppText>
          {matchedMajors.length > 0 ? (
            <AppText variant="caption" color={colors.greenDark}>
              Lists {matchedMajors.join(', ')}. Major match is not part of the fit score.
            </AppText>
          ) : (
            <AppText variant="caption">Intended majors are shown for you and are not part of the fit score.</AppText>
          )}
        </View>

        <AppText variant="headline">Score breakdown</AppText>
        <FitBars factors={fit.factors} />

        <AppText variant="headline">Campus and cost</AppText>
        <View style={styles.grid}>
          {program.enrollment != null ? <Fact label="Enrollment" value={formatEnrollment(program.enrollment)} /> : null}
          {program.acceptanceRate != null ? (
            <Fact label="Acceptance" value={formatPercent(program.acceptanceRate)} />
          ) : program.acceptanceLabel ? (
            <Fact label="Acceptance" value={program.acceptanceLabel} />
          ) : null}
          {program.estimatedNetCost != null ? <Fact label="Est. net cost" value={formatMoney(program.estimatedNetCost)} /> : null}
          {program.academics.avgGpa != null ? <Fact label="Typical GPA" value={program.academics.avgGpa.toFixed(1)} /> : null}
          {program.academics.avgSat != null ? <Fact label="Typical SAT" value={String(program.academics.avgSat)} /> : null}
          {program.academics.avgAct != null ? <Fact label="Typical ACT" value={String(program.academics.avgAct)} /> : null}
        </View>
        <AppText variant="caption">
          {program.sample
            ? 'Net cost is a fictional estimate of what a student might pay after aid, not a bill.'
            : 'Average net price is the College Scorecard figure, not a bill. Fields stay blank when a source did not publish them.'}
        </AppText>

        {program.roster.length > 0 ? <AppText variant="headline">Roster at your positions</AppText> : null}
        {profile.positions.map((position) => {
          const spot = program.roster.find((row) => row.position === position);
          if (!spot) return null;
          const used = position === fit.rosterPosition;
          return (
            <View key={position} style={[styles.rosterRow, used && styles.rosterUsed]}>
              <AppText variant="headline">
                {POSITION_LABEL[position]}
                {used ? ' · used in the score' : ''}
              </AppText>
              <AppText variant="body">
                {spot.count} on the roster · {spot.graduating} graduating
              </AppText>
            </View>
          );
        })}

        <AppText variant="headline">Coaching staff</AppText>
        {program.coaches.length === 0 ? (
          <AppText variant="caption">No coaches were listed on the athletics page we checked.</AppText>
        ) : null}
        {program.coaches.map((coach) => (
          <View key={coach.id} style={styles.coach}>
            <View style={styles.coachCopy}>
              <AppText variant="headline">{coach.name}</AppText>
              <AppText variant="caption">{coach.title}</AppText>
              {coach.email ? <AppText variant="caption">{coach.email}</AppText> : <AppText variant="caption">No email published</AppText>}
            </View>
            {coach.email ? (
              <Button
                label="Write intro"
                onPress={() =>
                  router.push({ pathname: '/outreach/[id]', params: { id: program.id, coach: coach.id } })
                }
              />
            ) : null}
          </View>
        ))}

        <AppText variant="headline">Links</AppText>
        {program.questionnaireUrl ? (
          <Button label="Recruiting questionnaire" kind="ghost" icon="open-outline" onPress={() => openExternal(program.questionnaireUrl!)} />
        ) : null}
        {program.admissionsUrl ? (
          <Button label="Admissions" kind="ghost" icon="open-outline" onPress={() => openExternal(program.admissionsUrl!)} />
        ) : null}
        {program.costUrl ? (
          <Button label="Cost and aid" kind="ghost" icon="open-outline" onPress={() => openExternal(program.costUrl!)} />
        ) : null}
        {program.athleticsUrl ? (
          <Button label="Athletics site" kind="ghost" icon="open-outline" onPress={() => openExternal(program.athleticsUrl!)} />
        ) : null}
        {program.instagramHandle ? (
          <Button
            label={
              program.instagramKind
                ? `${instagramLinkLabel(program.instagramKind)} @${program.instagramHandle}`
                : `Instagram @${program.instagramHandle}`
            }
            kind="ghost"
            icon="logo-instagram"
            onPress={() => openExternal(instagramProfileUrl(program.instagramHandle!))}
          />
        ) : null}
        {program.lastVerified ? (
          <AppText variant="caption">Sources last checked {formatLongDate(program.lastVerified)}.</AppText>
        ) : null}

        {program.idCamps.length > 0 ? <AppText variant="headline">ID camps</AppText> : null}
        {program.idCamps.map((camp) => {
          const upcoming = camp.date >= isoToday();
          return (
            <View key={`${camp.name}-${camp.date}`} style={styles.factCard}>
              <AppText variant="caption">{upcoming ? 'Upcoming' : 'Past'}</AppText>
              <AppText variant="headline">{camp.name}</AppText>
              <AppText variant="body">{formatLongDate(camp.date)}</AppText>
              <AppText variant="caption">{camp.notes}</AppText>
            </View>
          );
        })}

        <AppText variant="headline">Outreach</AppText>
        {status ? <StatusPill status={status} /> : <AppText variant="caption">Not saved yet.</AppText>}
        <View style={styles.wrap}>
          {OUTREACH_STATUSES.map((option) => (
            <Pressable
              key={option}
              onPress={() => chooseStatus(option)}
              style={[styles.statusChip, status === option && styles.statusChipOn]}
            >
              <AppText variant="caption" color={status === option ? '#F4F1EA' : colors.ink} style={styles.statusText}>
                {STATUS_LABEL[option]}
              </AppText>
            </Pressable>
          ))}
        </View>
        <AppText variant="label">Follow-up reminder</AppText>
        <View style={styles.wrap}>
          {[
            ['In 3 days', addDays(isoToday(), 3)],
            ['In 1 week', addDays(isoToday(), 7)],
            ['In 2 weeks', addDays(isoToday(), 14)],
          ].map(([label, iso]) => (
            <Pressable key={label} onPress={() => chooseDate(iso)} style={styles.statusChip}>
              <AppText variant="caption" color={colors.ink} style={styles.statusText}>
                {label}
              </AppText>
            </Pressable>
          ))}
        </View>
        <TextInput
          value={dateDraft}
          onChangeText={setDateDraft}
          onBlur={() => {
            if (isIsoDate(dateDraft)) chooseDate(dateDraft);
          }}
          placeholder="2026-11-02"
          autoCapitalize="none"
          style={styles.realInput}
          placeholderTextColor={colors.muted}
        />
        {!isIsoDate(dateDraft) && dateDraft !== '' ? (
          <AppText variant="caption" color={colors.rose}>
            Use the form YYYY-MM-DD.
          </AppText>
        ) : null}
        {saved?.followUpDate ? (
          <AppText variant="caption">Reminder set for {formatLongDate(saved.followUpDate)}.</AppText>
        ) : (
          <AppText variant="caption">No reminder yet. Sending an email sets one a week out.</AppText>
        )}

        {saved ? (
          <Button label="Remove from saved" kind="danger" onPress={() => unsaveProgram(program.id).then(() => router.back())} />
        ) : (
          <Button label="Save this school" onPress={() => saveProgram(program.id)} />
        )}
      </View>
    </ScrollView>
  );
}

function Fact({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.fact}>
      <AppText variant="label" style={styles.factLabel}>
        {label}
      </AppText>
      <AppText variant="headline">{value}</AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  missing: { flex: 1, backgroundColor: colors.bg, padding: 24, justifyContent: 'center', gap: 16 },
  hero: { backgroundColor: colors.greenDark, paddingHorizontal: 20, paddingBottom: 22, gap: 8 },
  heroTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 8 },
  fit: { width: 72, height: 72, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  fitLabel: { marginBottom: 0 },
  body: { padding: 20, gap: 12 },
  why: {
    backgroundColor: '#F3F8E8',
    borderRadius: radius.md,
    padding: 14,
    gap: 6,
    borderLeftWidth: 4,
    borderLeftColor: colors.lime,
  },
  whyLabel: { marginBottom: 0 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  rosterRow: { backgroundColor: colors.white, borderRadius: radius.md, padding: 12, gap: 2 },
  rosterUsed: { borderWidth: 1.5, borderColor: colors.green },
  coach: { backgroundColor: colors.white, borderRadius: radius.lg, padding: 14, gap: 10 },
  coachCopy: { gap: 2 },
  wrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  statusChip: {
    borderRadius: radius.pill,
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.line,
  },
  statusChipOn: { backgroundColor: colors.greenDark, borderColor: colors.greenDark },
  statusText: { fontFamily: 'Outfit_600SemiBold' },
  fact: {
    width: '47%',
    backgroundColor: colors.white,
    borderRadius: radius.md,
    padding: 12,
    gap: 2,
  },
  factLabel: { marginBottom: 0 },
  factCard: { backgroundColor: colors.white, borderRadius: radius.md, padding: 12, gap: 2 },
  realInput: {
    backgroundColor: colors.white,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.line,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontFamily: 'Outfit_500Medium',
    fontSize: 16,
    color: colors.ink,
  },
});
