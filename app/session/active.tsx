import { useEffect, useMemo, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { router } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import { useAppStore } from '../../src/store/appStore';
import { getVenueById } from '../../src/data/venues';
import { useThemeContext } from '../../src/store/settingsStore';
import { GlassCard, GlassView } from '../../src/components/Glass';
import { Typography, Spacing, Radius, Colors } from '../../src/utils/theme';
import { useT } from '../../src/i18n/useT';
import { cancelReminder } from '../../src/hooks/useNotifications';

type Filter = 'all' | 'packed' | 'unpacked';

export default function ActiveSession() {
  const { theme } = useThemeContext();
  const { t } = useT();
  const trip = useAppStore((s) => s.trips.find((t) => t.status === 'active') ?? s.trips.find((t) => t.status === 'upcoming') ?? null);
  const toggleItem = useAppStore((s) => s.toggleItem);
  const completeTrip = useAppStore((s) => s.completeTrip);
  const startTripNow = useAppStore((s) => s.startTripNow);
  const [filter, setFilter] = useState<Filter>('all');

  const venue = trip ? getVenueById(trip.venueId) : undefined;

  const categories = useMemo(() => {
    if (!venue) return [];
    const map = new Map<string, typeof venue.checklist>();
    for (const item of venue.checklist) {
      if (!map.has(item.category)) map.set(item.category, []);
      map.get(item.category)!.push(item);
    }
    return Array.from(map.entries());
  }, [venue]);

  useEffect(() => {
    if (trip?.status === 'upcoming') startTripNow(trip.id);
  }, [trip?.id, trip?.status, startTripNow]);

  if (!trip || !venue) {
    return (
      <View style={[styles.center, { backgroundColor: theme.bg }]}>
        <Text style={{ color: theme.text }}>{t('noUpcomingTrip')}</Text>
      </View>
    );
  }

  const packedCount = trip.checkedItems.length;
  const totalCount = trip.totalItems;
  const allDone = packedCount === totalCount;

  const handleFinish = async () => {
    await cancelReminder(trip.reminderId);
    completeTrip(trip.id);
    router.replace('/(tabs)/trips');
  };

  return (
    <View style={{ flex: 1, backgroundColor: theme.bg }}>
      <View style={[styles.header, { paddingTop: 60 }]}>
        <TouchableOpacity onPress={() => router.back()} accessibilityRole="button" accessibilityLabel={t('goBack')}>
          <MaterialIcons name="arrow-back" size={24} color={theme.text} />
        </TouchableOpacity>
        <View style={{ alignItems: 'center' }}>
          <Text style={[Typography.h3, { color: theme.text }]}>{t('packingList')}</Text>
          <Text style={[Typography.tiny, { color: theme.textSecondary }]}>{trip.destination}, {trip.country}</Text>
        </View>
        <TouchableOpacity onPress={handleFinish} accessibilityRole="button" accessibilityLabel={t('finishTrip')}>
          <MaterialIcons name="check-circle" size={24} color={allDone ? Colors.green : theme.textTertiary} />
        </TouchableOpacity>
      </View>

      <View style={styles.segmentRow}>
        <Segment label={`${t('allItems')} ${totalCount}`} active={filter === 'all'} onPress={() => setFilter('all')} theme={theme} />
        <Segment label={`${t('packed')} ${packedCount}`} active={filter === 'packed'} onPress={() => setFilter('packed')} theme={theme} />
        <Segment label={`${t('unpacked')} ${totalCount - packedCount}`} active={filter === 'unpacked'} onPress={() => setFilter('unpacked')} theme={theme} />
      </View>

      <ScrollView contentContainerStyle={{ padding: Spacing.lg, paddingBottom: 140, gap: Spacing.lg }}>
        {categories.map(([category, items]) => {
          const visible = items.filter((i) => {
            const isPacked = trip.checkedItems.includes(i.id);
            if (filter === 'packed') return isPacked;
            if (filter === 'unpacked') return !isPacked;
            return true;
          });
          if (visible.length === 0) return null;
          const catPacked = items.filter((i) => trip.checkedItems.includes(i.id)).length;

          return (
            <View key={category}>
              <View style={styles.categoryHeader}>
                <Text style={[Typography.h3, { color: theme.text }]}>{category}</Text>
                <Text style={[Typography.small, { color: theme.textSecondary }]}>{catPacked}/{items.length}</Text>
              </View>
              <GlassCard style={{ gap: 2, padding: 4 }}>
                {visible.map((item) => {
                  const checked = trip.checkedItems.includes(item.id);
                  return (
                    <TouchableOpacity
                      key={item.id}
                      style={styles.itemRow}
                      onPress={() => toggleItem(trip.id, item.id, item.label)}
                      accessibilityRole="checkbox"
                      accessibilityState={{ checked }}
                      accessibilityLabel={item.label}
                    >
                      <MaterialIcons
                        name={checked ? 'check-box' : 'check-box-outline-blank'}
                        size={22}
                        color={checked ? Colors.blue : theme.textTertiary}
                      />
                      <View style={{ flex: 1 }}>
                        <Text style={[Typography.body, { color: theme.text, textDecorationLine: checked ? 'line-through' : 'none' }]}>
                          {item.label}
                        </Text>
                        <Text style={[Typography.tiny, { color: theme.textTertiary }]}>{item.hint}</Text>
                      </View>
                      {item.topMiss && <MaterialIcons name="star" size={16} color={Colors.amber} />}
                    </TouchableOpacity>
                  );
                })}
              </GlassCard>
            </View>
          );
        })}
      </ScrollView>
    </View>
  );
}

function Segment({ label, active, onPress, theme }: { label: string; active: boolean; onPress: () => void; theme: any }) {
  return (
    <TouchableOpacity
      onPress={onPress}
      accessibilityRole="button"
      accessibilityState={{ selected: active }}
      accessibilityLabel={label}
      style={styles.segmentWrap}
    >
      {active ? (
        <View style={[styles.segment, styles.segmentActive]}>
          <Text style={[Typography.small, { color: '#fff', fontWeight: '600' }]}>{label}</Text>
        </View>
      ) : (
        <GlassView radius={Radius.full} padded={false} contentStyle={styles.segment}>
          <Text style={[Typography.small, { color: theme.text, fontWeight: '600' }]}>{label}</Text>
        </GlassView>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: Spacing.lg, paddingBottom: Spacing.md },
  segmentRow: { flexDirection: 'row', gap: Spacing.sm, paddingHorizontal: Spacing.lg, marginBottom: Spacing.sm },
  segmentWrap: { flex: 1 },
  segment: { paddingVertical: 10, paddingHorizontal: 6, borderRadius: Radius.full, alignItems: 'center' },
  segmentActive: { backgroundColor: Colors.blue },
  categoryHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: Spacing.sm },
  itemRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, padding: Spacing.sm },
});
