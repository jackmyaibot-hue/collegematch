import { StyleSheet, View } from 'react-native';
import { AppText } from './ui';

const GOLD = '#F0D48A';

function channel(hex: string, shift: number): number {
  return parseInt(hex.slice(shift, shift + 2), 16) / 255;
}

function luminance(hex: string): number {
  const color = hex.replace('#', '');
  const convert = (value: number) => (value <= 0.03928 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4);
  return 0.2126 * convert(channel(color, 0)) + 0.7152 * convert(channel(color, 2)) + 0.0722 * convert(channel(color, 4));
}

function contrast(foreground: string, background: string): number {
  const lighter = Math.max(luminance(foreground), luminance(background));
  const darker = Math.min(luminance(foreground), luminance(background));
  return (lighter + 0.05) / (darker + 0.05);
}

export function RankBadge({
  rank,
  accent,
  background,
  colorsVerified,
  align = 'center',
}: {
  rank: number;
  accent?: string | null;
  background: string;
  colorsVerified?: boolean;
  align?: 'center' | 'flex-start';
}) {
  const schoolColor = colorsVerified && accent && /^#[0-9A-Fa-f]{6}$/.test(accent) && /^#[0-9A-Fa-f]{6}$/.test(background);
  const ink = schoolColor && contrast(accent, background) >= 3 ? accent : GOLD;
  return (
    <View
      style={[styles.badge, { borderColor: ink, alignSelf: align }]}
      accessibilityRole="text"
      accessibilityLabel={`Ranked number ${rank} nationally`}
    >
      <AppText variant="label" color={ink} style={styles.text}>
        #{rank} Nationally
      </AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    alignSelf: 'center',
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 1,
  },
  text: { fontSize: 11, lineHeight: 15, letterSpacing: 0.2 },
});
