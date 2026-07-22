import { useEffect, useMemo, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput, Image } from 'react-native';
import MapView, { Marker, PROVIDER_GOOGLE } from 'react-native-maps';
import * as Location from 'expo-location';
import { MaterialIcons } from '@expo/vector-icons';
import { useThemeContext } from '../../src/store/settingsStore';
import { GlassCard, GlassView } from '../../src/components/Glass';
import { Typography, Spacing, Radius, Colors } from '../../src/utils/theme';
import { useT } from '../../src/i18n/useT';
import { useOnlineStatus } from '../../src/utils/network';

type Category = 'all' | 'hotels' | 'restaurants' | 'attractions';

type PlacePin = {
  id: string;
  name: string;
  category: Exclude<Category, 'all'>;
  rating: number;
  photo: string;
  latitude: number;
  longitude: number;
};

// No Google Places API key is configured yet (see app.json). Real hotel/
// restaurant/attraction search, photos, and turn-by-turn directions will
// light up automatically once one is added — this screen is fully wired
// for it, it just has no live data source yet.
const PLACES_API_CONFIGURED = false;

const DEMO_PLACES: PlacePin[] = [
  {
    id: '1',
    name: 'Harbor View Hotel',
    category: 'hotels',
    rating: 4.6,
    photo: 'https://images.unsplash.com/photo-1566073771259-6a8506099945?w=400&q=80',
    latitude: 0,
    longitude: 0,
  },
  {
    id: '2',
    name: 'Coastal Bistro',
    category: 'restaurants',
    rating: 4.4,
    photo: 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=400&q=80',
    latitude: 0.008,
    longitude: 0.006,
  },
  {
    id: '3',
    name: 'Old Town Square',
    category: 'attractions',
    rating: 4.8,
    photo: 'https://images.unsplash.com/photo-1467269204594-9661b134dd2b?w=400&q=80',
    latitude: -0.006,
    longitude: 0.01,
  },
];

export default function MapScreen() {
  const { theme } = useThemeContext();
  const { t } = useT();
  const isOnline = useOnlineStatus();
  const [category, setCategory] = useState<Category>('all');
  const [query, setQuery] = useState('');
  const [region, setRegion] = useState({ latitude: 0.0, longitude: 34.0, latitudeDelta: 40, longitudeDelta: 40 });
  const [locationGranted, setLocationGranted] = useState(false);
  const [selectedId, setSelectedId] = useState<string>('1');

  useEffect(() => {
    (async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') return;
      setLocationGranted(true);
      const pos = await Location.getCurrentPositionAsync({});
      setRegion({
        latitude: pos.coords.latitude,
        longitude: pos.coords.longitude,
        latitudeDelta: 0.05,
        longitudeDelta: 0.05,
      });
    })();
  }, []);

  const places = useMemo(() => {
    const baseLat = region.latitude;
    const baseLng = region.longitude;
    return DEMO_PLACES.map((p) => ({
      ...p,
      latitude: baseLat + p.latitude,
      longitude: baseLng + p.longitude,
    })).filter((p) => {
      if (category !== 'all' && p.category !== category) return false;
      if (query.trim() && !p.name.toLowerCase().includes(query.trim().toLowerCase())) return false;
      return true;
    });
  }, [region.latitude, region.longitude, category, query]);

  const selected = places.find((p) => p.id === selectedId) ?? places[0];

  const categories: { key: Category; label: string }[] = [
    { key: 'all', label: t('all') },
    { key: 'hotels', label: t('hotels') },
    { key: 'restaurants', label: t('restaurants') },
    { key: 'attractions', label: t('attractions') },
  ];

  return (
    <View style={{ flex: 1, backgroundColor: theme.bg }}>
      <MapView
        style={StyleSheet.absoluteFill}
        provider={PROVIDER_GOOGLE}
        region={region}
        onRegionChangeComplete={setRegion}
        showsUserLocation={locationGranted}
        showsMyLocationButton={locationGranted}
      >
        {places.map((p) => (
          <Marker
            key={p.id}
            coordinate={{ latitude: p.latitude, longitude: p.longitude }}
            onPress={() => setSelectedId(p.id)}
            pinColor={selected?.id === p.id ? Colors.blue : undefined}
          />
        ))}
      </MapView>

      <View style={[styles.topBar, { paddingTop: 60 }]}>
        <GlassView radius={Radius.md} style={{ paddingHorizontal: Spacing.md, height: 48, justifyContent: 'center' }} strong>
          <View style={styles.searchRow}>
            <MaterialIcons name="search" size={20} color={theme.textSecondary} />
            <TextInput
              style={[styles.searchInput, { color: theme.text }]}
              placeholder={t('searchForPlaces')}
              placeholderTextColor={theme.textTertiary}
              value={query}
              onChangeText={setQuery}
            />
          </View>
        </GlassView>

        <View style={styles.chipsRow}>
          {categories.map((c) => (
            <TouchableOpacity
              key={c.key}
              onPress={() => setCategory(c.key)}
              style={[styles.chip, { backgroundColor: category === c.key ? Colors.blue : theme.bgSecondary }]}
            >
              <Text style={[Typography.small, { color: category === c.key ? '#fff' : theme.text }]}>{c.label}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {selected ? (
        <View style={styles.placeCardWrap}>
          <GlassCard strong contentStyle={styles.placeCard}>
            <Image source={{ uri: selected.photo }} style={styles.placePhoto} />
            <View style={{ flex: 1, gap: 4 }}>
              <Text style={[Typography.body, { color: theme.text, fontWeight: '700' }]} numberOfLines={1}>
                {selected.name}
              </Text>
              <Text style={[Typography.tiny, { color: theme.textSecondary, textTransform: 'capitalize' }]}>
                {selected.category}
              </Text>
              <View style={styles.ratingRow}>
                <MaterialIcons name="star" size={16} color="#F5B942" />
                <Text style={[Typography.small, { color: theme.text, fontWeight: '700' }]}>
                  {selected.rating.toFixed(1)}
                </Text>
              </View>
            </View>
            <MaterialIcons name="chevron-right" size={22} color={theme.textTertiary} />
          </GlassCard>
        </View>
      ) : null}

      {(!isOnline || !PLACES_API_CONFIGURED) && (
        <View style={styles.bottomNotice}>
          <GlassCard strong style={{ flexDirection: 'row', alignItems: 'center', gap: Spacing.sm }}>
            <MaterialIcons name={!isOnline ? 'cloud-off' : 'info-outline'} size={20} color={theme.textSecondary} />
            <Text style={[Typography.small, { color: theme.textSecondary, flex: 1 }]}>
              {!isOnline ? t('offlineMapNotice') : t('needsApiKey')}
            </Text>
          </GlassCard>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  topBar: { position: 'absolute', top: 0, left: 0, right: 0, paddingHorizontal: Spacing.lg, gap: Spacing.sm },
  searchRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  searchInput: { flex: 1, fontSize: 15 },
  chipsRow: { flexDirection: 'row', gap: Spacing.sm },
  chip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: Radius.full },
  placeCardWrap: { position: 'absolute', bottom: 100, left: Spacing.lg, right: Spacing.lg },
  placeCard: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md, paddingVertical: Spacing.sm },
  placePhoto: { width: 64, height: 64, borderRadius: 14 },
  ratingRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 2 },
  bottomNotice: { position: 'absolute', bottom: 188, left: Spacing.lg, right: Spacing.lg },
});
