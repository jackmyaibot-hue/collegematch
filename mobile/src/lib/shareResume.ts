import { File as ExpoFile, Paths } from 'expo-file-system';
import { isAvailableAsync, shareAsync } from 'expo-sharing';
import { Platform } from 'react-native';
import { buildResumePdf, resumeFileName } from '../data/resumePdf';
import type { PlayerProfile } from '../data/types';

/** Builds the one-page CV on this device and hands it to the share sheet or a download. */
export async function shareResume(profile: PlayerProfile): Promise<void> {
  const bytes = await buildResumePdf(profile);
  const filename = resumeFileName(profile);
  if (Platform.OS === 'web') {
    await shareOnWeb(bytes, filename);
    return;
  }
  const file = new ExpoFile(Paths.cache, filename);
  file.write(bytes);
  if (await isAvailableAsync()) {
    await shareAsync(file.uri, {
      mimeType: 'application/pdf',
      UTI: 'com.adobe.pdf',
      dialogTitle: 'Athletic resume',
    });
  }
}

async function shareOnWeb(bytes: Uint8Array, filename: string): Promise<void> {
  const blob = new Blob([bytesToBuffer(bytes)], { type: 'application/pdf' });
  const file = new globalThis.File([blob], filename, { type: 'application/pdf' });
  const nav = navigator as Navigator & { canShare?: (data: ShareData) => boolean };
  if (typeof nav.share === 'function' && nav.canShare?.({ files: [file] })) {
    try {
      await nav.share({ files: [file], title: 'Athletic resume' });
      return;
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') return;
    }
  }
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  anchor.rel = 'noopener';
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1500);
}

function bytesToBuffer(bytes: Uint8Array): ArrayBuffer {
  const copy = new Uint8Array(bytes.byteLength);
  copy.set(bytes);
  return copy.buffer;
}
