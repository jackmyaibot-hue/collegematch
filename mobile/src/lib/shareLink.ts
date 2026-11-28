import { Platform, Share } from 'react-native';
import { copyText } from './links';

export type ShareResult = 'shared' | 'copied' | 'dismissed';

/** Native share sheet. On the web, the browser share sheet, then a copy. */
export async function shareLink(url: string, title: string): Promise<ShareResult> {
  if (Platform.OS === 'web') {
    const nav = typeof navigator !== 'undefined' ? navigator : undefined;
    if (nav && typeof nav.share === 'function') {
      try {
        await nav.share({ title, url });
        return 'shared';
      } catch (error) {
        if (error instanceof Error && error.name === 'AbortError') return 'dismissed';
      }
    }
    return (await copyText(url)) ? 'copied' : 'dismissed';
  }
  try {
    const result = await Share.share(
      Platform.OS === 'ios' ? { url, title } : { message: url, title },
    );
    if (result.action === Share.dismissedAction) return 'dismissed';
    return 'shared';
  } catch {
    return 'dismissed';
  }
}
