import { useEffect, useMemo, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TextInput } from 'react-native';
import { AppBackground } from '../../src/components/AppBackground';
import { GlassCard } from '../../src/components/Glass';
import { ScreenHeader } from '../../src/components/ScreenHeader';
import { useThemeContext, useSettingsStore } from '../../src/store/settingsStore';
import { useAppStore } from '../../src/store/appStore';
import { convert, CURRENCY_META, currencyForCountry, RATES_USD } from '../../src/features/currency';
import { refreshRatesIfStale } from '../../src/features/liveRates';
import { useOnlineStatus } from '../../src/utils/network';
import { Colors, Radius, Spacing, Typography } from '../../src/utils/theme';

export default function CurrencyScreen() {
  const { theme } = useThemeContext();
  const online = useOnlineStatus();
  const homeCurrency = useSettingsStore((s) => s.personal.homeCurrency || 'USD');
  const trip = useAppStore((s) => s.trips.find((t) => t.status === 'upcoming') ?? null);
  const local = currencyForCountry(trip?.country ?? trip?.destination ?? '');
  const [amount, setAmount] = useState('100');
  const [from, setFrom] = useState(homeCurrency);
  const [to, setTo] = useState(local || homeCurrency);
  const [tick, setTick] = useState(0);

  useEffect(() => {
    setFrom(homeCurrency);
  }, [homeCurrency]);

  useEffect(() => {
    if (!online) return;
    void refreshRatesIfStale().then((updated) => {
      if (updated) setTick((n) => n + 1);
    });
  }, [online]);

  const value = useMemo(() => convert(Number(amount) || 0, from, to), [amount, from, to, tick]);
  const meta = CURRENCY_META[to] ?? CURRENCY_META.USD;

  return (
    <AppBackground>
      <ScreenHeader
        title="Currency Converter"
        subtitle={online ? `Home ${homeCurrency} · live rates when available` : `Home ${homeCurrency} · offline snapshot`}
      />
      <ScrollView contentContainerStyle={styles.pad}>
        <GlassCard contentStyle={{ gap: Spacing.sm }}>
          <Text style={[Typography.small, { color: theme.textSecondary }]}>Amount</Text>
          <TextInput
            value={amount}
            onChangeText={setAmount}
            keyboardType="numeric"
            placeholderTextColor={theme.textTertiary}
            style={[styles.input, { color: theme.text, borderColor: theme.border, backgroundColor: theme.bgSecondary }]}
          />
          <Text style={[Typography.small, { color: theme.textSecondary }]}>From → To (codes)</Text>
          <View style={styles.row}>
            <TextInput value={from} onChangeText={(v) => setFrom(v.toUpperCase())} style={[styles.input, styles.half, field(theme)]} />
            <TextInput value={to} onChangeText={(v) => setTo(v.toUpperCase())} style={[styles.input, styles.half, field(theme)]} />
          </View>
          <Text style={[Typography.h2, { color: Colors.blue }]}>
            {value == null ? 'Unknown currency' : `${meta.symbol}${value.toFixed(2)} ${to}`}
          </Text>
        </GlassCard>

        <GlassCard contentStyle={{ gap: 6 }}>
          <Text style={[Typography.h3, { color: theme.text }]}>{meta.name}</Text>
          <Text style={[Typography.body, { color: theme.textSecondary }]}>Typical meal: {meta.typicalMeal}</Text>
          <Text style={[Typography.body, { color: theme.textSecondary }]}>Tipping: {meta.tipping}</Text>
        </GlassCard>

        <GlassCard>
          <Text style={[Typography.tiny, { color: theme.textTertiary }]}>
            Supported: {Object.keys(RATES_USD).join(', ')}
          </Text>
        </GlassCard>
      </ScrollView>
    </AppBackground>
  );
}

function field(theme: any) {
  return { color: theme.text, borderColor: theme.border, backgroundColor: theme.bgSecondary };
}

const styles = StyleSheet.create({
  pad: { padding: Spacing.md, paddingBottom: 120, gap: Spacing.sm },
  input: { height: 46, borderRadius: Radius.md, borderWidth: 1, paddingHorizontal: Spacing.md },
  row: { flexDirection: 'row', gap: Spacing.sm },
  half: { flex: 1 },
});
