import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { Image, Pressable, StyleSheet, View } from 'react-native';
import { ScrollView } from 'react-native-gesture-handler';
import { costCaption } from '../data/fitScore';
import type { FitResult } from '../data/fitScore';
import { formatEnrollment, formatMoney, formatPercent } from '../data/format';
import { instagramProfileUrl, playersFromLeagues, playersFromState, recordLine } from '../data/poster';
import { stateName } from '../data/regions';
import { leagueById, positionsInDisplayOrder } from '../data/sports';
import { POSITION_LABEL, type PlayerProfile, type Position, type Program, type RosterCount } from '../data/types';
import { openExternal } from '../lib/links';
import { colors, divisionTone, fitTone, radius } from '../theme';
import { cardPhotos, coachPortrait } from './cardPhotos';
import { FitBars } from './FitBars';
import { PhotoGallery } from './PhotoGallery';
import { AppText, Pill } from './ui';

export function ProgramCard({
  program,
  fit,
  profile,
  onGalleryChange,
}: {
  program: Program;
  fit: FitResult;
  profile: PlayerProfile;
  onGalleryChange?: (open: boolean) => void;
}) {
  const photos = cardPhotos(program.photoSet);
  const [galleryOpen, setGalleryOpen] = useState(false);
  const [whyOpen, setWhyOpen] = useState(false);
  const division = divisionTone(program.division);
  const tone = fitTone(fit.total);
  const [primary, accent] = program.colors;
  const headCoach = program.coaches[0];
  const spots = spotRows(program, profile);
  const fromHome = playersFromState(program.rosterOrigin, profile.homeState);
  const fromLeagues = playersFromLeagues(program.rosterOrigin, profile.leagues);
  const leagueLabel = leagueCaption(profile);
  const mark = monogram(program.schoolName);

  const setGallery = (open: boolean) => {
    setGalleryOpen(open);
    onGalleryChange?.(open);
  };

  return (
    <View style={styles.card} accessibilityLabel={`${program.schoolName}, fit ${fit.total}, ${program.division}`}>
      <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false} nestedScrollEnabled>
        <View style={[styles.hero, { backgroundColor: primary }]}>
          <View style={styles.crestBlock}>
            <View style={[styles.seal, { borderColor: accent }]}>
              <View style={styles.sealFace}>
                <AppText variant="title" color={primary} style={styles.sealMark}>
                  {mark}
                </AppText>
              </View>
            </View>
            <AppText variant="label" color={accent} style={styles.mascot}>
              {program.mascot}
            </AppText>
            <AppText variant="title" color="#F7F4EE" numberOfLines={2} style={styles.name}>
              {program.schoolName}
            </AppText>
            <AppText variant="caption" color="#E4EDE8" numberOfLines={1}>
              {program.city}, {program.state}
            </AppText>
          </View>
          <View style={styles.heroTop} pointerEvents="box-none">
            <View style={[styles.fit, { backgroundColor: tone.bg }]}>
              <AppText variant="label" color={tone.fg} style={styles.fitLabel}>
                Fit
              </AppText>
              <AppText variant="headline" color={tone.fg} style={styles.fitScore}>
                {fit.total}
              </AppText>
            </View>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={`Photos, ${photos.length}`}
              onPress={() => setGallery(true)}
              style={({ pressed }) => [styles.photosChip, pressed && { opacity: 0.85 }]}
            >
              <Ionicons name="camera" size={15} color={colors.ink} />
              <AppText variant="caption" color={colors.ink} style={styles.photosCount}>
                {photos.length}
              </AppText>
            </Pressable>
          </View>
        </View>

        <View style={styles.body}>
          <View style={styles.metaRow}>
            <Pill label={program.division} bg={division.bg} fg={division.fg} />
            <AppText variant="caption" numberOfLines={1} style={styles.conference}>
              {program.conference}
            </AppText>
          </View>

          <View style={styles.metrics}>
            <Metric label="Enrollment" value={formatEnrollment(program.enrollment)} />
            <Metric label="Acceptance" value={formatPercent(program.acceptanceRate)} />
            <Metric label="Net cost" value={formatMoney(program.estimatedNetCost)} hint={costCaption(profile, program)} />
          </View>

          <View style={styles.block}>
            <AppText variant="label" color={colors.ink} style={styles.blockLabel}>
              Your spot
            </AppText>
            {spots.map((spot) => (
              <SpotMeter key={spot.position} spot={spot} color={primary} />
            ))}
          </View>

          <View style={[styles.snapshot, { borderLeftColor: accent }]}>
            <View style={styles.coachRow}>
              <Image source={coachPortrait(program.coachPortrait)} style={styles.coachPhoto} />
              <View style={styles.coachCopy}>
                <AppText variant="headline" numberOfLines={1} style={styles.coachName}>
                  {headCoach?.name ?? 'Head coach'}
                </AppText>
                <AppText variant="caption" numberOfLines={1}>
                  Head coach · {program.headCoachYears} {program.headCoachYears === 1 ? 'year' : 'years'}
                </AppText>
              </View>
            </View>
            <AppText variant="caption" color={colors.ink} numberOfLines={2} style={styles.record}>
              {recordLine(program.record)} · {program.conferenceFinish} · {program.postseason}
            </AppText>
            <AppText variant="caption" numberOfLines={1}>
              {program.funFact}
            </AppText>
          </View>

          <View style={styles.block}>
            <AppText variant="label" color={colors.ink} style={styles.blockLabel}>
              Could you play here?
            </AppText>
            <View style={styles.trio}>
              <TrioStat value={String(fromHome)} label={`from ${stateName(profile.homeState)}`} />
              <TrioStat value={String(fromLeagues)} label={leagueLabel} />
              <TrioStat value={String(fit.total)} label="fit" />
            </View>
            <Pressable
              accessibilityRole="button"
              accessibilityState={{ expanded: whyOpen }}
              onPress={() => setWhyOpen((open) => !open)}
              style={styles.whyToggle}
            >
              <AppText variant="caption" color={colors.greenDark} style={styles.whyToggleText}>
                Why this fits
              </AppText>
              <Ionicons name={whyOpen ? 'chevron-up' : 'chevron-down'} size={16} color={colors.greenDark} />
            </Pressable>
            {whyOpen ? (
              <View style={styles.whyBody}>
                <AppText variant="body" color={colors.ink}>
                  {fit.why}
                </AppText>
                <FitBars factors={fit.factors} />
              </View>
            ) : null}
          </View>
        </View>
      </ScrollView>
      <View style={styles.links}>
        <Pressable
          accessibilityRole="link"
          accessibilityLabel="Athletics webpage"
          onPress={() => openExternal(program.athleticsUrl)}
          style={({ pressed }) => [styles.link, pressed && styles.linkPressed]}
        >
          <Ionicons name="globe-outline" size={14} color={colors.ink} />
          <AppText variant="caption" color={colors.ink} style={styles.linkText}>
            Athletics
          </AppText>
        </Pressable>
        <Pressable
          accessibilityRole="link"
          accessibilityLabel={`Instagram @${program.instagramHandle}`}
          onPress={() => openExternal(instagramProfileUrl(program.instagramHandle))}
          style={({ pressed }) => [styles.link, pressed && styles.linkPressed]}
        >
          <Ionicons name="logo-instagram" size={14} color={colors.ink} />
          <AppText variant="caption" color={colors.ink} numberOfLines={1} style={styles.linkText}>
            @{program.instagramHandle}
          </AppText>
        </Pressable>
      </View>
      <PhotoGallery visible={galleryOpen} photos={photos} schoolName={program.schoolName} onClose={() => setGallery(false)} />
    </View>
  );
}

function spotRows(program: Program, profile: PlayerProfile): RosterCount[] {
  const ordered = positionsInDisplayOrder(profile.positions, profile.primaryPosition);
  const rows: RosterCount[] = [];
  for (const position of ordered) {
    const spot = program.roster.find((row) => row.position === position);
    if (spot) rows.push(spot);
    if (rows.length === 2) break;
  }
  return rows;
}

function leagueCaption(profile: PlayerProfile): string {
  const names = profile.leagues.map((id) => leagueById(id)?.short ?? id);
  if (names.length === 0) return 'from your leagues';
  if (names.length === 1) return `from ${names[0]}`;
  return 'from your leagues';
}

function monogram(schoolName: string): string {
  const skip = new Set(['university', 'college', 'of', 'the', 'and']);
  const words = schoolName
    .split(/\s+/)
    .map((word) => word.replace(/[^A-Za-z]/g, ''))
    .filter((word) => word && !skip.has(word.toLowerCase()));
  if (words.length === 0) return 'CM';
  if (words.length === 1) return words[0].slice(0, 2).toUpperCase();
  return `${words[0][0]}${words[1][0]}`.toUpperCase();
}

function Metric({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <View style={styles.metric}>
      <AppText variant="label" style={styles.metricLabel}>
        {label}
      </AppText>
      <AppText variant="headline" numberOfLines={1} style={styles.metricValue}>
        {value}
      </AppText>
      {hint ? (
        <AppText variant="caption" numberOfLines={1} style={styles.metricHint}>
          {hint}
        </AppText>
      ) : null}
    </View>
  );
}

function SpotMeter({ spot, color }: { spot: RosterCount; color: string }) {
  const open = spot.count === 0 ? 0 : Math.min(1, spot.graduating / spot.count);
  return (
    <View style={styles.meter}>
      <View style={styles.meterMeta}>
        <AppText variant="caption" color={colors.ink} style={styles.meterPos}>
          {POSITION_LABEL[spot.position as Position]}
        </AppText>
        <AppText variant="caption">
          {spot.graduating} of {spot.count} graduating
        </AppText>
      </View>
      <View style={styles.track}>
        <View style={[styles.fill, { width: `${Math.round(open * 100)}%`, backgroundColor: color }]} />
      </View>
    </View>
  );
}

function TrioStat({ value, label }: { value: string; label: string }) {
  return (
    <View style={styles.trioItem}>
      <AppText variant="headline" style={styles.trioValue}>
        {value}
      </AppText>
      <AppText variant="caption" numberOfLines={2} style={styles.trioLabel}>
        {label}
      </AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    flex: 1,
    backgroundColor: colors.white,
    borderRadius: radius.xl,
    overflow: 'hidden',
    boxShadow: '0 16px 40px rgba(20, 40, 30, 0.12)',
  },
  scroll: { flex: 1 },
  scrollContent: { paddingBottom: 8 },
  hero: { minHeight: 196, paddingTop: 44, paddingBottom: 14, paddingHorizontal: 16 },
  crestBlock: { alignItems: 'center', gap: 2 },
  seal: {
    width: 92,
    height: 92,
    borderRadius: 46,
    borderWidth: 3,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 6,
  },
  sealFace: {
    width: 74,
    height: 74,
    borderRadius: 37,
    backgroundColor: '#F7F4EE',
    alignItems: 'center',
    justifyContent: 'center',
  },
  sealMark: { fontSize: 30, lineHeight: 34 },
  heroTop: {
    position: 'absolute',
    top: 12,
    left: 12,
    right: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  photosChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: '#F7F4EE',
    borderRadius: radius.pill,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  photosCount: { fontFamily: 'Outfit_700Bold', fontSize: 14, lineHeight: 18 },
  fit: {
    minWidth: 52,
    borderRadius: 16,
    paddingHorizontal: 10,
    paddingVertical: 4,
    alignItems: 'center',
  },
  fitLabel: { marginBottom: 0, fontSize: 10 },
  fitScore: { fontSize: 22, lineHeight: 26 },
  mascot: { marginBottom: 0, letterSpacing: 1.1, textTransform: 'uppercase', fontSize: 11 },
  name: { fontSize: 22, lineHeight: 26, textAlign: 'center' },
  body: { paddingHorizontal: 14, paddingTop: 10, gap: 8 },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  conference: { flex: 1 },
  metrics: { flexDirection: 'row', gap: 6 },
  metric: {
    flex: 1,
    backgroundColor: colors.bg,
    borderRadius: radius.sm,
    paddingHorizontal: 8,
    paddingVertical: 7,
    gap: 1,
  },
  metricLabel: { marginBottom: 0, fontSize: 10 },
  metricValue: { fontSize: 14, lineHeight: 18 },
  metricHint: { fontSize: 10, lineHeight: 13 },
  block: { gap: 6 },
  blockLabel: { marginBottom: 0, fontFamily: 'Outfit_700Bold' },
  meter: { gap: 3 },
  meterMeta: { flexDirection: 'row', justifyContent: 'space-between', gap: 8 },
  meterPos: { fontFamily: 'Outfit_600SemiBold' },
  track: { height: 7, borderRadius: radius.pill, backgroundColor: '#E7E4DC', overflow: 'hidden' },
  fill: { height: 7, borderRadius: radius.pill },
  snapshot: {
    borderLeftWidth: 3,
    paddingLeft: 10,
    gap: 4,
  },
  coachRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  coachPhoto: { width: 40, height: 40, borderRadius: 20, backgroundColor: colors.line },
  coachCopy: { flex: 1 },
  coachName: { fontSize: 16, lineHeight: 20 },
  record: { fontFamily: 'Outfit_600SemiBold' },
  trio: { flexDirection: 'row', gap: 6 },
  trioItem: {
    flex: 1,
    backgroundColor: '#F3F8E8',
    borderRadius: radius.sm,
    paddingHorizontal: 8,
    paddingVertical: 8,
    gap: 1,
  },
  trioValue: { fontSize: 18, lineHeight: 22 },
  trioLabel: { fontSize: 11, lineHeight: 14 },
  whyToggle: { flexDirection: 'row', alignItems: 'center', gap: 4, alignSelf: 'flex-start' },
  whyToggleText: { fontFamily: 'Outfit_700Bold' },
  whyBody: { gap: 10, paddingBottom: 2 },
  links: {
    flexDirection: 'row',
    gap: 8,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderTopWidth: 1,
    borderTopColor: colors.line,
  },
  link: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    height: 34,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: colors.white,
    paddingHorizontal: 10,
  },
  linkPressed: { backgroundColor: colors.bg },
  linkText: { fontFamily: 'Outfit_600SemiBold' },
});
