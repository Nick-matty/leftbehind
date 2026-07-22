import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { router } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialIcons } from '@expo/vector-icons';
import { Typography, Spacing, GradientStops, Radius } from '../src/utils/theme';
import { useAppStore } from '../src/store/appStore';
import { GlassCard, GlassButton, ScreenNarrow } from '../src/components/Glass';
import { useT } from '../src/i18n/useT';

const FEATURES: {
  icon: keyof typeof MaterialIcons.glyphMap;
  textKey: 'featureHotels' | 'featureTopMiss' | 'featureReminders' | 'featureBlindSpots';
}[] = [
  { icon: 'hotel', textKey: 'featureHotels' },
  { icon: 'bolt', textKey: 'featureTopMiss' },
  { icon: 'notifications-active', textKey: 'featureReminders' },
  { icon: 'insights', textKey: 'featureBlindSpots' },
];

export default function Onboarding() {
  const completeOnboarding = useAppStore((s) => s.completeOnboarding);
  const { t } = useT();

  const handleContinue = () => {
    completeOnboarding();
    router.replace('/auth/login');
  };

  return (
    <LinearGradient colors={GradientStops.auth} style={styles.flex}>
      <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
        <ScreenNarrow>
          <View style={styles.hero}>
            <View style={styles.logoWrap}>
              <MaterialIcons name="card-travel" size={40} color="#fff" />
            </View>
            <Text style={[Typography.h1, styles.title]}>{t('appName')}</Text>
            <Text style={styles.tagline}>{t('tagline')}</Text>
          </View>

          <GlassCard variant="overlay" contentStyle={styles.featureCard}>
            {FEATURES.map((f) => (
              <View key={f.textKey} style={styles.featureRow}>
                <View style={styles.featureIcon}>
                  <MaterialIcons name={f.icon} size={20} color="#fff" />
                </View>
                <Text style={styles.featureText}>{t(f.textKey)}</Text>
              </View>
            ))}
          </GlassCard>

          <GlassButton
            variant="overlay"
            style={{ marginTop: Spacing.lg }}
            onPress={handleContinue}
            accessibilityRole="button"
            accessibilityLabel={t('continueLabel')}
          >
            <Text style={styles.btnText}>{t('continueLabel')}</Text>
            <MaterialIcons name="arrow-forward" size={20} color="#fff" />
          </GlassButton>
        </ScreenNarrow>
      </ScrollView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  container: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingHorizontal: Spacing.lg,
    paddingTop: 72,
    paddingBottom: 48,
  },
  hero: { alignItems: 'center', marginBottom: Spacing.xl },
  logoWrap: {
    width: 88,
    height: 88,
    borderRadius: 24,
    backgroundColor: 'rgba(255,255,255,0.18)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.md,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.35)',
  },
  title: { color: '#fff', marginBottom: Spacing.xs, textAlign: 'center' },
  tagline: {
    color: 'rgba(255,255,255,0.88)',
    fontSize: 14,
    textAlign: 'center',
    letterSpacing: 0.3,
    paddingHorizontal: Spacing.md,
  },
  featureCard: { gap: Spacing.sm },
  featureRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    paddingVertical: 6,
  },
  featureIcon: {
    width: 36,
    height: 36,
    borderRadius: Radius.md,
    backgroundColor: 'rgba(255,255,255,0.14)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  featureText: { color: '#fff', fontSize: 14, flex: 1, flexShrink: 1, lineHeight: 20 },
  btnText: { color: '#fff', fontSize: 16, fontWeight: '600' },
});
