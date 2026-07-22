import { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TextInput } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { AppBackground } from '../../src/components/AppBackground';
import { GlassCard, GlassButton } from '../../src/components/Glass';
import { ScreenHeader } from '../../src/components/ScreenHeader';
import { useThemeContext } from '../../src/store/settingsStore';
import { useTravelStore } from '../../src/store/travelStore';
import { Colors, Radius, Spacing, Typography } from '../../src/utils/theme';

export default function LoyaltyScreen() {
  const { theme } = useThemeContext();
  const loyalty = useTravelStore((s) => s.loyalty);
  const addLoyalty = useTravelStore((s) => s.addLoyalty);
  const [brand, setBrand] = useState('');
  const [memberId, setMemberId] = useState('');

  return (
    <AppBackground>
      <ScreenHeader title="Loyalty Wallet" subtitle="Memberships & rewards" />
      <ScrollView contentContainerStyle={styles.pad}>
        <GlassCard contentStyle={{ gap: Spacing.sm }}>
          <TextInput placeholder="Airline / hotel brand" value={brand} onChangeText={setBrand} placeholderTextColor={theme.textTertiary} style={[styles.input, field(theme)]} />
          <TextInput placeholder="Member ID / QR text" value={memberId} onChangeText={setMemberId} placeholderTextColor={theme.textTertiary} style={[styles.input, field(theme)]} />
          <GlassButton
            label="Add card"
            tint={Colors.blue}
            textStyle={{ color: '#fff' }}
            onPress={() => {
              if (!brand.trim() || !memberId.trim()) return;
              addLoyalty({ brand: brand.trim(), memberId: memberId.trim() });
              setBrand('');
              setMemberId('');
            }}
          />
        </GlassCard>
        {loyalty.map((c) => (
          <GlassCard key={c.id} contentStyle={styles.row}>
            <MaterialIcons name="card-membership" size={22} color={Colors.blue} />
            <View style={{ flex: 1 }}>
              <Text style={[Typography.h3, { color: theme.text }]}>{c.brand}</Text>
              <Text style={[Typography.small, { color: theme.textSecondary }]}>{c.memberId}</Text>
            </View>
          </GlassCard>
        ))}
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
  row: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md },
});
