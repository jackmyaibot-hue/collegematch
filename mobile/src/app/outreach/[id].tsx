import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AppText, Button, SampleBanner } from '../../components/ui';
import { buildIntroEmail, mailtoUrl } from '../../data/email';
import { addDays, isoToday } from '../../data/format';
import { openExternal } from '../../lib/links';
import { useAppState } from '../../state/AppState';
import { colors, radius } from '../../theme';

function one(value: string | string[] | undefined): string {
  return Array.isArray(value) ? value[0] ?? '' : value ?? '';
}

export default function OutreachScreen() {
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{ id: string; coach?: string }>();
  const id = one(params.id);
  const initialCoach = one(params.coach);
  const { profile, programs, recruiting, setOutreach } = useAppState();
  const program = programs.find((item) => item.id === id);
  const saved = recruiting.saved[id];
  const [coachId, setCoachId] = useState(initialCoach || program?.coaches[0]?.id || '');
  const coach = program?.coaches.find((item) => item.id === coachId) ?? program?.coaches[0];

  const generated = useMemo(() => {
    if (!profile || !program || !coach?.email) return null;
    return buildIntroEmail(profile, program, coach);
  }, [profile, program, coach]);

  const [subject, setSubject] = useState(saved?.subject || generated?.subject || '');
  const [body, setBody] = useState(saved?.body || generated?.body || '');
  const [note, setNote] = useState<string | null>(null);
  const [usingGenerated, setUsingGenerated] = useState(!saved?.subject && !saved?.body);

  if (!profile || !program || !coach || !generated) {
    return (
      <View style={styles.missing}>
        <AppText variant="title">This intro needs a school with a published coach email.</AppText>
        <Button label="Back" onPress={() => router.back()} />
      </View>
    );
  }

  function selectCoach(nextId: string) {
    const nextCoach = program!.coaches.find((item) => item.id === nextId);
    if (!nextCoach) return;
    setCoachId(nextId);
    if (usingGenerated) {
      const email = buildIntroEmail(profile!, program!, nextCoach);
      setSubject(email.subject);
      setBody(email.body);
    }
  }

  async function send() {
    if (!coach?.email) return;
    const email = { subject: subject.trim(), body: body.trim(), to: coach.email, cc: profile!.parentEmail || null };
    if (!email.subject || !email.body) {
      setNote('Add a subject and a message before opening mail.');
      return;
    }
    const opened = await openExternal(mailtoUrl(email));
    if (saved?.status === 'replied') {
      await setOutreach(program!.id, { coachId: coach!.id, subject: email.subject, body: email.body });
    } else {
      await setOutreach(program!.id, {
        status: 'emailed',
        coachId: coach!.id,
        subject: email.subject,
        body: email.body,
        followUpDate: saved?.followUpDate ?? addDays(isoToday(), 7),
      });
    }
    setUsingGenerated(false);
    setNote(
      opened
        ? 'Opened your mail app with this draft. The school is marked emailed, with a follow-up in 7 days unless you already set one. If you closed the draft without sending, change the status on the school page.'
        : 'This phone did not open a mail app. The draft is saved on the school, and you can copy it from here.',
    );
  }

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={{ paddingTop: insets.top + 12, paddingHorizontal: 20, paddingBottom: insets.bottom + 28 }}
      keyboardShouldPersistTaps="handled"
    >
      <Pressable accessibilityRole="button" accessibilityLabel="Back" onPress={() => router.back()} hitSlop={10}>
        <Ionicons name="chevron-back" size={26} color={colors.ink} />
      </Pressable>
      <AppText variant="title" style={styles.title}>
        Intro email
      </AppText>
      <AppText variant="body">To {coach.name}, {coach.title} at {program.schoolName}.</AppText>
      <SampleBanner />
      <View style={styles.warning}>
        <AppText variant="caption" color={colors.sponsoredInk}>
          {program.sample
            ? `Sample coach address (${coach.email}). It will not reach a real person.`
            : `Published staff address (${coach.email}). Check it on the athletics site before you send.`}
        </AppText>
      </View>
      <AppText variant="label">Coach</AppText>
      <View style={styles.wrap}>
        {program.coaches.map((item) => (
          <Pressable
            key={item.id}
            onPress={() => selectCoach(item.id)}
            style={[styles.chip, item.id === coach.id && styles.chipOn]}
          >
            <AppText variant="caption" color={item.id === coach.id ? '#F4F1EA' : colors.ink} style={styles.chipText}>
              {item.name}
            </AppText>
          </Pressable>
        ))}
      </View>
      <AppText variant="label">Subject</AppText>
      <TextInput
        value={subject}
        onChangeText={(value) => {
          setUsingGenerated(false);
          setSubject(value);
        }}
        style={styles.input}
      />
      <AppText variant="label">Message</AppText>
      <TextInput
        value={body}
        onChangeText={(value) => {
          setUsingGenerated(false);
          setBody(value);
        }}
        multiline
        style={[styles.input, styles.message]}
      />
      {profile.parentEmail ? (
        <AppText variant="caption">Your parent ({profile.parentEmail}) will be copied.</AppText>
      ) : (
        <AppText variant="caption">No parent email on the profile, so nobody is copied.</AppText>
      )}
      {note ? <AppText variant="body">{note}</AppText> : null}
      <Button label="Open in mail" icon="mail-outline" onPress={send} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  missing: { flex: 1, backgroundColor: colors.bg, justifyContent: 'center', padding: 24, gap: 16 },
  title: { marginTop: 8 },
  warning: {
    backgroundColor: colors.amberSoft,
    borderRadius: radius.md,
    padding: 12,
    marginTop: 8,
  },
  wrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: {
    borderRadius: radius.pill,
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.line,
  },
  chipOn: { backgroundColor: colors.greenDark, borderColor: colors.greenDark },
  chipText: { fontFamily: 'Outfit_600SemiBold' },
  input: {
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
  message: { minHeight: 240, textAlignVertical: 'top' },
});
