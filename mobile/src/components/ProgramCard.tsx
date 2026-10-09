import { StyleSheet, View } from 'react-native';
import { costCaption } from '../data/fitScore';
import type { FitResult } from '../data/fitScore';
import { formatEnrollment, formatMoney, formatPercent } from '../data/format';
import { POSITION_LABEL, type PlayerProfile, type Program } from '../data/types';
import { colors, divisionTone, fitTone, radius } from '../theme';
import { AppText, Pill } from './ui';

export function ProgramCard({
  program,
  fit,
  profile,
}: {
  program: Program;
  fit: FitResult;
  profile: PlayerProfile;
}) {
  const division = divisionTone(program.division);
  const fitColors = fitTone(fit.total);
  const rosterLabel = POSITION_LABEL[fit.rosterPosition];
  return (
    <View style={styles.card} accessibilityLabel={`${program.schoolName}, fit ${fit.total}, ${program.division}`}>
      <View style={styles.top}>
        <View style={[styles.fit, { backgroundColor: fitColors.bg }]}>
          <AppText variant="label" color={fitColors.fg} style={styles.fitLabel}>
            Fit
          </AppText>
          <AppText variant="title" color={fitColors.fg} style={styles.fitScore}>
            {fit.total}
          </AppText>
        </View>
        <View style={styles.identity}>
          <Pill label={program.division} bg={division.bg} fg={division.fg} />
          <AppText variant="title" numberOfLines={2} style={styles.name}>
            {program.schoolName}
          </AppText>
          <AppText variant="caption">
            {program.city}, {program.state}
          </AppText>
          <AppText variant="caption" numberOfLines={1}>
            {program.conference}
          </AppText>
        </View>
      </View>

      <View style={styles.metrics}>
        <Metric label="Enrollment" value={formatEnrollment(program.enrollment)} />
        <Metric label="Acceptance" value={formatPercent(program.acceptanceRate)} />
        <Metric label="Net cost" value={formatMoney(program.estimatedNetCost)} hint={costCaption(profile, program)} />
      </View>

      <View style={styles.roster}>
        <AppText variant="caption" color={colors.ink} style={styles.rosterTitle}>
          {rosterLabel} roster
        </AppText>
        <AppText variant="headline" style={styles.rosterCount}>
          {fit.rosterSpot.count} on the roster · {fit.rosterSpot.graduating} graduating
        </AppText>
      </View>

      <View style={styles.why}>
        <AppText variant="label" color={colors.greenDark} style={styles.whyLabel}>
          Why this fits
        </AppText>
        <AppText variant="body" color={colors.ink} numberOfLines={4}>
          {fit.why}
        </AppText>
      </View>
    </View>
  );
}

function Metric({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <View style={styles.metric}>
      <AppText variant="label" style={styles.metricLabel}>
        {label}
      </AppText>
      <AppText variant="headline" style={styles.metricValue} numberOfLines={1}>
        {value}
      </AppText>
      {hint ? (
        <AppText variant="caption" numberOfLines={1}>
          {hint}
        </AppText>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    flex: 1,
    backgroundColor: colors.white,
    borderRadius: radius.xl,
    padding: 18,
    justifyContent: 'space-between',
    boxShadow: '0 16px 40px rgba(20, 40, 30, 0.12)',
  },
  top: { flexDirection: 'row', gap: 14 },
  fit: {
    width: 78,
    height: 86,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  fitLabel: { marginBottom: 0 },
  fitScore: { fontSize: 32, lineHeight: 36 },
  identity: { flex: 1, gap: 3 },
  name: { fontSize: 28, lineHeight: 32, marginTop: 4 },
  metrics: { flexDirection: 'row', gap: 8, marginTop: 16 },
  metric: {
    flex: 1,
    backgroundColor: colors.bg,
    borderRadius: radius.md,
    paddingHorizontal: 10,
    paddingVertical: 10,
    gap: 2,
  },
  metricLabel: { marginBottom: 0, fontSize: 10 },
  metricValue: { fontSize: 15, lineHeight: 20 },
  roster: {
    marginTop: 12,
    paddingVertical: 10,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: colors.line,
  },
  rosterTitle: { fontFamily: 'Outfit_600SemiBold' },
  rosterCount: { fontSize: 16, marginTop: 2 },
  why: {
    marginTop: 12,
    backgroundColor: '#F3F8E8',
    borderRadius: radius.md,
    padding: 12,
    borderLeftWidth: 4,
    borderLeftColor: colors.lime,
  },
  whyLabel: { marginBottom: 4 },
});
