import { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TextInput, TouchableOpacity } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { AppBackground } from '../../src/components/AppBackground';
import { GlassCard, GlassButton } from '../../src/components/Glass';
import { ScreenHeader } from '../../src/components/ScreenHeader';
import { useThemeContext } from '../../src/store/settingsStore';
import { useTravelStore } from '../../src/store/travelStore';
import { Colors, Radius, Spacing, Typography } from '../../src/utils/theme';

export default function WishlistScreen() {
  const { theme } = useThemeContext();
  const wishlist = useTravelStore((s) => s.wishlist);
  const addWishlist = useTravelStore((s) => s.addWishlist);
  const removeWishlist = useTravelStore((s) => s.removeWishlist);
  const [destination, setDestination] = useState('');
  const [country, setCountry] = useState('');
  const [note, setNote] = useState('');

  return (
    <AppBackground>
      <ScreenHeader title="Wishlist" subtitle="Dream trips" />
      <ScrollView contentContainerStyle={styles.pad}>
        <GlassCard contentStyle={{ gap: Spacing.sm }}>
          <TextInput placeholder="Destination" value={destination} onChangeText={setDestination} placeholderTextColor={theme.textTertiary} style={[styles.input, field(theme)]} />
          <TextInput placeholder="Country" value={country} onChangeText={setCountry} placeholderTextColor={theme.textTertiary} style={[styles.input, field(theme)]} />
          <TextInput placeholder="Why / when?" value={note} onChangeText={setNote} placeholderTextColor={theme.textTertiary} style={[styles.input, field(theme)]} />
          <GlassButton
            label="Save dream trip"
            tint={Colors.blue}
            textStyle={{ color: '#fff' }}
            onPress={() => {
              if (!destination.trim()) return;
              addWishlist({ destination: destination.trim(), country: country.trim(), note: note.trim() || undefined });
              setDestination('');
              setCountry('');
              setNote('');
            }}
          />
        </GlassCard>
        {wishlist.map((w) => (
          <GlassCard key={w.id} contentStyle={styles.row}>
            <MaterialIcons name="favorite" size={20} color={Colors.red} />
            <View style={{ flex: 1, minWidth: 0 }}>
              <Text style={[Typography.h3, { color: theme.text }]} numberOfLines={1}>
                {w.destination}{w.country ? `, ${w.country}` : ''}
              </Text>
              {!!w.note && <Text style={[Typography.small, { color: theme.textSecondary }]}>{w.note}</Text>}
            </View>
            <TouchableOpacity onPress={() => removeWishlist(w.id)}>
              <MaterialIcons name="close" size={20} color={theme.textTertiary} />
            </TouchableOpacity>
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
