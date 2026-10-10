import { useState } from 'react';
import { FlatList, Modal, Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { STATES, stateName } from '../data/regions';
import { colors, radius } from '../theme';
import { AppText } from './ui';

export function StateSelect({
  label,
  value,
  onChange,
  error,
  hint,
}: {
  label: string;
  value: string;
  onChange: (code: string) => void;
  error?: string;
  hint?: string;
}) {
  const [open, setOpen] = useState(false);
  const insets = useSafeAreaInsets();
  const selected = value ? stateName(value) : '';

  return (
    <View style={styles.field}>
      <AppText variant="label">{label}</AppText>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={selected ? `${label}, ${selected}` : label}
        onPress={() => setOpen(true)}
        style={[styles.trigger, error ? styles.triggerError : null]}
      >
        <AppText variant="headline" color={selected ? colors.ink : colors.muted}>
          {selected || 'Choose your state'}
        </AppText>
        <AppText variant="caption">All states</AppText>
      </Pressable>
      {error ? (
        <AppText variant="caption" color={colors.rose}>
          {error}
        </AppText>
      ) : hint ? (
        <AppText variant="caption">{hint}</AppText>
      ) : null}
      <Modal visible={open} animationType="slide" transparent onRequestClose={() => setOpen(false)}>
        <View style={styles.backdrop}>
          <View style={[styles.sheet, { paddingBottom: Math.max(insets.bottom, 16) }]}>
            <View style={styles.sheetHead}>
              <AppText variant="headline">Home state</AppText>
              <Pressable accessibilityRole="button" onPress={() => setOpen(false)} hitSlop={8}>
                <AppText variant="caption" color={colors.green}>
                  Close
                </AppText>
              </Pressable>
            </View>
            <FlatList
              data={STATES}
              keyExtractor={(item) => item.code}
              keyboardShouldPersistTaps="handled"
              renderItem={({ item }) => {
                const on = item.code === value;
                return (
                  <Pressable
                    accessibilityRole="button"
                    accessibilityState={{ selected: on }}
                    onPress={() => {
                      onChange(item.code);
                      setOpen(false);
                    }}
                    style={[styles.row, on && styles.rowOn]}
                  >
                    <AppText variant="headline" color={on ? '#F4F1EA' : colors.ink}>
                      {item.name}
                    </AppText>
                  </Pressable>
                );
              }}
            />
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  field: { marginBottom: 16 },
  trigger: {
    backgroundColor: colors.white,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.line,
    paddingHorizontal: 14,
    paddingVertical: 14,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  triggerError: { borderColor: colors.rose },
  backdrop: { flex: 1, backgroundColor: 'rgba(12, 28, 22, 0.45)', justifyContent: 'flex-end' },
  sheet: {
    maxHeight: '80%',
    backgroundColor: colors.bg,
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    paddingTop: 16,
    paddingHorizontal: 16,
  },
  sheetHead: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  row: {
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: radius.md,
  },
  rowOn: { backgroundColor: colors.greenDark },
});
