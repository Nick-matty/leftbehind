import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Image } from 'react-native';
import { router } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useMemo } from 'react';
import { useAppStore } from '../../src/store/appStore';
import { useAuthStore } from '../../src/store/authStore';
import { useThemeContext } from '../../src/store/settingsStore';
import { GlassCard } from '../../src/components/Glass';
import { AppBackground } from '../../src/components/AppBackground';
import { WeatherBoard } from '../../src/components/WeatherBoard';
import { Typography, Spacing, Radius, Colors } from '../../src/utils/theme';
import { useT } from '../../src/i18n/useT';
import { useOnlineStatus } from '../../src/utils/network';
import { packingScore } from '../../src/features/smartPacking';
import { coverForDestination } from '../../src/features/destinationCovers';

function countdown(toDate: string) {
  const target = Date.parse(toDate);
  if (!target) return null;
  const diff = Math.max(0, target - Date.now());
  const days = Math.floor(diff / 86400000);
  const hours = Math.floor((diff % 86400000) / 3600000);
  const minutes = Math.floor((diff % 3600000) / 60000);
  return { days, hours, minutes };
}

export default function Home() {
  const { theme, isDark } = useThemeContext();
  const { t } = useT();
  const currentUser = useAuthStore((s) => {
    if (!s.currentUserId) return null;
    return s.users.find((u) => u.id === s.currentUserId) ?? null;
  });
  const trip = useAppStore((s) => s.trips.find((t) => t.status === 'upcoming') ?? null);
  const isOnline = useOnlineStatus();
  const firstName = currentUser?.fullName?.split(' ')[0] ?? '';

  const progress = trip
    ? packingScore(trip.checkedItems.length, Math.max(trip.totalItems, 1))
    : 0;
  const cd = useMemo(() => (trip ? countdown(trip.startDate) : null), [trip?.startDate]);
  const cover = coverForDestination(trip?.destination, trip?.country);

  const quickActions: {
    icon: keyof typeof MaterialIcons.glyphMap;
    label: string;
    colors: readonly [string, string];
    onPress: () => void;
  }[] = [
    {
      icon: 'checklist',
      label: t('packing'),
      colors: Colors.quickPacking,
      onPress: () => (trip ? router.push('/session/active') : router.push('/session/new-trip')),
    },
    {
      icon: 'account-balance-wallet',
      label: t('budget'),
      colors: Colors.quickBudget,
      onPress: () => router.push('/(tabs)/calendar'),
    },
    {
      icon: 'map',
      label: t('map'),
      colors: Colors.quickMap,
      onPress: () => router.push('/(tabs)/map'),
    },
    {
      icon: 'calendar-today',
      label: t('calendar'),
      colors: Colors.quickCalendar,
      onPress: () => router.push('/(tabs)/calendar'),
    },
  ];

  return (
    <AppBackground>
      <ScrollView style={{ backgroundColor: 'transparent' }} contentContainerStyle={styles.container}>
        <View style={styles.headerRow}>
          <TouchableOpacity
            style={styles.avatarBtn}
            onPress={() => router.push('/(tabs)/profile')}
            accessibilityRole="button"
            accessibilityLabel="Open profile"
          >
            {currentUser?.avatarUri ? (
              <Image source={{ uri: currentUser.avatarUri }} style={styles.avatar} />
            ) : (
              <View style={[styles.avatar, { backgroundColor: Colors.blue }]}>
                <Text style={styles.avatarLetter}>
                  {(currentUser?.fullName?.[0] ?? '?').toUpperCase()}
                </Text>
              </View>
            )}
          </TouchableOpacity>
          <View style={{ flex: 1, minWidth: 0, paddingHorizontal: Spacing.sm }}>
            <Text style={[Typography.h2, { color: theme.text }]} numberOfLines={1}>
              {t('helloName', { name: firstName || 'there' })}
            </Text>
            <Text style={[Typography.small, { color: theme.textSecondary }]}>{t('whereToNext')}</Text>
          </View>
          <View style={styles.headerIcons}>
            {!isOnline && (
              <View style={[styles.offlinePill, { backgroundColor: theme.bgTertiary }]}>
                <MaterialIcons name="cloud-off" size={14} color={theme.textSecondary} />
              </View>
            )}
            <TouchableOpacity
              style={[styles.iconBtn, styles.glassBtn]}
              onPress={() => router.push('/tools')}
              accessibilityRole="button"
              accessibilityLabel="Notifications"
            >
              <MaterialIcons name="notifications-none" size={22} color={theme.text} />
            </TouchableOpacity>
          </View>
        </View>

        <WeatherBoard />

        {trip ? (
          <TouchableOpacity
            activeOpacity={0.92}
            onPress={() => router.push('/session/active')}
            accessibilityRole="button"
          >
            <GlassCard strong padded={false} contentStyle={styles.tripCard}>
              <Image source={{ uri: cover }} style={styles.tripCover} />
              <View style={styles.tripBody}>
                <View style={styles.tripHeaderRow}>
                  <Text style={[Typography.tiny, { color: Colors.blue, textTransform: 'uppercase' }]}>
                    {t('upcomingTrip')}
                  </Text>
                  <MaterialIcons name="flight-takeoff" size={18} color={Colors.blue} />
                </View>
                <Text style={[Typography.h3, { color: theme.text }]} numberOfLines={2}>
                  {trip.destination}, {trip.country}
                </Text>
                <Text style={[Typography.small, { color: theme.textSecondary }]}>
                  {trip.startDate} – {trip.endDate}
                </Text>
                {cd && (
                  <View
                    style={[
                      styles.countdown,
                      { backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(255,255,255,0.35)' },
                    ]}
                  >
                    <Text style={[Typography.tiny, { color: theme.textSecondary }]}>Smart countdown</Text>
                    <Text style={[Typography.h3, { color: theme.text }]}>
                      {cd.days}d {cd.hours}h {cd.minutes}m
                    </Text>
                  </View>
                )}
                <View style={styles.rowBetween}>
                  <View>
                    <Text style={[Typography.tiny, { color: theme.textTertiary }]}>{t('checkIn')}</Text>
                    <Text style={[Typography.body, { color: theme.text }]}>{trip.checkInTime ?? '—'}</Text>
                  </View>
                  <View style={{ alignItems: 'flex-end' }}>
                    <Text style={[Typography.tiny, { color: theme.textTertiary }]}>{t('checkOut')}</Text>
                    <Text style={[Typography.body, { color: theme.text }]}>{trip.checkOutTime ?? '—'}</Text>
                  </View>
                </View>
              </View>
            </GlassCard>
          </TouchableOpacity>
        ) : (
          <GlassCard contentStyle={{ alignItems: 'center', gap: Spacing.sm }}>
            <MaterialIcons name="flight" size={28} color={theme.textTertiary} />
            <Text style={[Typography.body, { color: theme.text, textAlign: 'center' }]}>{t('noUpcomingTrip')}</Text>
            <Text style={[Typography.small, { color: theme.textSecondary, textAlign: 'center' }]}>
              {t('planATrip')}
            </Text>
          </GlassCard>
        )}

        <View style={styles.quickGrid}>
          {quickActions.map((a) => (
            <TouchableOpacity
              key={a.label}
              style={styles.quickTileWrap}
              onPress={a.onPress}
              accessibilityRole="button"
              accessibilityLabel={a.label}
            >
              <LinearGradient colors={[...a.colors]} style={styles.quickTile} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}>
                <MaterialIcons name={a.icon} size={24} color="#fff" />
                <Text style={styles.quickLabel} numberOfLines={1}>
                  {a.label}
                </Text>
              </LinearGradient>
            </TouchableOpacity>
          ))}
        </View>

        {trip && (
          <GlassCard contentStyle={{ gap: Spacing.sm }}>
            <View style={styles.rowBetween}>
              <Text style={[Typography.h3, { color: theme.text }]}>Packing readiness</Text>
              <Text style={[Typography.h3, { color: Colors.blue }]}>{progress}%</Text>
            </View>
            <Text style={[Typography.small, { color: theme.textSecondary }]}>
              {progress === 100 ? t('allClear') : t('greatJobKeepItUp')}
            </Text>
            <View
              style={[
                styles.progressTrack,
                { backgroundColor: isDark ? 'rgba(255,255,255,0.12)' : 'rgba(15,26,43,0.08)' },
              ]}
            >
              <View style={[styles.progressFill, { width: `${progress}%`, backgroundColor: Colors.blue }]} />
            </View>
          </GlassCard>
        )}
      </ScrollView>
    </AppBackground>
  );
}

const styles = StyleSheet.create({
  container: { padding: Spacing.md, paddingTop: 56, paddingBottom: 120, gap: Spacing.md },
  headerRow: { flexDirection: 'row', alignItems: 'center' },
  headerIcons: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  avatarBtn: { marginRight: 2 },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255,255,255,0.45)',
  },
  avatarLetter: { color: '#fff', fontSize: 18, fontWeight: '700' },
  offlinePill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderRadius: Radius.full,
  },
  iconBtn: { width: 40, height: 40, borderRadius: Radius.full, alignItems: 'center', justifyContent: 'center' },
  glassBtn: {
    backgroundColor: 'rgba(255,255,255,0.16)',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255,255,255,0.35)',
  },
  tripCard: { overflow: 'hidden' },
  tripCover: { width: '100%', height: 132 },
  tripBody: { padding: Spacing.md, gap: Spacing.sm },
  tripHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  rowBetween: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  countdown: { borderRadius: Radius.md, padding: Spacing.sm, gap: 2 },
  quickGrid: { flexDirection: 'row', gap: Spacing.sm },
  quickTileWrap: { flex: 1 },
  quickTile: {
    aspectRatio: 1,
    borderRadius: Radius.lg,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255,255,255,0.35)',
  },
  quickLabel: { color: '#fff', fontSize: 11, fontWeight: '700' },
  progressTrack: { height: 8, borderRadius: Radius.full, overflow: 'hidden' },
  progressFill: { height: '100%', borderRadius: Radius.full },
});
