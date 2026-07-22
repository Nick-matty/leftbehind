import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { AppBackground } from '../../src/components/AppBackground';
import { GlassCard } from '../../src/components/Glass';
import { ScreenHeader } from '../../src/components/ScreenHeader';
import { useThemeContext } from '../../src/store/settingsStore';
import { useAppStore } from '../../src/store/appStore';
import { findGuide } from '../../src/features/guides';
import { Colors, Spacing, Typography } from '../../src/utils/theme';

function Section({
  icon,
  title,
  items,
  theme,
}: {
  icon: keyof typeof MaterialIcons.glyphMap;
  title: string;
  items: string[];
  theme: any;
}) {
  return (
    <GlassCard contentStyle={{ gap: 8 }}>
      <View style={styles.head}>
        <MaterialIcons name={icon} size={20} color={Colors.blue} />
        <Text style={[Typography.h3, { color: theme.text }]}>{title}</Text>
      </View>
      {items.map((item) => (
        <Text key={item} style={[Typography.body, { color: theme.textSecondary }]}>
          · {item}
        </Text>
      ))}
    </GlassCard>
  );
}

export default function GuideScreen() {
  const { theme } = useThemeContext();
  const trip = useAppStore((s) => s.trips.find((t) => t.status === 'upcoming') ?? null);
  const guide = findGuide(trip?.destination ?? 'Zanzibar', trip?.country ?? 'Tanzania');

  return (
    <AppBackground>
      <ScreenHeader title="Local Guide" subtitle={`${guide.destination}, ${guide.country}`} />
      <ScrollView contentContainerStyle={styles.pad}>
        <Section icon="restaurant" title="Best food" items={guide.bestFood} theme={theme} />
        <Section icon="place" title="Attractions" items={guide.attractions} theme={theme} />
        <Section icon="health-and-safety" title="Safety tips" items={guide.safetyTips} theme={theme} />
        <Section icon="diversity-3" title="Local customs" items={guide.customs} theme={theme} />
        <Section icon="directions-transit" title="Public transport" items={guide.transport} theme={theme} />
        <GlassCard contentStyle={{ gap: 6 }}>
          <Text style={[Typography.h3, { color: theme.text }]}>Emergency numbers</Text>
          <Text style={[Typography.body, { color: theme.textSecondary }]}>Police: {guide.emergency.police}</Text>
          <Text style={[Typography.body, { color: theme.textSecondary }]}>Ambulance: {guide.emergency.ambulance}</Text>
          <Text style={[Typography.body, { color: theme.textSecondary }]}>General: {guide.emergency.general}</Text>
        </GlassCard>
      </ScrollView>
    </AppBackground>
  );
}

const styles = StyleSheet.create({
  pad: { padding: Spacing.md, paddingBottom: 120, gap: Spacing.sm },
  head: { flexDirection: 'row', alignItems: 'center', gap: 8 },
});
