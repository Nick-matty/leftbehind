/**
 * Samsung Weather–style board: live clock, full date, location, temp & condition.
 */
import { useCallback, useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { GlassCard } from './Glass';
import { useThemeContext } from '../store/settingsStore';
import { Colors, Spacing, Typography } from '../utils/theme';
import { fetchLiveWeather, LiveWeather, weatherMaterialIcon } from '../features/liveWeather';

function formatDate(d: Date) {
  return d.toLocaleDateString(undefined, {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  });
}

function formatTime(d: Date) {
  return d.toLocaleTimeString(undefined, {
    hour: 'numeric',
    minute: '2-digit',
  });
}

function formatUpdated(ts: number) {
  const mins = Math.max(0, Math.floor((Date.now() - ts) / 60000));
  if (mins < 1) return 'Updated just now';
  if (mins === 1) return 'Updated 1 min ago';
  if (mins < 60) return `Updated ${mins} min ago`;
  const hrs = Math.floor(mins / 60);
  return hrs === 1 ? 'Updated 1 hr ago' : `Updated ${hrs} hr ago`;
}

export function WeatherBoard() {
  const { theme, isDark } = useThemeContext();
  const [now, setNow] = useState(() => new Date());
  const [weather, setWeather] = useState<LiveWeather | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const w = await fetchLiveWeather();
      setWeather(w);
    } catch {
      setError('Could not load weather');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
    const clock = setInterval(() => setNow(new Date()), 1000);
    const refresh = setInterval(() => void load(), 15 * 60 * 1000);
    return () => {
      clearInterval(clock);
      clearInterval(refresh);
    };
  }, [load]);

  const iconName = weather ? weatherMaterialIcon(weather.icon) : 'wb-sunny';
  const accent = isDark ? '#7EB6FF' : Colors.blue;
  const placeLine = weather
    ? [weather.city, weather.country].filter(Boolean).join(', ')
    : loading
      ? 'Locating…'
      : 'Your area';

  return (
    <GlassCard contentStyle={styles.card}>
      <View style={styles.header}>
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text style={[Typography.tiny, { color: theme.textTertiary, textTransform: 'uppercase' }]}>
            Weather
          </Text>
          <Text style={[Typography.h3, { color: theme.text }]} numberOfLines={1}>
            {placeLine}
          </Text>
        </View>
        <TouchableOpacity onPress={() => void load()} accessibilityLabel="Refresh weather" hitSlop={8}>
          <MaterialIcons name="refresh" size={20} color={theme.textTertiary} />
        </TouchableOpacity>
      </View>

      {/* Live date + ticking clock */}
      <View style={styles.dateTimeRow}>
        <Text style={[styles.dateText, { color: theme.textSecondary }]} numberOfLines={1}>
          {formatDate(now)}
        </Text>
        <Text style={[styles.clock, { color: theme.text }]}>{formatTime(now)}</Text>
      </View>

      {loading && !weather ? (
        <View style={styles.loadingRow}>
          <ActivityIndicator color={Colors.blue} />
          <Text style={[Typography.small, { color: theme.textSecondary }]}>Fetching live weather…</Text>
        </View>
      ) : error && !weather ? (
        <TouchableOpacity onPress={() => void load()}>
          <Text style={[Typography.small, { color: Colors.red }]}>{error} · Tap to retry</Text>
        </TouchableOpacity>
      ) : weather ? (
        <>
          <View style={styles.mainRow}>
            <MaterialIcons name={iconName} size={52} color={accent} />
            <Text style={[styles.temp, { color: theme.text }]}>{weather.tempC}°</Text>
            <View style={{ flex: 1, minWidth: 0, justifyContent: 'center' }}>
              <Text style={[Typography.body, { color: theme.text, fontWeight: '600' }]} numberOfLines={1}>
                {weather.condition}
              </Text>
              <Text style={[Typography.small, { color: theme.textSecondary }]}>
                Feels like {weather.feelsLikeC}°
              </Text>
            </View>
          </View>

          <View style={[styles.metaRow, { borderTopColor: theme.border }]}>
            <Meta label="High" value={`${weather.highC}°`} color={theme.text} muted={theme.textTertiary} />
            <Meta label="Low" value={`${weather.lowC}°`} color={theme.text} muted={theme.textTertiary} />
            <Meta label="Humidity" value={`${weather.humidity}%`} color={theme.text} muted={theme.textTertiary} />
            <Meta label="Wind" value={`${weather.windKmh}`} color={theme.text} muted={theme.textTertiary} />
          </View>
          <Text style={[Typography.tiny, { color: theme.textTertiary }]}>
            {formatUpdated(weather.fetchedAt)}
          </Text>
        </>
      ) : null}
    </GlassCard>
  );
}

function Meta({
  label,
  value,
  color,
  muted,
}: {
  label: string;
  value: string;
  color: string;
  muted: string;
}) {
  return (
    <View style={styles.metaItem}>
      <Text style={[Typography.tiny, { color: muted }]}>{label}</Text>
      <Text style={[Typography.small, { color, fontWeight: '600' }]}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { gap: 10 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 },
  dateTimeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
    gap: 12,
  },
  dateText: {
    fontSize: 15,
    fontWeight: '500',
    flex: 1,
    minWidth: 0,
  },
  clock: {
    fontSize: 34,
    fontWeight: '200',
    letterSpacing: -1,
    flexShrink: 0,
  },
  loadingRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 8 },
  mainRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  temp: {
    fontSize: 56,
    fontWeight: '200',
    letterSpacing: -2,
    lineHeight: 60,
    minWidth: 78,
  },
  metaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingTop: Spacing.sm,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  metaItem: { gap: 2, flex: 1 },
});
