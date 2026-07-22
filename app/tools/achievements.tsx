import { useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { AppBackground } from '../../src/components/AppBackground';
import { GlassCard } from '../../src/components/Glass';
import { ScreenHeader } from '../../src/components/ScreenHeader';
import { useThemeContext } from '../../src/store/settingsStore';
import { useTravelStore } from '../../src/store/travelStore';
import { useAppStore } from '../../src/store/appStore';
import { Colors, Spacing, Typography } from '../../src/utils/theme';

export default function AchievementsScreen() {
  const { theme } = useThemeContext();
  const achievements = useTravelStore((s) => s.achievements);
  const evaluateAchievements = useTravelStore((s) => s.evaluateAchievements);
  const visited = useTravelStore((s) => s.visited);
  const trips = useAppStore((s) => s.trips);

  useEffect(() => {
    const completed = trips.filter((t) => t.status === 'completed').length;
    const countries = new Set([
      ...trips.map((t) => t.country).filter(Boolean),
      ...visited.map((v) => v.country).filter(Boolean),
    ]).size;
    evaluateAchievements({ tripsCompleted: completed, countries });
  }, [trips, visited, evaluateAchievements]);

  return (
    <AppBackground>
      <ScreenHeader title="Achievements" subtitle="Digital travel passport" />
      <ScrollView contentContainerStyle={styles.pad}>
        {achievements.map((a) => {
          const unlocked = !!a.unlockedAt;
          return (
            <GlassCard key={a.id} strong={unlocked} contentStyle={styles.row}>
              <View style={[styles.badge, { backgroundColor: unlocked ? Colors.amberLight : theme.bgTertiary }]}>
                <MaterialIcons
                  name={a.icon as any}
                  size={24}
                  color={unlocked ? Colors.amber : theme.textTertiary}
                />
              </View>
              <View style={{ flex: 1, minWidth: 0 }}>
                <Text style={[Typography.h3, { color: theme.text }]}>{a.title}</Text>
                <Text style={[Typography.small, { color: theme.textSecondary }]}>{a.description}</Text>
              </View>
              <MaterialIcons
                name={unlocked ? 'verified' : 'lock'}
                size={20}
                color={unlocked ? Colors.green : theme.textTertiary}
              />
            </GlassCard>
          );
        })}
      </ScrollView>
    </AppBackground>
  );
}

const styles = StyleSheet.create({
  pad: { padding: Spacing.md, paddingBottom: 120, gap: Spacing.sm },
  row: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md },
  badge: { width: 48, height: 48, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
});
