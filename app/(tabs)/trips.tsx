import { View, Text, StyleSheet, FlatList, TouchableOpacity } from 'react-native';
import { router } from 'expo-router';
import { MaterialIcons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useAppStore, Trip } from '../../src/store/appStore';
import { useThemeContext } from '../../src/store/settingsStore';
import { GlassCard } from '../../src/components/Glass';
import { AppBackground } from '../../src/components/AppBackground';
import { Typography, Spacing, Radius, Colors } from '../../src/utils/theme';
import { useT } from '../../src/i18n/useT';
import { getVenueById } from '../../src/data/venues';

export default function Trips() {
  const { theme } = useThemeContext();
  const { t } = useT();
  const trips = useAppStore((s) => s.trips);

  const sorted = [...trips].sort((a, b) => b.startDate.localeCompare(a.startDate));

  return (
    <AppBackground>
      <View style={[styles.header, { paddingTop: 60 }]}>
        <Text style={[Typography.h2, { color: theme.text }]}>{t('trips')}</Text>
        <TouchableOpacity
          style={[styles.addBtn, { backgroundColor: Colors.blue }]}
          onPress={() => router.push('/session/new-trip')}
        >
          <MaterialIcons name="add" size={22} color="#fff" />
        </TouchableOpacity>
      </View>

      <FlatList
        data={sorted}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ padding: Spacing.lg, paddingBottom: 120, gap: Spacing.md }}
        ListEmptyComponent={
          <GlassCard style={{ alignItems: 'center', marginTop: Spacing.xl }}>
            <MaterialIcons name="card-travel" size={28} color={theme.textTertiary} />
            <Text style={[Typography.body, { color: theme.text, marginTop: Spacing.sm }]}>{t('noUpcomingTrip')}</Text>
            <Text style={[Typography.small, { color: theme.textSecondary }]}>{t('planATrip')}</Text>
          </GlassCard>
        }
        renderItem={({ item }) => <TripCard trip={item} />}
      />
    </AppBackground>
  );
}

function TripCard({ trip }: { trip: Trip }) {
  const { theme } = useThemeContext();
  const { t } = useT();
  const venue = getVenueById(trip.venueId);
  const progress = Math.round((trip.checkedItems.length / Math.max(trip.totalItems, 1)) * 100);

  const statusColor = trip.status === 'completed' ? Colors.green : trip.status === 'active' ? Colors.blue : Colors.amber;

  return (
    <TouchableOpacity onPress={() => router.push(trip.status === 'completed' ? '/(tabs)/trips' : '/session/active')}>
      <GlassCard>
        <View style={styles.rowBetween}>
          <View style={styles.rowStart}>
            <MaterialCommunityIcons name={(venue?.icon as any) ?? 'map-marker'} size={20} color={Colors.blue} />
            <Text style={[Typography.h3, { color: theme.text }]}>{trip.destination}</Text>
          </View>
          <View style={[styles.badge, { backgroundColor: statusColor + '22' }]}>
            <Text style={[Typography.tiny, { color: statusColor }]}>{trip.status}</Text>
          </View>
        </View>
        <Text style={[Typography.small, { color: theme.textSecondary, marginTop: 2 }]}>
          {trip.country} • {trip.startDate} – {trip.endDate}
        </Text>
        {trip.status !== 'completed' && (
          <View style={[styles.progressTrack, { backgroundColor: theme.bgTertiary, marginTop: Spacing.sm }]}>
            <View style={[styles.progressFill, { width: `${progress}%`, backgroundColor: Colors.blue }]} />
          </View>
        )}
      </GlassCard>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: Spacing.lg },
  addBtn: { width: 40, height: 40, borderRadius: Radius.full, alignItems: 'center', justifyContent: 'center' },
  rowBetween: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  rowStart: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  badge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: Radius.full },
  progressTrack: { height: 6, borderRadius: Radius.full, overflow: 'hidden' },
  progressFill: { height: '100%', borderRadius: Radius.full },
});
