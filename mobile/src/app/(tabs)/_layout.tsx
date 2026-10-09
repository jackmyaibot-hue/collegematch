import { Ionicons } from '@expo/vector-icons';
import { Tabs } from 'expo-router/js-tabs';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAppState } from '../../state/AppState';
import { colors } from '../../theme';

export default function TabLayout() {
  const insets = useSafeAreaInsets();
  const { recruiting } = useAppState();
  const savedCount = Object.keys(recruiting.saved).length;
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        sceneStyle: { backgroundColor: colors.bg },
        tabBarActiveTintColor: colors.green,
        tabBarInactiveTintColor: colors.muted,
        tabBarStyle: {
          backgroundColor: colors.white,
          borderTopColor: colors.line,
          height: 58 + insets.bottom,
          paddingTop: 6,
          paddingBottom: insets.bottom,
        },
        tabBarLabelStyle: { fontFamily: 'Outfit_600SemiBold', fontSize: 11 },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Discover',
          tabBarIcon: ({ color, size }) => <Ionicons name="layers-outline" color={color} size={size} />,
        }}
      />
      <Tabs.Screen
        name="saved"
        options={{
          title: 'Saved',
          tabBarBadge: savedCount > 0 ? savedCount : undefined,
          tabBarBadgeStyle: { backgroundColor: colors.green, color: '#F4F1EA', fontFamily: 'Outfit_700Bold' },
          tabBarIcon: ({ color, size }) => <Ionicons name="bookmark-outline" color={color} size={size} />,
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profile',
          tabBarIcon: ({ color, size }) => <Ionicons name="person-outline" color={color} size={size} />,
        }}
      />
    </Tabs>
  );
}
