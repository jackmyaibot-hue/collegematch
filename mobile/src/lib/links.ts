import { Linking, Platform } from 'react-native';

/**
 * Opens a link from a tap.
 * Mail and phone links on the web must change location.href in the same turn
 * as the tap. Linking.openURL waits, then calls window.open, and iPhone Safari
 * blocks that or leaves a blank tab.
 */
export function openExternal(url: string): Promise<boolean> {
  if (Platform.OS === 'web') {
    try {
      return Promise.resolve(openInBrowser(url));
    } catch {
      return Promise.resolve(false);
    }
  }
  return Linking.openURL(url).then(
    () => true,
    () => false,
  );
}

function openInBrowser(url: string): boolean {
  if (typeof window === 'undefined') return false;
  if (url.startsWith('mailto:') || url.startsWith('tel:')) {
    window.location.href = url;
    return true;
  }
  const popup = window.open(url, '_blank', 'noopener,noreferrer');
  return popup != null;
}

/** Copies text from the tap. The web clipboard is what phone browsers can use. */
export function copyText(value: string): Promise<boolean> {
  if (Platform.OS !== 'web' || typeof document === 'undefined') return Promise.resolve(false);
  // The textarea copy has to run in the tap. The async clipboard API often
  // rejects on iPhone Safari, and a fallback after that is too late.
  const legacy = copyWithTextarea(value);
  const clipboard = typeof navigator !== 'undefined' ? navigator.clipboard : undefined;
  if (!clipboard?.writeText) return Promise.resolve(legacy);
  return clipboard.writeText(value).then(
    () => true,
    () => legacy,
  );
}

function copyWithTextarea(value: string): boolean {
  try {
    const area = document.createElement('textarea');
    area.value = value;
    area.setAttribute('readonly', '');
    area.style.position = 'fixed';
    area.style.top = '0';
    area.style.left = '0';
    area.style.opacity = '0';
    document.body.appendChild(area);
    area.focus();
    area.select();
    area.setSelectionRange(0, area.value.length);
    const copied = document.execCommand('copy');
    document.body.removeChild(area);
    return copied;
  } catch {
    return false;
  }
}
