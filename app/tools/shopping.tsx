import { Linking, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { AppBackground } from '../../src/components/AppBackground';
import { GlassCard } from '../../src/components/Glass';
import { ScreenHeader } from '../../src/components/ScreenHeader';
import { useThemeContext } from '../../src/store/settingsStore';
import { Colors, Spacing, Typography } from '../../src/utils/theme';

const ITEMS: { label: string; query: string; icon: keyof typeof MaterialIcons.glyphMap }[] = [
  { label: 'Luggage / suitcase', query: 'travel luggage', icon: 'work' },
  { label: 'Phone charger', query: 'usb c phone charger', icon: 'electrical-services' },
  { label: 'Power bank', query: 'power bank 20000mah', icon: 'battery-charging-full' },
  { label: 'Travel adapter', query: 'universal travel adapter', icon: 'power' },
  { label: 'Packing cubes', query: 'packing cubes', icon: 'inventory' },
  { label: 'Travel clothes', query: 'travel clothing essentials', icon: 'checkroom' },
  { label: 'Mosquito repellent', query: 'mosquito repellent travel', icon: 'bug-report' },
  { label: 'Neck pillow', query: 'airplane neck pillow', icon: 'airline-seat-recline-extra' },
];

export default function ShoppingScreen() {
  const { theme } = useThemeContext();

  return (
    <AppBackground>
      <ScreenHeader title="Travel Shop List" subtitle="One-tap search for missing gear" />
      <ScrollView contentContainerStyle={styles.pad}>
        <GlassCard>
          <Text style={[Typography.small, { color: theme.textSecondary }]}>
            Opens a web search for each item. Works when you have a connection — your packing list still works offline.
          </Text>
        </GlassCard>
        {ITEMS.map((item) => (
          <TouchableOpacity
            key={item.label}
            onPress={() => Linking.openURL(`https://www.google.com/search?q=${encodeURIComponent(item.query)}&tbm=shop`)}
          >
            <GlassCard contentStyle={styles.row}>
              <MaterialIcons name={item.icon} size={22} color={Colors.blue} />
              <Text style={[Typography.body, { color: theme.text, flex: 1 }]}>{item.label}</Text>
              <MaterialIcons name="open-in-new" size={18} color={theme.textTertiary} />
            </GlassCard>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </AppBackground>
  );
}

const styles = StyleSheet.create({
  pad: { padding: Spacing.md, paddingBottom: 120, gap: Spacing.sm },
  row: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md },
});
