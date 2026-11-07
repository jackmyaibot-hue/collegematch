import { router } from 'expo-router';
import { StyleSheet, View } from 'react-native';
import { AppText, Button, Screen } from '../components/ui';
import { useAppState } from '../state/AppState';
import type { AthleteGender } from '../data/types';

export default function ChooseGenderScreen() {
  const { profile, saveProfile } = useAppState();

  async function choose(gender: AthleteGender) {
    if (!profile) return;
    await saveProfile({ ...profile, gender });
    router.replace('/(tabs)');
  }

  return (
    <Screen>
      <View style={styles.copy}>
        <AppText variant="title">Female or Male</AppText>
        <AppText variant="body">
          This used to be optional. Pick one so the deck can match programs. Female matches women's programs. Male matches men's programs.
        </AppText>
      </View>
      <View style={styles.actions}>
        <Button label="Female" onPress={() => choose('female')} />
        <Button label="Male" kind="ghost" onPress={() => choose('male')} />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  copy: { gap: 12, marginBottom: 28 },
  actions: { gap: 10 },
});
