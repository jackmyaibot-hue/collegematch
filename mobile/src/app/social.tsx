import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { Image, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AppText, Button } from '../components/ui';
import { loadLocalPhoto } from '../data/publishClient';
import type { BioPhoto } from '../data/photo';
import { socialCard, type SocialNameStyle } from '../data/socialCard';
import { FEED_SIZE, renderSocialPng, shareSocialPng, STORY_SIZE, type SocialSize } from '../lib/socialImage';
import { useAppState } from '../state/AppState';
import { colors, radius } from '../theme';

export default function SocialScreen() {
  const insets = useSafeAreaInsets();
  const { profile } = useAppState();
  const [photo, setPhoto] = useState<BioPhoto | null>(null);
  const [nameStyle, setNameStyle] = useState<SocialNameStyle>('first');
  const [includeGpa, setIncludeGpa] = useState(false);
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
    let cancelled = false;
    const card = socialCard(profile, { nameStyle, includeGpa });
    void (async () => {
      try {
        const [storyBytes, feedBytes] = await Promise.all([
          renderSocialPng(card, photo, STORY_SIZE),
          renderSocialPng(card, photo, FEED_SIZE),
        ]);
        if (cancelled) return;
        setStory(urlFor(storyBytes));
        setFeed(urlFor(feedBytes));
        setError(null);
      } catch (caught) {
        if (!cancelled) setError(caught instanceof Error ? caught.message : 'Could not draw the image.');
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [profile, photo, nameStyle, includeGpa]);

  if (!profile) return null;
  const card = socialCard(profile, { nameStyle, includeGpa });

  async function save(size: SocialSize, preview: string | null) {
    if (!preview || busy) return;
    setBusy(size.file);
    setNote(null);
    try {
      const bytes = await renderSocialPng(card, photo, size);
      const result = await shareSocialPng(bytes, `${card.name.replace(/\s+/g, '-').toLowerCase()}-${size.file}.png`);
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
      <AppText variant="body">
        A picture you can post yourself. It does not need a parent's approval.
      </AppText>
      <View style={styles.note}>
        <AppText variant="caption">
          This stays on your phone until you save or share it. It shows your first name, photo, sport, position, class
          year, club, and a couple of stats. It leaves out your email, phone, parent contact, NCAA ID, address, and
          school list. GPA is included only if you turn it on. The link opens CollegeMatch, not your private bio.
        </AppText>
      </View>
      <AppText variant="label">Name on the image</AppText>
      <View style={styles.row}>
        <Choice label="First name" selected={nameStyle === 'first'} onPress={() => setNameStyle('first')} />
        <Choice label="First and last initial" selected={nameStyle === 'initial'} onPress={() => setNameStyle('initial')} />
      </View>
      <Choice label={includeGpa ? 'GPA is on' : 'GPA is off'} selected={includeGpa} onPress={() => setIncludeGpa((value) => !value)} />
      <Preview label="Story and TikTok · 1080×1920" uri={story} ratio={1080 / 1920} />
      <Button
        label={busy === 'story' ? 'Preparing…' : 'Share story image'}
        onPress={() => save(STORY_SIZE, story)}
        disabled={!story || busy != null}
      />
      <Preview label="Feed post · 1080×1350" uri={feed} ratio={1080 / 1350} />
      <Button
        label={busy === 'feed' ? 'Preparing…' : 'Share feed image'}
        kind="ghost"
        onPress={() => save(FEED_SIZE, feed)}
        disabled={!feed || busy != null}
      />
      {note ? <AppText variant="caption">{note}</AppText> : null}
      {error ? (
        <AppText variant="caption" color={colors.rose}>
          {error}
        </AppText>
      ) : null}
    </ScrollView>
  );
}

function urlFor(bytes: Uint8Array): string {
  const copy = new ArrayBuffer(bytes.byteLength);
  new Uint8Array(copy).set(bytes);
  return URL.createObjectURL(new Blob([copy], { type: 'image/png' }));
}

function Choice({ label, selected, onPress }: { label: string; selected: boolean; onPress: () => void }) {
  return (
    <Pressable accessibilityRole="button" onPress={onPress} style={[styles.choice, selected && styles.choiceOn]}>
      <AppText variant="headline" color={selected ? '#F4F1EA' : colors.ink}>
        {label}
      </AppText>
    </Pressable>
  );
}

function Preview({ label, uri, ratio }: { label: string; uri: string | null; ratio: number }) {
  return (
    <View style={styles.preview}>
      <AppText variant="caption">{label}</AppText>
      {uri ? <Image source={{ uri }} style={[styles.image, { aspectRatio: ratio }]} /> : <View style={[styles.image, { aspectRatio: ratio }]} />}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  title: { marginTop: 8, marginBottom: 8 },
  note: { backgroundColor: colors.white, borderRadius: radius.md, padding: 14, marginVertical: 14 },
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 8, marginBottom: 8 },
  choice: {
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: colors.white,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  choiceOn: { backgroundColor: colors.greenDark, borderColor: colors.greenDark },
  preview: { marginTop: 16, gap: 8 },
  image: { width: '70%', maxWidth: 280, backgroundColor: colors.greenDark, borderRadius: radius.md },
});
