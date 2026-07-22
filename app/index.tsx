import { View, ActivityIndicator } from 'react-native';
import { Redirect } from 'expo-router';
import { useAppStore } from '../src/store/appStore';
import { useAuthStore } from '../src/store/authStore';
import { useSettingsStore } from '../src/store/settingsStore';
import { useTheme } from '../src/utils/theme';

export default function Index() {
  const onboardingDone = useAppStore((s) => s.onboardingDone);
  const appHydrated = useAppStore((s) => s.hasHydrated);
  const authHydrated = useAuthStore((s) => s.hasHydrated);
  const settingsHydrated = useSettingsStore((s) => s.hasHydrated);
  const currentUserId = useAuthStore((s) => s.currentUserId);
  const theme = useTheme();

  // Wait for persisted stores to load before deciding where to send the
  // person — otherwise returning users briefly flash onboarding/login.
  if (!appHydrated || !authHydrated || !settingsHydrated) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: theme.bg }}>
        <ActivityIndicator color={theme.tint} />
      </View>
    );
  }

  if (!onboardingDone) return <Redirect href="/onboarding" />;
  if (!currentUserId) return <Redirect href="/auth/login" />;
  return <Redirect href="/(tabs)" />;
}
