import 'react-native-gesture-handler';
import { Fraunces_700Bold } from '@expo-google-fonts/fraunces/700Bold';
import { Fraunces_700Bold_Italic } from '@expo-google-fonts/fraunces/700Bold_Italic';
import { Outfit_400Regular } from '@expo-google-fonts/outfit/400Regular';
import { Outfit_500Medium } from '@expo-google-fonts/outfit/500Medium';
import { Outfit_600SemiBold } from '@expo-google-fonts/outfit/600SemiBold';
import { Outfit_700Bold } from '@expo-google-fonts/outfit/700Bold';
import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { Platform, StyleSheet, View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AppText } from '../components/ui';
import { AppStateProvider, useAppState } from '../state/AppState';
import { colors } from '../theme';

SplashScreen.preventAutoHideAsync().catch(() => undefined);

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts({
    Fraunces_700Bold,
    Fraunces_700Bold_Italic,
    Outfit_400Regular,
    Outfit_500Medium,
    Outfit_600SemiBold,
    Outfit_700Bold,
  });

  return (
    <GestureHandlerRootView style={styles.root}>
      <SafeAreaProvider>
        <AppStateProvider>
          <PhoneColumn fontsReady={fontsLoaded || !!fontError}>
            <StatusBar style="dark" />
            <RootStack />
          </PhoneColumn>
        </AppStateProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

function PhoneColumn({ children, fontsReady }: { children: React.ReactNode; fontsReady: boolean }) {
  const { ready } = useAppState();
  useEffect(() => {
    if (fontsReady && ready) SplashScreen.hideAsync().catch(() => undefined);
  }, [fontsReady, ready]);

  if (!fontsReady || !ready) return <View style={styles.boot} />;

  return (
    <View style={styles.desk}>
      <View style={styles.phone}>{children}</View>
    </View>
  );
}

function RootStack() {
  const { profile, error } = useAppState();
  if (error) {
    return (
      <View style={styles.error}>
        <AppText variant="title">Something went wrong</AppText>
        <AppText variant="body">{error}</AppText>
      </View>
    );
  }
  return (
    <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.bg } }}>
      <Stack.Screen name="index" />
      <Stack.Protected guard={!profile}>
        <Stack.Screen name="onboarding" />
      </Stack.Protected>
      <Stack.Protected guard={!!profile}>
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="school/[id]" />
        <Stack.Screen name="outreach/[id]" />
        <Stack.Screen name="camp/[id]" />
      </Stack.Protected>
    </Stack>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  desk: {
    flex: 1,
    backgroundColor: Platform.OS === 'web' ? colors.desk : colors.bg,
    alignItems: 'center',
  },
  phone: { flex: 1, width: '100%', maxWidth: 480, backgroundColor: colors.bg },
  boot: { flex: 1, backgroundColor: colors.bg },
  error: { flex: 1, padding: 24, justifyContent: 'center', gap: 12, backgroundColor: colors.bg },
});
