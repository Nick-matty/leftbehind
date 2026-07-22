import { useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { AppBackground } from '../../src/components/AppBackground';
import { GlassCard } from '../../src/components/Glass';
import { ScreenHeader } from '../../src/components/ScreenHeader';
import { useThemeContext } from '../../src/store/settingsStore';
import { useAppStore } from '../../src/store/appStore';
import { useTravelStore } from '../../src/store/travelStore';
import { Colors, Radius, Spacing, Typography } from '../../src/utils/theme';

type StatItem = {
  label: string;
  value: string;
  icon: keyof typeof MaterialIcons.glyphMap;
  accent: string;
  tint: string;
};

export default function StatsScreen() {
  const { theme, isDark } = useThemeContext();
  const trips = useAppStore((s) => s.trips);
  const budgetEntries = useAppStore((s) => s.budgetEntries);
  const visited = useTravelStore((s) => s.visited);
  const journal = useTravelStore((s) => s.journal);

  const stats = useMemo(() => {
    const completed = trips.filter((t) => t.status === 'completed');
    const countries = new Set(trips.map((t) => t.country).filter(Boolean));
    const cities = new Set(trips.map((t) => t.destination).filter(Boolean));
    const spent = budgetEntries.reduce((s, e) => s + e.amount, 0);
    const nights = trips.reduce((sum, t) => {
      const a = Date.parse(t.startDate);
      const b = Date.parse(t.endDate);
      if (!a || !b || b < a) return sum;
      return sum + Math.max(1, Math.round((b - a) / 86400000));
    }, 0);
    return {
      countries: countries.size,
      cities: cities.size + visited.length,
      trips: trips.length,
      completed: completed.length,
      spent,
      nights,
      journal: journal.length,
    };
  }, [trips, budgetEntries, visited, journal]);

  const wash = (color: string) => (isDark ? `${color}33` : `${color}22`);

  const overview: StatItem[] = [
    {
      label: 'Countries',
      value: String(stats.countries),
      icon: 'public',
      accent: Colors.blue,
      tint: wash(Colors.blue),
    },
    {
      label: 'Places',
      value: String(stats.cities),
      icon: 'location-city',
      accent: Colors.green,
      tint: wash(Colors.green),
    },
    {
      label: 'Completed',
      value: String(stats.completed),
      icon: 'flight-land',
      accent: Colors.amber,
      tint: wash(Colors.amber),
    },
    {
      label: 'Nights away',
      value: String(stats.nights),
      icon: 'hotel',
      accent: '#7C6CFF',
      tint: wash('#7C6CFF'),
    },
  ];

  const details: StatItem[] = [
    {
      label: 'Trips logged',
      value: String(stats.trips),
      icon: 'card-travel',
      accent: Colors.blue,
      tint: wash(Colors.blue),
    },
    {
      label: 'Money tracked',
      value: `$${stats.spent.toFixed(0)}`,
      icon: 'account-balance-wallet',
      accent: Colors.green,
      tint: wash(Colors.green),
    },
    {
      label: 'Journal entries',
      value: String(stats.journal),
      icon: 'menu-book',
      accent: Colors.amber,
      tint: wash(Colors.amber),
    },
  ];

  return (
    <AppBackground>
      <ScreenHeader title="Travel Statistics" subtitle="Your journey so far" />
      <ScrollView contentContainerStyle={styles.pad}>
        <GlassCard strong contentStyle={styles.hero}>
          <View style={styles.heroTop}>
            <View style={[styles.heroBadge, { backgroundColor: isDark ? 'rgba(59,125,232,0.25)' : Colors.blueLight }]}>
              <MaterialIcons name="insights" size={26} color={Colors.blue} />
            </View>
            <View style={{ flex: 1, minWidth: 0 }}>
              <Text style={[Typography.tiny, { color: theme.textTertiary, textTransform: 'uppercase' }]}>
                Travel passport
              </Text>
              <Text style={[Typography.h2, { color: theme.text }]}>
                {stats.completed} trip{stats.completed === 1 ? '' : 's'} done
              </Text>
              <Text style={[Typography.small, { color: theme.textSecondary, marginTop: 2 }]}>
                {stats.countries} countries · {stats.nights} nights on the road
              </Text>
            </View>
          </View>
          <View style={[styles.heroMeterTrack, { backgroundColor: theme.bgTertiary }]}>
            <View
              style={[
                styles.heroMeterFill,
                {
                  width: `${Math.min(100, stats.trips === 0 ? 0 : Math.round((stats.completed / Math.max(stats.trips, 1)) * 100))}%`,
                  backgroundColor: Colors.blue,
                },
              ]}
            />
          </View>
          <Text style={[Typography.tiny, { color: theme.textTertiary }]}>
            {stats.trips === 0
              ? 'Log a trip to start building your stats'
              : `${Math.round((stats.completed / Math.max(stats.trips, 1)) * 100)}% of logged trips completed`}
          </Text>
        </GlassCard>

        <Text style={[styles.sectionLabel, { color: theme.textTertiary }]}>At a glance</Text>
        <View style={styles.grid}>
          {overview.map((c) => (
            <GlassCard key={c.label} style={styles.tile} contentStyle={styles.tileInner}>
              <View style={[styles.tileIcon, { backgroundColor: c.tint }]}>
                <MaterialIcons name={c.icon} size={20} color={c.accent} />
              </View>
              <Text style={[styles.tileValue, { color: theme.text }]}>{c.value}</Text>
              <Text style={[Typography.tiny, { color: theme.textSecondary, textAlign: 'center' }]}>
                {c.label}
              </Text>
            </GlassCard>
          ))}
        </View>

        <Text style={[styles.sectionLabel, { color: theme.textTertiary }]}>Breakdown</Text>
        <GlassCard contentStyle={{ gap: 0, paddingVertical: Spacing.xs }}>
          {details.map((row, i) => (
            <View
              key={row.label}
              style={[
                styles.detailRow,
                i < details.length - 1 && {
                  borderBottomWidth: StyleSheet.hairlineWidth,
                  borderBottomColor: theme.border,
                },
              ]}
            >
              <View style={[styles.detailIcon, { backgroundColor: row.tint }]}>
                <MaterialIcons name={row.icon} size={18} color={row.accent} />
              </View>
              <Text style={[Typography.body, { color: theme.text, flex: 1 }]}>{row.label}</Text>
              <Text style={[Typography.h3, { color: theme.text }]}>{row.value}</Text>
            </View>
          ))}
        </GlassCard>
      </ScrollView>
    </AppBackground>
  );
}

const styles = StyleSheet.create({
  pad: {
    padding: Spacing.md,
    paddingBottom: 120,
    gap: Spacing.md,
    maxWidth: 480,
    width: '100%',
    alignSelf: 'center',
  },
  hero: { gap: Spacing.md },
  heroTop: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md },
  heroBadge: {
    width: 52,
    height: 52,
    borderRadius: Radius.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroMeterTrack: {
    height: 8,
    borderRadius: Radius.full,
    overflow: 'hidden',
  },
  heroMeterFill: { height: '100%', borderRadius: Radius.full },
  sectionLabel: {
    ...Typography.tiny,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    marginBottom: -4,
  },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm },
  tile: { width: '48%' },
  tileInner: { alignItems: 'center', gap: 8, minHeight: 110, justifyContent: 'center' },
  tileIcon: {
    width: 36,
    height: 36,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tileValue: {
    fontSize: 28,
    fontWeight: '700',
    letterSpacing: -0.5,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    paddingVertical: 12,
    paddingHorizontal: Spacing.md,
  },
  detailIcon: {
    width: 34,
    height: 34,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
