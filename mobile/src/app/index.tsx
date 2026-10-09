import { Redirect } from 'expo-router';
import { useAppState } from '../state/AppState';

export default function Index() {
  const { profile, ready } = useAppState();
  if (!ready) return null;
  return <Redirect href={profile ? '/(tabs)' : '/onboarding'} />;
}
