import { Link } from 'expo-router';
import { AppText, Screen } from '../components/ui';

export default function NotFound() {
  return (
    <Screen>
      <AppText variant="title">That page is not in CollegeMatch.</AppText>
      <Link href="/" style={{ marginTop: 16 }}>
        <AppText variant="headline" color="#0F7A45">
          Back home
        </AppText>
      </Link>
    </Screen>
  );
}
