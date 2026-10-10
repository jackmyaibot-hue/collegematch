import DateTimePicker, { type DateTimePickerEvent } from '@react-native-community/datetimepicker';
import { createElement, useState } from 'react';
import { Platform, Pressable, StyleSheet, View } from 'react-native';
import { isoToday } from '../data/format';
import { BIRTHDATE_MAX, BIRTHDATE_MIN } from '../data/sports';
import { colors, radius } from '../theme';
import { AppText } from './ui';

function parseIso(iso: string): Date {
  const [year, month, day] = iso.split('-').map(Number);
  return new Date(year, month - 1, day);
}

const MIN = parseIso(BIRTHDATE_MIN);
const MAX = parseIso(BIRTHDATE_MAX);

export function DateField({
  label,
  value,
  onChange,
  error,
  hint,
}: {
  label: string;
  value: string;
  onChange: (iso: string) => void;
  error?: string;
  hint?: string;
}) {
  const [open, setOpen] = useState(Platform.OS === 'ios' && value !== '');
  const shown = value ? parseIso(value) : parseIso('2010-06-15');

  function commit(date: Date) {
    const iso = isoToday(date);
    if (iso < BIRTHDATE_MIN || iso > BIRTHDATE_MAX) return;
    onChange(iso);
  }

  function onNativeChange(event: DateTimePickerEvent, date?: Date) {
    if (Platform.OS === 'android') setOpen(false);
    if (event.type === 'dismissed') return;
    if (date) commit(date);
  }

  return (
    <View style={styles.field}>
      <AppText variant="label">{label}</AppText>
      {Platform.OS === 'web' ? (
        createElement('input', {
          type: 'date',
          value,
          min: BIRTHDATE_MIN,
          max: BIRTHDATE_MAX,
          'aria-label': label,
          onChange: (event: { target: { value: string } }) => onChange(event.target.value),
          style: webDateStyle(Boolean(error)),
        })
      ) : (
        <>
          {Platform.OS === 'android' || !open ? (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={value ? `${label}, ${value}` : label}
              onPress={() => setOpen(true)}
              style={[styles.trigger, error ? styles.triggerError : null]}
            >
              <AppText variant="headline">{value || 'Add your birthday'}</AppText>
            </Pressable>
          ) : null}
          {open ? (
            <DateTimePicker
              value={shown}
              mode="date"
              display={Platform.OS === 'ios' ? 'inline' : 'default'}
              minimumDate={MIN}
              maximumDate={MAX}
              onChange={onNativeChange}
            />
          ) : null}
        </>
      )}
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

function webDateStyle(error: boolean): object {
  return {
    width: '100%',
    boxSizing: 'border-box',
    backgroundColor: colors.white,
    borderRadius: 16,
    border: `1px solid ${error ? colors.rose : colors.line}`,
    padding: '14px',
    fontFamily: 'Outfit, sans-serif',
    fontSize: 16,
    color: colors.ink,
  };
}

const styles = StyleSheet.create({
  field: { marginBottom: 16, gap: 0 },
  trigger: {
    backgroundColor: colors.white,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.line,
    paddingHorizontal: 14,
    paddingVertical: 14,
    marginBottom: 8,
  },
  triggerError: { borderColor: colors.rose },
});
