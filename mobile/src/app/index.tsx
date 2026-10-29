import { Redirect } from 'expo-router';
import { useAppState } from '../state/AppState';

export default function Index() {
  const { profile, ready } = useAppState();
  if (!ready) return null;
  if (!profile) return <Redirect href="/onboarding" />;
  if (!profile.gender) return <Redirect href="/choose-gender" />;
  return <Redirect href="/(tabs)" />;
}
