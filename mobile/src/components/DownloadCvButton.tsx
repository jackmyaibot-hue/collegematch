import { useState } from 'react';
import { AppText, Button } from './ui';
import { shareResume } from '../lib/shareResume';
import { useAppState } from '../state/AppState';

export function DownloadCvButton() {
  const { profile } = useAppState();
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState<string | null>(null);

  async function download() {
    if (!profile || busy) return;
    setBusy(true);
    setNote(null);
    try {
      await shareResume(profile);
      setNote('Your CV stayed on this device. Save or share the PDF from there.');
    } catch {
      setNote('Could not create the CV. Try again.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <Button
        label={busy ? 'Preparing CV…' : 'Download my CV'}
        kind="ghost"
        icon="download-outline"
        disabled={busy || !profile}
        onPress={download}
      />
      {note ? <AppText variant="caption">{note}</AppText> : null}
    </>
  );
}
