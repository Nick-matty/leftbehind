import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { useNotifications } from '../src/hooks/useNotifications';
import { useCloudSync } from '../src/hooks/useCloudSync';
import { useThemeContext } from '../src/store/settingsStore';
import { ErrorBoundary } from '../src/components/ErrorBoundary';

export default function RootLayout() {
  useNotifications();
  useCloudSync();
  const { isDark } = useThemeContext();

  return (
    <ErrorBoundary>
      <GestureHandlerRootView style={{ flex: 1 }}>
        <StatusBar style={isDark ? 'light' : 'dark'} />
        <Stack screenOptions={{ headerShown: false }}>
          <Stack.Screen name="index" />
          <Stack.Screen name="onboarding" />
          <Stack.Screen name="auth/login" />
          <Stack.Screen name="auth/register" />
          <Stack.Screen name="auth/forgot-password" />
          <Stack.Screen name="(tabs)" />
          <Stack.Screen name="tools" />
          <Stack.Screen name="dev" />
          <Stack.Screen name="session/new-trip" options={{ presentation: 'modal' }} />
          <Stack.Screen name="session/active" />
        </Stack>
      </GestureHandlerRootView>
    </ErrorBoundary>
  );
}
