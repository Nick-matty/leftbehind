import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { AppBackground } from '../../src/components/AppBackground';
import { GlassCard } from '../../src/components/Glass';
import { ScreenHeader } from '../../src/components/ScreenHeader';
import { useThemeContext } from '../../src/store/settingsStore';
import { useTravelStore } from '../../src/store/travelStore';
import { AIRLINES, baggageWarning, getAirline } from '../../src/features/airlines';
import { Colors, Radius, Spacing, Typography } from '../../src/utils/theme';
import { useState } from 'react';

export default function BaggageScreen() {
  const { theme } = useThemeContext();
  const preferredAirlineId = useTravelStore((s) => s.preferredAirlineId);
  const setPreferredAirline = useTravelStore((s) => s.setPreferredAirline);
  const estimatedBagKg = useTravelStore((s) => s.estimatedBagKg);
  const setEstimatedBagKg = useTravelStore((s) => s.setEstimatedBagKg);
  const [kgText, setKgText] = useState(String(estimatedBagKg || 26));

  const airline = getAirline(preferredAirlineId) ?? AIRLINES[0];
  const kg = Number(kgText) || 0;
  const warning = baggageWarning(kg, airline);

  return (
    <AppBackground>
      <ScreenHeader title="Baggage Assistant" subtitle="Airline limits" />
      <ScrollView contentContainerStyle={styles.pad}>
        <GlassCard contentStyle={{ gap: Spacing.sm }}>
          <Text style={[Typography.small, { color: theme.textSecondary }]}>Estimated luggage (kg)</Text>
          <TextInput
            value={kgText}
            onChangeText={(v) => {
              setKgText(v);
              setEstimatedBagKg(Number(v) || 0);
            }}
            keyboardType="numeric"
            placeholderTextColor={theme.textTertiary}
            style={[styles.input, { color: theme.text, borderColor: theme.border, backgroundColor: theme.bgSecondary }]}
          />
          {warning && (
            <View
              style={[
                styles.banner,
                { backgroundColor: warning.level === 'over' ? Colors.redLight : Colors.greenLight },
              ]}
            >
              <MaterialIcons
                name={warning.level === 'over' ? 'warning' : 'check-circle'}
                size={20}
                color={warning.level === 'over' ? Colors.red : Colors.green}
              />
              <Text
                style={[
                  Typography.small,
                  { color: warning.level === 'over' ? Colors.red : Colors.green, flex: 1 },
                ]}
              >
                {warning.message}
              </Text>
            </View>
          )}
        </GlassCard>

        {AIRLINES.map((a) => {
          const selected = a.id === preferredAirlineId;
          return (
            <TouchableOpacity key={a.id} onPress={() => setPreferredAirline(a.id)}>
              <GlassCard
                strong={selected}
                contentStyle={{ gap: 6, borderColor: selected ? Colors.blue : undefined }}
              >
                <View style={styles.row}>
                  <Text style={[Typography.h3, { color: theme.text, flex: 1 }]}>{a.name}</Text>
                  {selected && <MaterialIcons name="check-circle" size={20} color={Colors.blue} />}
                </View>
                <Text style={[Typography.small, { color: theme.textSecondary }]}>Carry-on: {a.carryOn}</Text>
                <Text style={[Typography.small, { color: theme.textSecondary }]}>Checked: {a.checked}</Text>
                {a.restricted.length > 0 && (
                  <Text style={[Typography.tiny, { color: theme.textTertiary }]}>
                    Restricted: {a.restricted.join(' · ')}
                  </Text>
                )}
              </GlassCard>
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    </AppBackground>
  );
}

const styles = StyleSheet.create({
  pad: { padding: Spacing.md, paddingBottom: 120, gap: Spacing.sm },
  input: { height: 46, borderRadius: Radius.md, borderWidth: 1, paddingHorizontal: Spacing.md, marginTop: 4 },
  banner: { flexDirection: 'row', gap: 8, padding: 12, borderRadius: Radius.md, alignItems: 'center' },
  row: { flexDirection: 'row', alignItems: 'center' },
});
