import { Redirect, useGlobalSearchParams } from 'expo-router';
import { useEffect } from 'react';
import { rememberBioSource } from '../data/source';
import { useAppState } from '../state/AppState';

export default function Index() {
  const { profile, ready } = useAppState();
  const params = useGlobalSearchParams<{ ref?: string }>();
  useEffect(() => {
    if (params.ref === 'bio') void rememberBioSource();
  }, [params.ref]);
  if (!ready) return null;
  if (!profile) return <Redirect href={params.ref === 'bio' ? '/onboarding?ref=bio' : '/onboarding'} />;
  if (!profile.gender) return <Redirect href="/choose-gender" />;
  return <Redirect href="/(tabs)" />;
}
