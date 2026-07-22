import { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { AppBackground } from '../../src/components/AppBackground';
import { GlassCard } from '../../src/components/Glass';
import { ScreenHeader } from '../../src/components/ScreenHeader';
import { useThemeContext } from '../../src/store/settingsStore';
import { useAppStore } from '../../src/store/appStore';
import { getPhrases, PHRASE_LANGS, PhraseLang, phraseLangForCountry } from '../../src/features/phrasebook';
import { Colors, Radius, Spacing, Typography } from '../../src/utils/theme';

export default function PhrasebookScreen() {
  const { theme } = useThemeContext();
  const trip = useAppStore((s) => s.trips.find((t) => t.status === 'upcoming') ?? null);
  const [lang, setLang] = useState<PhraseLang>(phraseLangForCountry(trip?.country ?? ''));
  const phrases = getPhrases(lang);

  return (
    <AppBackground>
      <ScreenHeader title="Phrasebook" subtitle="Works fully offline" />
      <ScrollView contentContainerStyle={styles.pad}>
        <View style={styles.chips}>
          {PHRASE_LANGS.map((l) => (
            <TouchableOpacity
              key={l.code}
              onPress={() => setLang(l.code)}
              style={[styles.chip, { backgroundColor: lang === l.code ? Colors.blue : theme.bgTertiary }]}
            >
              <Text style={{ color: lang === l.code ? '#fff' : theme.text, fontWeight: '600', fontSize: 12 }}>
                {l.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
        {phrases.map((p) => (
          <GlassCard key={p.en} contentStyle={{ gap: 4 }}>
            <Text style={[Typography.small, { color: theme.textSecondary }]}>{p.en}</Text>
            <Text style={[Typography.h3, { color: theme.text }]}>{p.local}</Text>
          </GlassCard>
        ))}
      </ScrollView>
    </AppBackground>
  );
}

const styles = StyleSheet.create({
  pad: { padding: Spacing.md, paddingBottom: 120, gap: Spacing.sm },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: Radius.full },
});
