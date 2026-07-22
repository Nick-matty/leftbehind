import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { router } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import { AppBackground } from '../../src/components/AppBackground';
import { GlassCard } from '../../src/components/Glass';
import { ScreenHeader } from '../../src/components/ScreenHeader';
import { useThemeContext } from '../../src/store/settingsStore';
import { Colors, Spacing, Typography, Radius } from '../../src/utils/theme';

const TOOLS: {
  href: string;
  icon: keyof typeof MaterialIcons.glyphMap;
  title: string;
  blurb: string;
}[] = [
  { href: '/tools/smart-packing', icon: 'auto-awesome', title: 'AI Smart Packing', blurb: 'Weather, activities & trip-aware suggestions' },
  { href: '/tools/baggage', icon: 'work', title: 'Baggage Assistant', blurb: 'Airline limits & overweight warnings' },
  { href: '/tools/insights', icon: 'psychology', title: 'Forgetfulness Insights', blurb: 'What you leave behind most' },
  { href: '/tools/vault', icon: 'fingerprint', title: 'Secure Document Vault', blurb: 'PIN + fingerprint lock for passports & tickets' },
  { href: '/tools/sos', icon: 'emergency', title: 'Emergency SOS', blurb: 'Share location & alert family' },
  { href: '/tools/family', icon: 'groups', title: 'Family Trips', blurb: 'Shared packing progress' },
  { href: '/tools/journal', icon: 'photo-camera', title: 'Trip Journal', blurb: 'Photos, notes & places' },
  { href: '/tools/timeline', icon: 'timeline', title: 'Trip Timeline', blurb: 'Day-by-day itinerary checks' },
  { href: '/tools/guide', icon: 'travel-explore', title: 'Local Guide', blurb: 'Food, safety, customs, emergency #' },
  { href: '/tools/currency', icon: 'currency-exchange', title: 'Currency', blurb: 'Offline rates & tipping tips' },
  { href: '/tools/phrasebook', icon: 'translate', title: 'Phrasebook', blurb: 'Offline essentials' },
  { href: '/tools/wishlist', icon: 'favorite', title: 'Wishlist', blurb: 'Dream destinations' },
  { href: '/tools/achievements', icon: 'emoji-events', title: 'Achievements', blurb: 'Stamps & travel badges' },
  { href: '/tools/stats', icon: 'insights', title: 'Travel Stats', blurb: 'Countries, spend, nights away' },
  { href: '/tools/loyalty', icon: 'card-membership', title: 'Loyalty Wallet', blurb: 'Airline & hotel memberships' },
  { href: '/tools/shopping', icon: 'shopping-bag', title: 'Travel Shop List', blurb: 'Adapters, power banks & more' },
];

export default function ToolsHub() {
  const { theme } = useThemeContext();

  return (
    <AppBackground>
      <ScreenHeader title="Travel Tools" subtitle="Premium LeftBehind features" />
      <ScrollView contentContainerStyle={styles.list}>
        {TOOLS.map((tool) => (
          <TouchableOpacity
            key={tool.href}
            onPress={() => router.push(tool.href as any)}
            accessibilityRole="button"
            accessibilityLabel={tool.title}
            activeOpacity={0.85}
          >
            <GlassCard contentStyle={styles.row}>
              <View style={[styles.iconWrap, { backgroundColor: Colors.blueLight }]}>
                <MaterialIcons name={tool.icon} size={22} color={Colors.blue} />
              </View>
              <View style={styles.textCol}>
                <Text style={[Typography.h3, { color: theme.text }]} numberOfLines={1}>
                  {tool.title}
                </Text>
                <Text style={[Typography.small, { color: theme.textSecondary }]} numberOfLines={2}>
                  {tool.blurb}
                </Text>
              </View>
              <MaterialIcons name="chevron-right" size={22} color={theme.textTertiary} />
            </GlassCard>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </AppBackground>
  );
}

const styles = StyleSheet.create({
  list: { padding: Spacing.md, paddingBottom: 120, gap: Spacing.sm },
  row: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md },
  iconWrap: {
    width: 44,
    height: 44,
    borderRadius: Radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  textCol: { flex: 1, minWidth: 0, gap: 2 },
});
