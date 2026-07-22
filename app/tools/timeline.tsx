import { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TextInput, TouchableOpacity } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { AppBackground } from '../../src/components/AppBackground';
import { GlassCard, GlassButton } from '../../src/components/Glass';
import { ScreenHeader } from '../../src/components/ScreenHeader';
import { useThemeContext } from '../../src/store/settingsStore';
import { useTravelStore } from '../../src/store/travelStore';
import { useAppStore } from '../../src/store/appStore';
import { Colors, Radius, Spacing, Typography } from '../../src/utils/theme';

export default function TimelineScreen() {
  const { theme } = useThemeContext();
  const trip = useAppStore((s) => s.trips.find((t) => t.status === 'upcoming') ?? null);
  const timeline = useTravelStore((s) => s.timeline);
  const addTimelineStop = useTravelStore((s) => s.addTimelineStop);
  const toggleTimeline = useTravelStore((s) => s.toggleTimeline);
  const [day, setDay] = useState('1');
  const [title, setTitle] = useState('');

  const tripId = trip?.id ?? 'general';
  const stops = timeline.filter((t) => t.tripId === tripId).sort((a, b) => a.day - b.day || a.title.localeCompare(b.title));
  const byDay = stops.reduce<Record<number, typeof stops>>((acc, s) => {
    (acc[s.day] ??= []).push(s);
    return acc;
  }, {});

  return (
    <AppBackground>
      <ScreenHeader title="Interactive Timeline" subtitle={trip ? trip.destination : 'Plan your days'} />
      <ScrollView contentContainerStyle={styles.pad}>
        <GlassCard contentStyle={{ gap: Spacing.sm }}>
          <View style={styles.row}>
            <TextInput
              placeholder="Day #"
              keyboardType="number-pad"
              value={day}
              onChangeText={setDay}
              placeholderTextColor={theme.textTertiary}
              style={[styles.dayInput, field(theme)]}
            />
            <TextInput
              placeholder="Hotel, Beach, Safari…"
              value={title}
              onChangeText={setTitle}
              placeholderTextColor={theme.textTertiary}
              style={[styles.titleInput, field(theme)]}
            />
          </View>
          <GlassButton
            label="Add stop"
            tint={Colors.blue}
            textStyle={{ color: '#fff' }}
            onPress={() => {
              if (!title.trim()) return;
              addTimelineStop({ tripId, day: Math.max(1, Number(day) || 1), title: title.trim(), done: false });
              setTitle('');
            }}
          />
        </GlassCard>

        {Object.keys(byDay).length === 0 ? (
          <GlassCard>
            <Text style={[Typography.body, { color: theme.textSecondary, textAlign: 'center' }]}>
              Add Day 1 Hotel, Day 1 Beach, Day 2 Safari…
            </Text>
          </GlassCard>
        ) : (
          Object.entries(byDay).map(([d, list]) => (
            <View key={d} style={{ gap: 8 }}>
              <Text style={[Typography.h3, { color: theme.text, marginLeft: 4 }]}>Day {d}</Text>
              {list.map((s) => (
                <TouchableOpacity key={s.id} onPress={() => toggleTimeline(s.id)}>
                  <GlassCard contentStyle={styles.row}>
                    <MaterialIcons
                      name={s.done ? 'check-circle' : 'radio-button-unchecked'}
                      size={22}
                      color={s.done ? Colors.green : theme.textTertiary}
                    />
                    <Text
                      style={[
                        Typography.body,
                        {
                          color: theme.text,
                          flex: 1,
                          textDecorationLine: s.done ? 'line-through' : 'none',
                        },
                      ]}
                    >
                      {s.title}
                    </Text>
                  </GlassCard>
                </TouchableOpacity>
              ))}
            </View>
          ))
        )}
      </ScrollView>
    </AppBackground>
  );
}

function field(theme: any) {
  return { color: theme.text, borderColor: theme.border, backgroundColor: theme.bgSecondary };
}

const styles = StyleSheet.create({
  pad: { padding: Spacing.md, paddingBottom: 120, gap: Spacing.sm },
  row: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  dayInput: { width: 64, height: 46, borderRadius: Radius.md, borderWidth: 1, paddingHorizontal: 8, textAlign: 'center' },
  titleInput: { flex: 1, height: 46, borderRadius: Radius.md, borderWidth: 1, paddingHorizontal: Spacing.md },
});
