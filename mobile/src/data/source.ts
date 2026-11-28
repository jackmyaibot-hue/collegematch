import AsyncStorage from '@react-native-async-storage/async-storage';

const SOURCE_KEY = 'collegematch.source.v1';

/** Remembers that this install opened CollegeMatch from a public bio. Stores no name, slug, or profile. */
export async function rememberBioSource(): Promise<void> {
  await AsyncStorage.setItem(SOURCE_KEY, 'bio');
}

export async function cameFromBio(): Promise<boolean> {
  return (await AsyncStorage.getItem(SOURCE_KEY)) === 'bio';
}
