import { useMemo, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TextInput, TouchableOpacity } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { AppBackground } from '../../src/components/AppBackground';
import { GlassCard, GlassButton } from '../../src/components/Glass';
import { ScreenHeader } from '../../src/components/ScreenHeader';
import { useThemeContext } from '../../src/store/settingsStore';
import { useAppStore } from '../../src/store/appStore';
import { Colors, Radius, Spacing, Typography } from '../../src/utils/theme';
import {
  Activity,
  GenderHint,
  packingScore,
  suggestPacking,
  estimateLuggageKg,
} from '../../src/features/smartPacking';
import { useTravelStore } from '../../src/store/travelStore';

const ACTIVITIES: { id: Activity; label: string; icon: keyof typeof MaterialIcons.glyphMap }[] = [
  { id: 'beach', label: 'Beach', icon: 'beach-access' },
  { id: 'hiking', label: 'Hiking', icon: 'terrain' },
  { id: 'business', label: 'Business', icon: 'work' },
  { id: 'wedding', label: 'Wedding', icon: 'favorite' },
  { id: 'city', label: 'City', icon: 'location-city' },
  { id: 'camping', label: 'Camping', icon: 'cabin' },
  { id: 'winter', label: 'Winter', icon: 'ac-unit' },
];

export default function SmartPackingScreen() {
  const { theme } = useThemeContext();
  const trip = useAppStore((s) => s.trips.find((t) => t.status === 'upcoming') ?? null);
  const setEstimatedBagKg = useTravelStore((s) => s.setEstimatedBagKg);

  const [destination, setDestination] = useState(trip?.destination ?? 'Zanzibar');
  const [days, setDays] = useState('5');
  const [temp, setTemp] = useState('29');
  const [rainy, setRainy] = useState(false);
  const [gender, setGender] = useState<GenderHint>('unspecified');
  const [selected, setSelected] = useState<Activity[]>(['beach', 'city']);
  const [accepted, setAccepted] = useState<Record<string, boolean>>({});

  const dayCount = Math.max(1, Number(days) || 1);
  const avgTempC = Number(temp);
  const result = useMemo(
    () =>
      suggestPacking({
        destination,
        days: dayCount,
        month: new Date().getMonth() + 1,
        activities: selected,
        gender,
        avgTempC: Number.isFinite(avgTempC) ? avgTempC : undefined,
        rainy,
      }),
    [destination, dayCount, selected, gender, avgTempC, rainy]
  );

  const checkedCount = Object.values(accepted).filter(Boolean).length;
  const score = packingScore(checkedCount, result.items.length);
  const kg = estimateLuggageKg(checkedCount || result.items.length, dayCount);

  const toggleActivity = (id: Activity) => {
    setSelected((prev) => (prev.includes(id) ? prev.filter((a) => a !== id) : [...prev, id]));
  };

  return (
    <AppBackground>
      <ScreenHeader title="AI Smart Packing" subtitle="Weather & activity aware" />
      <ScrollView contentContainerStyle={styles.pad}>
        <GlassCard contentStyle={{ gap: Spacing.sm }}>
          <Text style={[Typography.small, { color: theme.textSecondary }]}>Destination</Text>
          <Field theme={theme} value={destination} onChangeText={setDestination} placeholder="Where are you going?" />
          <View style={styles.row}>
            <View style={{ flex: 1 }}>
              <Text style={[Typography.small, { color: theme.textSecondary }]}>Days</Text>
              <Field theme={theme} value={days} onChangeText={setDays} keyboardType="number-pad" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[Typography.small, { color: theme.textSecondary }]}>Avg °C</Text>
              <Field theme={theme} value={temp} onChangeText={setTemp} keyboardType="numeric" />
            </View>
          </View>
          <TouchableOpacity style={styles.checkRow} onPress={() => setRainy((v) => !v)} accessibilityRole="checkbox" accessibilityState={{ checked: rainy }}>
            <MaterialIcons name={rainy ? 'check-box' : 'check-box-outline-blank'} size={22} color={Colors.blue} />
            <Text style={[Typography.body, { color: theme.text }]}>Rainy forecast</Text>
          </TouchableOpacity>
          <Text style={[Typography.small, { color: theme.textSecondary }]}>Activities</Text>
          <View style={styles.chips}>
            {ACTIVITIES.map((a) => {
              const on = selected.includes(a.id);
              return (
                <TouchableOpacity
                  key={a.id}
                  onPress={() => toggleActivity(a.id)}
                  style={[styles.chip, { backgroundColor: on ? Colors.blue : theme.bgTertiary }]}
                >
                  <MaterialIcons name={a.icon} size={16} color={on ? '#fff' : Colors.blue} />
                  <Text style={{ color: on ? '#fff' : theme.text, fontSize: 12, fontWeight: '600' }}>{a.label}</Text>
                </TouchableOpacity>
              );
            })}
          </View>
          <Text style={[Typography.small, { color: theme.textSecondary }]}>Gender (optional)</Text>
          <View style={styles.chips}>
            {(['unspecified', 'female', 'male'] as GenderHint[]).map((g) => (
              <TouchableOpacity
                key={g}
                onPress={() => setGender(g)}
                style={[styles.chip, { backgroundColor: gender === g ? Colors.blue : theme.bgTertiary }]}
              >
                <Text style={{ color: gender === g ? '#fff' : theme.text, fontSize: 12, fontWeight: '600' }}>
                  {g === 'unspecified' ? 'Any' : g}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </GlassCard>

        <GlassCard strong contentStyle={{ gap: Spacing.sm }}>
          <View style={styles.scoreRow}>
            <Text style={[Typography.h3, { color: theme.text }]}>Packing readiness</Text>
            <Text style={[Typography.h2, { color: Colors.blue }]}>{score}%</Text>
          </View>
          <Text style={[Typography.body, { color: theme.text }]}>{result.summary}</Text>
          <Text style={[Typography.small, { color: theme.textSecondary }]}>
            Est. luggage ~{kg} kg · {checkedCount}/{result.items.length} accepted
          </Text>
          <GlassButton
            label="Save weight estimate"
            tint={Colors.blue}
            onPress={() => setEstimatedBagKg(kg)}
            textStyle={{ color: '#fff' }}
          />
        </GlassCard>

        {result.items.map((item) => {
          const on = !!accepted[item.id];
          return (
            <TouchableOpacity key={item.id} onPress={() => setAccepted((s) => ({ ...s, [item.id]: !on }))}>
              <GlassCard contentStyle={styles.itemRow}>
                <MaterialIcons
                  name={on ? 'check-circle' : 'radio-button-unchecked'}
                  size={22}
                  color={on ? Colors.green : theme.textTertiary}
                />
                <View style={{ flex: 1, minWidth: 0 }}>
                  <Text style={[Typography.body, { color: theme.text, fontWeight: '600' }]} numberOfLines={1}>
                    {item.label}
                  </Text>
                  <Text style={[Typography.tiny, { color: theme.textSecondary }]} numberOfLines={2}>
                    {item.reason} · {item.category} · {item.priority}
                  </Text>
                </View>
              </GlassCard>
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    </AppBackground>
  );
}

function Field({ theme, style, ...rest }: any) {
  return (
    <TextInput
      placeholderTextColor={theme.textTertiary}
      style={[
        {
          marginTop: 4,
          height: 46,
          borderRadius: Radius.md,
          borderWidth: 1,
          borderColor: theme.border,
          paddingHorizontal: Spacing.md,
          color: theme.text,
          backgroundColor: theme.bgSecondary,
        },
        style,
      ]}
      {...rest}
    />
  );
}

const styles = StyleSheet.create({
  pad: { padding: Spacing.md, paddingBottom: 120, gap: Spacing.sm },
  row: { flexDirection: 'row', gap: Spacing.sm },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: Radius.full,
  },
  checkRow: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 4 },
  scoreRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  itemRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md },
});
