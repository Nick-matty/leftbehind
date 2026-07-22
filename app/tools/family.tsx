import { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TextInput, TouchableOpacity } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { AppBackground } from '../../src/components/AppBackground';
import { GlassCard, GlassButton } from '../../src/components/Glass';
import { ScreenHeader } from '../../src/components/ScreenHeader';
import { useThemeContext } from '../../src/store/settingsStore';
import { FamilyMember, useTravelStore } from '../../src/store/travelStore';
import { useAppStore } from '../../src/store/appStore';
import { Colors, Radius, Spacing, Typography } from '../../src/utils/theme';
import * as Crypto from 'expo-crypto';

export default function FamilyScreen() {
  const { theme } = useThemeContext();
  const family = useTravelStore((s) => s.family);
  const setFamily = useTravelStore((s) => s.setFamily);
  const updateFamilyProgress = useTravelStore((s) => s.updateFamilyProgress);
  const trip = useAppStore((s) => s.trips.find((t) => t.status === 'upcoming') ?? null);
  const [name, setName] = useState('');

  const total = trip?.totalItems ?? 20;

  const addMember = () => {
    if (!name.trim()) return;
    const member: FamilyMember = {
      id: Crypto.randomUUID(),
      name: name.trim(),
      role: 'friend',
      packedCount: 0,
      totalCount: total,
    };
    setFamily([...family, member]);
    setName('');
  };

  return (
    <AppBackground>
      <ScreenHeader title="Family & Shared Lists" subtitle="Monitor packing progress" />
      <ScrollView contentContainerStyle={styles.pad}>
        <GlassCard>
          <Text style={[Typography.body, { color: theme.textSecondary }]}>
            Invite is local on this device for now — each person gets a checklist progress bar. Cloud invites can connect later with Firebase.
          </Text>
        </GlassCard>

        <GlassCard contentStyle={{ gap: Spacing.sm }}>
          <TextInput
            placeholder="Add traveler name"
            placeholderTextColor={theme.textTertiary}
            value={name}
            onChangeText={setName}
            style={[styles.input, { color: theme.text, borderColor: theme.border, backgroundColor: theme.bgSecondary }]}
          />
          <GlassButton label="Add to trip" tint={Colors.blue} textStyle={{ color: '#fff' }} onPress={addMember} />
        </GlassCard>

        {family.map((m) => {
          const pct = Math.round((m.packedCount / Math.max(m.totalCount || total, 1)) * 100);
          return (
            <GlassCard key={m.id} contentStyle={{ gap: Spacing.sm }}>
              <View style={styles.row}>
                <MaterialIcons name="person" size={22} color={Colors.blue} />
                <View style={{ flex: 1 }}>
                  <Text style={[Typography.h3, { color: theme.text }]}>{m.name}</Text>
                  <Text style={[Typography.tiny, { color: theme.textSecondary }]}>
                    {m.packedCount}/{m.totalCount || total} packed · {pct}%
                  </Text>
                </View>
                <Text style={[Typography.h3, { color: pct === 100 ? Colors.green : Colors.amber }]}>
                  {pct === 100 ? 'Done' : 'Open'}
                </Text>
              </View>
              <View style={[styles.track, { backgroundColor: theme.bgTertiary }]}>
                <View style={[styles.fill, { width: `${pct}%`, backgroundColor: Colors.blue }]} />
              </View>
              <View style={styles.row}>
                <TouchableOpacity
                  style={styles.step}
                  onPress={() =>
                    updateFamilyProgress(m.id, Math.max(0, m.packedCount - 1), m.totalCount || total)
                  }
                >
                  <MaterialIcons name="remove" size={20} color={theme.text} />
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.step}
                  onPress={() =>
                    updateFamilyProgress(
                      m.id,
                      Math.min(m.totalCount || total, m.packedCount + 1),
                      m.totalCount || total
                    )
                  }
                >
                  <MaterialIcons name="add" size={20} color={theme.text} />
                </TouchableOpacity>
              </View>
            </GlassCard>
          );
        })}
      </ScrollView>
    </AppBackground>
  );
}

const styles = StyleSheet.create({
  pad: { padding: Spacing.md, paddingBottom: 120, gap: Spacing.sm },
  input: { height: 46, borderRadius: Radius.md, borderWidth: 1, paddingHorizontal: Spacing.md },
  row: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  track: { height: 8, borderRadius: 99, overflow: 'hidden' },
  fill: { height: '100%' },
  step: {
    flex: 1,
    height: 40,
    borderRadius: Radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(59,125,232,0.12)',
  },
});
