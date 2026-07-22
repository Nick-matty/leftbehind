import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { AppBackground } from '../../src/components/AppBackground';
import { GlassCard } from '../../src/components/Glass';
import { ScreenHeader } from '../../src/components/ScreenHeader';
import { useThemeContext } from '../../src/store/settingsStore';
import { useAppStore } from '../../src/store/appStore';
import { Colors, Spacing, Typography } from '../../src/utils/theme';

const ICONS = ['electrical-services', 'checkroom', 'cleaning-services', 'medication', 'devices', 'badge'] as const;

export default function InsightsScreen() {
  const { theme } = useThemeContext();
  const blindSpots = useAppStore((s) => s.blindSpots);

  const ranked = Object.values(blindSpots)
    .filter((b) => b.missCount > 0)
    .sort((a, b) => b.missCount - a.missCount);

  return (
    <AppBackground>
      <ScreenHeader title="Forgetfulness Insights" subtitle="Across every trip" />
      <ScrollView contentContainerStyle={styles.pad}>
        <GlassCard strong>
          <Text style={[Typography.h3, { color: theme.text }]}>Most forgotten</Text>
          <Text style={[Typography.small, { color: theme.textSecondary, marginTop: 4 }]}>
            Tracked by item concept (e.g. all chargers count together), not per-venue IDs.
          </Text>
        </GlassCard>

        {ranked.length === 0 ? (
          <GlassCard>
            <Text style={[Typography.body, { color: theme.textSecondary, textAlign: 'center' }]}>
              Complete a few checklists — insights appear as patterns form.
            </Text>
          </GlassCard>
        ) : (
          ranked.map((b, i) => (
            <GlassCard key={b.label} contentStyle={styles.row}>
              <View style={[styles.rank, { backgroundColor: Colors.blueLight }]}>
                <MaterialIcons name={ICONS[i % ICONS.length]} size={20} color={Colors.blue} />
              </View>
              <View style={{ flex: 1, minWidth: 0 }}>
                <Text style={[Typography.body, { color: theme.text, fontWeight: '600' }]} numberOfLines={1}>
                  {b.label}
                </Text>
                <Text style={[Typography.tiny, { color: theme.textSecondary }]}>
                  Checked {b.checkCount}× · Missed {b.missCount}×
                </Text>
              </View>
              <Text style={[Typography.h3, { color: Colors.amber }]}>{b.missCount}x</Text>
            </GlassCard>
          ))
        )}
      </ScrollView>
    </AppBackground>
  );
}

const styles = StyleSheet.create({
  pad: { padding: Spacing.md, paddingBottom: 120, gap: Spacing.sm },
  row: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md },
  rank: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
});
