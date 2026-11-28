import { useEffect, useState } from 'react';
import { ActivityIndicator, Image, Platform, Pressable, StyleSheet, View } from 'react-native';
import { AppText, Button } from './ui';
import { loadLocalPhoto, loadBioStatus, publishProfile, saveLocalPhoto, unpublishProfile, type BioStatus } from '../data/publishClient';
import { pickProfilePhoto } from '../data/pickPhoto';
import type { BioPhoto } from '../data/photo';
import { shareLink } from '../lib/shareLink';
import type { PlayerProfile, Program, RecruitingState } from '../data/types';
import { colors, radius } from '../theme';

export function PublishBio({
  profile,
  recruiting,
  programs,
}: {
  profile: PlayerProfile;
  recruiting: RecruitingState;
  programs: Program[];
}) {
  const [photo, setPhoto] = useState<BioPhoto | null>(null);
  const [status, setStatus] = useState<BioStatus | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [note, setNote] = useState<string | null>(null);
  const [confirmDown, setConfirmDown] = useState(false);

  useEffect(() => {
    let cancelled = false;
    loadLocalPhoto(profile.id)
      .then((stored) => {
        if (!cancelled) setPhoto(stored);
      })
      .catch(() => undefined);
    loadBioStatus(profile.id)
      .then((next) => {
        if (!cancelled) setStatus(next);
      })
      .catch((caught: unknown) => {
        if (cancelled) return;
        setStatus({ state: 'none', publicUrl: null, expiresAt: null, mockApprovalUrl: null });
        setError(caught instanceof Error ? caught.message : 'The bio status could not be loaded.');
      });
    return () => {
      cancelled = true;
    };
  }, [profile.id]);

  const saved = Object.keys(recruiting.saved).length;

  async function choosePhoto() {
    setError(null);
    try {
      const next = await pickProfilePhoto();
      if (!next) return;
      setPhoto(next);
      await saveLocalPhoto(profile.id, next);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'That photo could not be added.');
    }
  }

  async function clearPhoto() {
    setPhoto(null);
    await saveLocalPhoto(profile.id, null);
  }

  async function publish() {
    setBusy(true);
    setError(null);
    setNote(null);
    setConfirmDown(false);
    try {
      const next = await publishProfile(profile, recruiting, programs, photo);
      setStatus(next);
      setNote(
        next.mockApprovalUrl
          ? 'No email was sent. The mock sender logged the link, and it is below for the parent preview.'
          : 'A one-time approval email was sent. The page stays private until they approve.',
      );
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Publish did not go through.');
    } finally {
      setBusy(false);
    }
  }

  async function unpublish() {
    if (!confirmDown) {
      setConfirmDown(true);
      return;
    }
    setBusy(true);
    setError(null);
    setNote(null);
    try {
      await unpublishProfile(profile.id);
      setStatus({ state: 'none', publicUrl: null, expiresAt: null, mockApprovalUrl: null });
      setNote('The page and photo were deleted from the server.');
      setConfirmDown(false);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Unpublish did not go through.');
      setConfirmDown(false);
    } finally {
      setBusy(false);
    }
  }

  async function share() {
    if (!status?.publicUrl) return;
    setError(null);
    const result = await shareLink(status.publicUrl, `${profile.name} · CollegeMatch`);
    if (result === 'copied') setNote('Link copied.');
    else if (result === 'shared') setNote('Opened the share sheet.');
    else setNote('The link is on this page if the share sheet did not open.');
  }

  async function copyMock() {
    if (!status?.mockApprovalUrl) return;
    const result = await shareLink(status.mockApprovalUrl, 'Parent approval link');
    setNote(result === 'copied' ? 'Approval link copied.' : 'Open the approval link from the share sheet, or copy it from the text above.');
  }

  const publishLabel =
    status?.state === 'approved' ? 'Update and ask again' : status?.state === 'pending' ? 'Send a new approval email' : 'Publish bio';

  return (
    <View style={styles.card}>
      <AppText variant="headline">Recruiting bio</AppText>
      <AppText variant="caption">
        Publish a page with your photo, position, class year, stats, and the {saved === 1 ? 'college' : 'colleges'} you are
        watching. Your parent at {profile.parentEmail || 'the email on this profile'} gets one email. Nothing is public until
        they approve. Only you can take it down.
      </AppText>
      <Pressable accessibilityRole="button" onPress={choosePhoto} style={styles.photoButton}>
        {photo ? (
          <Image source={{ uri: `data:${photo.contentType};base64,${photo.data}` }} style={styles.photo} />
        ) : (
          <View style={styles.photoEmpty}>
            <AppText variant="headline">Add a photo</AppText>
            <AppText variant="caption">Optional. JPEG, PNG, or WebP under 500KB.</AppText>
          </View>
        )}
      </Pressable>
      {photo ? (
        <Button label="Remove photo" kind="ghost" onPress={() => clearPhoto().catch(() => undefined)} />
      ) : null}
      {status?.state === 'pending' ? (
        <AppText variant="body">Waiting for a parent to approve. The public link shows nothing until then.</AppText>
      ) : null}
      {status?.state === 'approved' && status.publicUrl ? (
        <View style={styles.linkBlock}>
          <AppText variant="body">This page is public for anyone with the link.</AppText>
          <AppText variant="caption" style={styles.link}>
            {status.publicUrl}
          </AppText>
          <Button label="Share" icon="share-outline" onPress={() => share().catch(() => undefined)} />
        </View>
      ) : null}
      {status?.mockApprovalUrl ? (
        <View style={styles.linkBlock}>
          <AppText variant="caption">One-time parent link</AppText>
          <AppText variant="caption" style={styles.link}>
            {status.mockApprovalUrl}
          </AppText>
          <Button label="Copy approval link" kind="ghost" onPress={() => copyMock().catch(() => undefined)} />
        </View>
      ) : null}
      {status?.state === 'approved' ? (
        <AppText variant="caption">Updating hides the page until your parent approves the new version.</AppText>
      ) : null}
      {!profile.parentEmail ? (
        <AppText variant="caption" color={colors.rose}>
          Add a parent email in Edit profile before publishing.
        </AppText>
      ) : (
        <Button label={busy ? 'Working…' : publishLabel} onPress={publish} disabled={busy || !status} />
      )}
      {status && status.state !== 'none' ? (
        <Button
          label={confirmDown ? 'Tap again to unpublish' : 'Unpublish and delete the photo'}
          kind="danger"
          onPress={unpublish}
          disabled={busy}
        />
      ) : null}
      {busy ? <ActivityIndicator color={colors.greenDark} /> : null}
      {note ? <AppText variant="caption">{note}</AppText> : null}
      {error ? (
        <AppText variant="caption" color={colors.rose}>
          {error}
        </AppText>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.white,
    borderRadius: radius.lg,
    padding: 16,
    gap: 12,
    marginTop: 8,
  },
  photoButton: { borderRadius: radius.md, overflow: 'hidden' },
  photo: { width: '100%', height: 280, backgroundColor: colors.line },
  photoEmpty: {
    height: 140,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.line,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    padding: 16,
  },
  linkBlock: { gap: 8 },
  link: { color: colors.ink, ...Platform.select({ web: { wordBreak: 'break-all' }, default: {} }) },
});
