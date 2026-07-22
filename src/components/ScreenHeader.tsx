import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { router } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import { useThemeContext } from '../store/settingsStore';
import { Typography, Spacing } from '../utils/theme';

export function ScreenHeader({ title, subtitle }: { title: string; subtitle?: string }) {
  const { theme } = useThemeContext();
  return (
    <View style={styles.wrap}>
      <TouchableOpacity
        onPress={() => router.back()}
        accessibilityRole="button"
        accessibilityLabel="Go back"
        style={styles.back}
      >
        <MaterialIcons name="arrow-back" size={24} color={theme.text} />
      </TouchableOpacity>
      <View style={styles.titles}>
        <Text style={[Typography.h3, { color: theme.text, textAlign: 'center' }]} numberOfLines={1}>
          {title}
        </Text>
        {!!subtitle && (
          <Text style={[Typography.tiny, { color: theme.textSecondary, textAlign: 'center' }]} numberOfLines={1}>
            {subtitle}
          </Text>
        )}
      </View>
      <View style={styles.back} />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: 56,
    paddingHorizontal: Spacing.md,
    paddingBottom: Spacing.sm,
    gap: Spacing.sm,
  },
  back: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  titles: { flex: 1, minWidth: 0 },
});
