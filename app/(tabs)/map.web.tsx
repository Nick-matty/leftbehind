// Web fallback: react-native-maps has no browser implementation, so importing
// it in a web bundle throws before React can mount anything (the cause of a
// blank white page on `expo start --web`). Metro/Expo Router automatically
// picks this ".web.tsx" file instead of "map.tsx" when bundling for the
// browser, so the native map screen (with MapView) is only ever loaded on
// iOS/Android, where it works normally.
import { View, Text, StyleSheet } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useThemeContext } from '../../src/store/settingsStore';
import { Typography, Spacing } from '../../src/utils/theme';
import { useT } from '../../src/i18n/useT';

export default function MapWebFallback() {
  const { theme } = useThemeContext();
  const { t } = useT();

  return (
    <View style={[styles.center, { backgroundColor: theme.bg }]}>
      <MaterialIcons name="map" size={40} color={theme.textTertiary} />
      <Text style={[Typography.h3, { color: theme.text, marginTop: Spacing.md, textAlign: 'center' }]}>
        {t('map')}
      </Text>
      <Text style={[Typography.small, { color: theme.textSecondary, textAlign: 'center', marginTop: Spacing.xs, maxWidth: 280 }]}>
        The interactive map isn't available in the web preview. Open this app on iOS or Android (via Expo Go) to use it.
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: Spacing.xl },
});
