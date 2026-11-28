import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { Image, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AppText, Button, Chip, TextField } from '../components/ui';
import { loadLocalPhoto } from '../data/publishClient';
import type { BioPhoto } from '../data/photo';
import {
  featuredLeague,
  leagueBadge,
  matchSchool,
  socialCard,
  SOCIAL_STAMPS,
  type SocialNameStyle,
  type SocialStampId,
} from '../data/socialCard';
import { sportSetup } from '../data/sports';
import type { LeagueId } from '../data/types';
import { preparePlayerPhoto, type PreparedPhoto } from '../lib/cutoutPhoto';
import { FEED_SIZE, renderSocialPng, shareSocialPng, STORY_SIZE, type SocialSize } from '../lib/socialImage';
import { useAppState } from '../state/AppState';
import { colors, radius } from '../theme';

export default function SocialScreen() {
  const insets = useSafeAreaInsets();
  const { profile, programs } = useAppState();
  const [photo, setPhoto] = useState<BioPhoto | null>(null);
  const [prepared, setPrepared] = useState<PreparedPhoto | null>(null);
  const [photoNote, setPhotoNote] = useState<string | null>(null);
  const [nameStyle, setNameStyle] = useState<SocialNameStyle>('first');
  const [includeGpa, setIncludeGpa] = useState(false);
  const [stamp, setStamp] = useState<SocialStampId | null>(null);
  const [schoolText, setSchoolText] = useState('');
  const [leagueId, setLeagueId] = useState<LeagueId | null>(profile ? featuredLeague(profile.leagues) : null);
  const [story, setStory] = useState<string | null>(null);
  const [feed, setFeed] = useState<string | null>(null);
  const [busy, setBusy] = useState<'story' | 'feed' | null>(null);
  const [note, setNote] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!profile) return;
    let cancelled = false;
    loadLocalPhoto(profile.id)
      .then((stored) => {
        if (!cancelled) setPhoto(stored);
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, [profile]);

  useEffect(() => {
    if (!profile) return;
    setLeagueId(featuredLeague(profile.leagues));
  }, [profile]);

  useEffect(() => {
    let cancelled = false;
    if (!photo || typeof Image === 'undefined') {
      setPrepared({ image: null, cutout: false });
      setPhotoNote(null);
      return;
    }
    const preview = new window.Image();
    preview.onload = () => {
      if (!cancelled) {
        setPrepared({ image: preview, cutout: false });
        setPhotoNote('Removing the background…');
      }
    };
    preview.onerror = () => {
      if (!cancelled) setPrepared({ image: null, cutout: false });
    };
    preview.src = `data:${photo.contentType};base64,${photo.data}`;
    preparePlayerPhoto(photo, (message) => {
      if (!cancelled) setPhotoNote(message);
    })
      .then((result) => {
        if (cancelled) return;
        setPrepared(result);
        setPhotoNote(result.cutout ? 'Background removed. It stays on this phone.' : 'Photo framed on the card.');
      })
      .catch(() => {
        if (!cancelled) setPhotoNote('Photo framed on the card.');
      });
    return () => {
      cancelled = true;
    };
  }, [photo]);

  const school = matchSchool(schoolText, programs);
  const card = profile
    ? socialCard(profile, {
        nameStyle,
        includeGpa,
        stamp,
        schoolName: school.name,
        schoolColors: school.colors,
        leagueId,
      })
    : null;

  useEffect(() => {
    if (!profile || !card || !prepared) return;
    let cancelled = false;
    void (async () => {
      try {
        const [storyBytes, feedBytes] = await Promise.all([
          renderSocialPng(card, prepared, STORY_SIZE),
          renderSocialPng(card, prepared, FEED_SIZE),
        ]);
        if (cancelled) return;
        setStory((current) => replaceUrl(current, storyBytes));
        setFeed((current) => replaceUrl(current, feedBytes));
        setError(null);
      } catch (caught) {
        if (!cancelled) setError(caught instanceof Error ? caught.message : 'Could not draw the image.');
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [profile, prepared, card?.name, card?.stamp, card?.schoolName, card?.schoolColors?.[0], card?.league?.id, card?.gpa, nameStyle, includeGpa]);

  if (!profile || !card) return null;
  const needsLeague = profile.leagues.length === 0;
  const leagueChoices = needsLeague ? sportSetup(profile.sport).leagues.map((league) => league.id) : profile.leagues;
  const wantsSchool = stamp === 'committed' || stamp === 'signed';

  async function save(size: SocialSize, preview: string | null) {
    if (!preview || busy || !prepared) return;
    setBusy(size.file);
    setNote(null);
    try {
      const bytes = await renderSocialPng(card!, prepared, size);
      const result = await shareSocialPng(bytes, `${card!.name.replace(/\s+/g, '-').toLowerCase()}-${size.file}.png`);
      setNote(result === 'downloaded' ? 'Image downloaded.' : 'Share sheet opened.');
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Could not save the image.');
    } finally {
      setBusy(null);
    }
  }

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={{ paddingTop: insets.top + 12, paddingHorizontal: 20, paddingBottom: insets.bottom + 28 }}
    >
      <Pressable accessibilityRole="button" accessibilityLabel="Back" onPress={() => router.back()} hitSlop={12}>
        <Ionicons name="chevron-back" size={26} color={colors.ink} />
      </Pressable>
      <AppText variant="title" style={styles.title}>
        Social Profile
      </AppText>
      <AppText variant="body">A picture you can post yourself. It does not need a parent's approval.</AppText>
      <View style={styles.note}>
        <AppText variant="caption">
          This stays on your phone until you save or share it. It shows your first name, photo, sport, position, class
          year, club, league, and a couple of stats. It leaves out your email, phone, parent contact, NCAA ID, address,
          and school list. A school name is added only if you type one on a Committed or Signed stamp. GPA is included
          only if you turn it on. The link opens CollegeMatch, not your private bio.
        </AppText>
      </View>
      <AppText variant="label">Name on the image</AppText>
      <View style={styles.row}>
        <Chip label="First name" selected={nameStyle === 'first'} onPress={() => setNameStyle('first')} />
        <Chip label="First and last initial" selected={nameStyle === 'initial'} onPress={() => setNameStyle('initial')} />
      </View>
      <Chip label={includeGpa ? 'GPA is on' : 'GPA is off'} selected={includeGpa} onPress={() => setIncludeGpa((value) => !value)} />
      <AppText variant="label" style={styles.section}>
        Status stamp
      </AppText>
      <View style={styles.row}>
        <Chip label="None" selected={stamp == null} onPress={() => setStamp(null)} />
        {SOCIAL_STAMPS.map((item) => (
          <Chip key={item.id} label={item.label} selected={stamp === item.id} onPress={() => setStamp(item.id)} />
        ))}
      </View>
      {wantsSchool ? (
        <TextField
          label="School name"
          value={schoolText}
          onChangeText={setSchoolText}
          placeholder="Optional"
          autoCapitalize="words"
          hint="Optional. If this matches a program in the app, the stamp uses that school's colors."
        />
      ) : null}
      <AppText variant="label" style={styles.section}>
        Team level
      </AppText>
      {needsLeague ? (
        <AppText variant="caption" style={styles.help}>
          Pick the league for the badge. Your club name sits next to it.
        </AppText>
      ) : (
        <AppText variant="caption" style={styles.help}>
          {card.league ? `${card.league.badge} is on the card, next to ${card.club || 'your club'}.` : 'Pick a league for the badge.'}
        </AppText>
      )}
      <View style={styles.row}>
        {leagueChoices.map((id) => (
          <Chip key={id} label={leagueBadge(id)} selected={leagueId === id} onPress={() => setLeagueId(id)} />
        ))}
      </View>
      <Preview
        label="Story and TikTok · 1080×1920"
        uri={story}
        ratio={1080 / 1920}
        waiting={photoNote && !story ? photoNote : !story ? 'Drawing your card…' : null}
      />
      <Button
        label={busy === 'story' ? 'Preparing…' : 'Share story image'}
        onPress={() => save(STORY_SIZE, story)}
        disabled={!story || busy != null}
      />
      <Preview
        label="Feed post · 1080×1350"
        uri={feed}
        ratio={1080 / 1350}
        waiting={photoNote && !feed ? photoNote : !feed ? 'Drawing your card…' : null}
      />
      <Button
        label={busy === 'feed' ? 'Preparing…' : 'Share feed image'}
        kind="ghost"
        onPress={() => save(FEED_SIZE, feed)}
        disabled={!feed || busy != null}
      />
      {photoNote && story ? <AppText variant="caption">{photoNote}</AppText> : null}
      {note ? <AppText variant="caption">{note}</AppText> : null}
      {error ? (
        <AppText variant="caption" color={colors.rose}>
          {error}
        </AppText>
      ) : null}
    </ScrollView>
  );
}

function replaceUrl(current: string | null, bytes: Uint8Array): string {
  if (current) URL.revokeObjectURL(current);
  const copy = new ArrayBuffer(bytes.byteLength);
  new Uint8Array(copy).set(bytes);
  return URL.createObjectURL(new Blob([copy], { type: 'image/png' }));
}

function Preview({ label, uri, ratio, waiting }: { label: string; uri: string | null; ratio: number; waiting: string | null }) {
  return (
    <View style={styles.preview}>
      <AppText variant="caption">{label}</AppText>
      {uri ? (
        <Image source={{ uri }} style={[styles.image, { aspectRatio: ratio }]} />
      ) : (
        <View style={[styles.image, styles.waiting, { aspectRatio: ratio }]}>
          <AppText variant="caption" color="#F4F1EA">
            {waiting}
          </AppText>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  title: { marginTop: 8, marginBottom: 8 },
  note: { backgroundColor: colors.white, borderRadius: radius.md, padding: 14, marginVertical: 14 },
  section: { marginTop: 16 },
  help: { marginTop: 6, marginBottom: 8 },
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 8, marginBottom: 8 },
  preview: { marginTop: 16, gap: 8 },
  image: { width: '78%', maxWidth: 320, backgroundColor: colors.greenDark, borderRadius: radius.md },
  waiting: { alignItems: 'center', justifyContent: 'center', padding: 16 },
});
