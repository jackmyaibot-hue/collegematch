import { Ionicons } from '@expo/vector-icons';
import { ReactNode } from 'react';
import {
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TextInputProps,
  View,
  ViewStyle,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { SAMPLE_LINE } from '../copy';
import { STATUS_LABEL, type OutreachStatus } from '../data/types';
import { colors, radius, statusTone } from '../theme';

type TextVariant = 'display' | 'displayItalic' | 'title' | 'headline' | 'body' | 'label' | 'caption';

export function AppText({
  variant = 'body',
  color,
  style,
  children,
  numberOfLines,
}: {
  variant?: TextVariant;
  color?: string;
  style?: object;
  children: ReactNode;
  numberOfLines?: number;
}) {
  return (
    <Text numberOfLines={numberOfLines} style={[styles[variant], color ? { color } : null, style]}>
      {children}
    </Text>
  );
}

export function Screen({
  children,
  dark = false,
  scroll = false,
  footer,
  padded = true,
}: {
  children: ReactNode;
  dark?: boolean;
  scroll?: boolean;
  footer?: ReactNode;
  padded?: boolean;
}) {
  const insets = useSafeAreaInsets();
  const backgroundColor = dark ? colors.greenDark : colors.bg;
  const contentStyle = {
    paddingHorizontal: padded ? 20 : 0,
    paddingTop: padded ? insets.top + 12 : 0,
    paddingBottom: footer ? 12 : insets.bottom + 28,
  };
  return (
    <View style={[styles.screen, { backgroundColor }]}>
      {scroll ? (
        <ScrollView
          style={styles.flex}
          contentContainerStyle={contentStyle}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {children}
        </ScrollView>
      ) : (
        <View style={[styles.flex, padded ? contentStyle : null]}>{children}</View>
      )}
      {footer ? (
        <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom, 12) }]}>{footer}</View>
      ) : null}
    </View>
  );
}

export function Button({
  label,
  onPress,
  kind = 'primary',
  icon,
  disabled = false,
}: {
  label: string;
  onPress: () => void;
  kind?: 'primary' | 'lime' | 'ghost' | 'danger';
  icon?: keyof typeof Ionicons.glyphMap;
  disabled?: boolean;
}) {
  const palette = {
    primary: { bg: colors.greenDark, fg: '#F4F1EA' },
    lime: { bg: colors.lime, fg: colors.ink },
    ghost: { bg: 'transparent', fg: colors.ink },
    danger: { bg: colors.roseSoft, fg: colors.rose },
  }[kind];
  return (
    <Pressable
      accessibilityRole="button"
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.button,
        { backgroundColor: palette.bg, opacity: disabled ? 0.45 : pressed ? 0.86 : 1 },
        kind === 'ghost' && styles.ghostButton,
      ]}
    >
      {icon ? <Ionicons name={icon} size={18} color={palette.fg} /> : null}
      <AppText variant="headline" color={palette.fg} style={styles.buttonLabel}>
        {label}
      </AppText>
    </Pressable>
  );
}

export function Chip({
  label,
  selected,
  onPress,
}: {
  label: string;
  selected: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected }}
      onPress={onPress}
      style={[styles.chip, selected && styles.chipOn]}
    >
      <AppText variant="caption" color={selected ? '#F4F1EA' : colors.ink} style={styles.chipText}>
        {label}
      </AppText>
    </Pressable>
  );
}

export function TextField({
  label,
  error,
  hint,
  ...input
}: {
  label: string;
  error?: string;
  hint?: string;
} & TextInputProps) {
  return (
    <View style={styles.field}>
      <AppText variant="label">{label}</AppText>
      <TextInput
        placeholderTextColor={colors.muted}
        {...input}
        style={[
          styles.input,
          input.multiline && styles.inputMulti,
          error ? styles.inputError : null,
          input.style,
          Platform.OS === 'web' ? styles.webInput : null,
        ]}
      />
      {error ? (
        <AppText variant="caption" color={colors.rose}>
          {error}
        </AppText>
      ) : hint ? (
        <AppText variant="caption">{hint}</AppText>
      ) : null}
    </View>
  );
}

export function Pill({ label, bg, fg }: { label: string; bg: string; fg: string }) {
  return (
    <View style={[styles.pill, { backgroundColor: bg }]}>
      <AppText variant="caption" color={fg} style={styles.chipText}>
        {label}
      </AppText>
    </View>
  );
}

export function StatusPill({ status }: { status: OutreachStatus }) {
  const tone = statusTone(status);
  return <Pill label={STATUS_LABEL[status]} bg={tone.bg} fg={tone.fg} />;
}

export function SampleBanner({ light = false }: { light?: boolean }) {
  return (
    <View style={[styles.banner, light && styles.bannerLight]}>
      <AppText variant="caption" color={light ? '#E7F3EC' : colors.sponsoredInk}>
        {SAMPLE_LINE}
      </AppText>
    </View>
  );
}

export function ProgressBar({ value }: { value: number }) {
  return (
    <View style={styles.track}>
      <View style={[styles.trackFill, { width: `${Math.round(value * 100)}%` }]} />
    </View>
  );
}

export function Card({ children, style }: { children: ReactNode; style?: ViewStyle }) {
  return <View style={[styles.card, style]}>{children}</View>;
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  screen: { flex: 1 },
  footer: {
    paddingHorizontal: 20,
    paddingTop: 8,
    backgroundColor: colors.bg,
  },
  display: {
    fontFamily: 'Fraunces_700Bold',
    fontSize: 42,
    lineHeight: 48,
    color: colors.ink,
  },
  displayItalic: {
    fontFamily: 'Fraunces_700Bold_Italic',
    fontSize: 42,
    lineHeight: 48,
    color: colors.ink,
  },
  title: {
    fontFamily: 'Fraunces_700Bold',
    fontSize: 32,
    lineHeight: 38,
    color: colors.ink,
  },
  headline: {
    fontFamily: 'Outfit_700Bold',
    fontSize: 18,
    lineHeight: 24,
    color: colors.ink,
  },
  body: {
    fontFamily: 'Outfit_400Regular',
    fontSize: 16,
    lineHeight: 23,
    color: colors.inkSoft,
  },
  label: {
    fontFamily: 'Outfit_600SemiBold',
    fontSize: 12,
    lineHeight: 16,
    letterSpacing: 0.6,
    textTransform: 'uppercase',
    color: colors.muted,
    marginBottom: 8,
  },
  caption: {
    fontFamily: 'Outfit_500Medium',
    fontSize: 13,
    lineHeight: 18,
    color: colors.muted,
  },
  button: {
    minHeight: 54,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 8,
    paddingHorizontal: 18,
  },
  ghostButton: {
    borderWidth: 1,
    borderColor: colors.line,
  },
  buttonLabel: { fontSize: 16 },
  chip: {
    borderRadius: radius.pill,
    paddingHorizontal: 14,
    paddingVertical: 10,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.line,
  },
  chipOn: {
    backgroundColor: colors.greenDark,
    borderColor: colors.greenDark,
  },
  chipText: { fontFamily: 'Outfit_600SemiBold', fontSize: 14, lineHeight: 18 },
  field: { marginBottom: 16 },
  input: {
    backgroundColor: colors.white,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.line,
    paddingHorizontal: 14,
    paddingVertical: 14,
    fontFamily: 'Outfit_500Medium',
    fontSize: 16,
    color: colors.ink,
  },
  inputMulti: { minHeight: 180, textAlignVertical: 'top' },
  inputError: { borderColor: colors.rose },
  webInput: { outlineStyle: 'none' } as object,
  pill: {
    alignSelf: 'flex-start',
    borderRadius: radius.pill,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  banner: {
    backgroundColor: colors.amberSoft,
    borderRadius: radius.md,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  bannerLight: { backgroundColor: 'rgba(255,255,255,0.08)' },
  track: {
    height: 6,
    borderRadius: radius.pill,
    backgroundColor: '#E4DDD2',
    overflow: 'hidden',
  },
  trackFill: { height: 6, backgroundColor: colors.green, borderRadius: radius.pill },
  card: {
    backgroundColor: colors.white,
    borderRadius: radius.lg,
    padding: 16,
    boxShadow: '0 10px 28px rgba(20, 40, 30, 0.08)',
  },
});
