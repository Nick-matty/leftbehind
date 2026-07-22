import { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TextInput, TouchableOpacity, Linking, Alert, Platform } from 'react-native';
import * as Location from 'expo-location';
import { MaterialIcons } from '@expo/vector-icons';
import { AppBackground } from '../../src/components/AppBackground';
import { GlassCard, GlassButton } from '../../src/components/Glass';
import { ScreenHeader } from '../../src/components/ScreenHeader';
import { useThemeContext } from '../../src/store/settingsStore';
import { useTravelStore } from '../../src/store/travelStore';
import { useAppStore } from '../../src/store/appStore';
import { Colors, Radius, Spacing, Typography } from '../../src/utils/theme';
import { findGuide } from '../../src/features/guides';

export default function SosScreen() {
  const { theme } = useThemeContext();
  const contacts = useTravelStore((s) => s.sosContacts);
  const addSosContact = useTravelStore((s) => s.addSosContact);
  const removeSosContact = useTravelStore((s) => s.removeSosContact);
  const trip = useAppStore((s) => s.trips.find((t) => t.status === 'upcoming') ?? null);
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');

  const guide = findGuide(trip?.destination ?? '', trip?.country);

  const shareLocation = async () => {
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Location needed', 'Allow location to share your position.');
      return;
    }
    const pos = await Location.getCurrentPositionAsync({});
    const url = `https://maps.google.com/?q=${pos.coords.latitude},${pos.coords.longitude}`;
    const body = `LeftBehind SOS — I need help. My location: ${url}`;
    const sms = contacts[0]?.phone
      ? `sms:${contacts[0].phone}${Platform.OS === 'ios' ? '&' : '?'}body=${encodeURIComponent(body)}`
      : null;
    if (sms) Linking.openURL(sms).catch(() => Linking.openURL(url));
    else Linking.openURL(url);
  };

  const callEmergency = () => {
    const number = guide.emergency.general.replace(/\D/g, '') || '112';
    Linking.openURL(`tel:${number}`);
  };

  const shareItinerary = () => {
    if (!trip) {
      Alert.alert('No trip', 'Create a trip first to share an itinerary.');
      return;
    }
    const text = `Trip: ${trip.destination}, ${trip.country}\n${trip.startDate} → ${trip.endDate}\nCheck-in ${trip.checkInTime ?? '—'} · Check-out ${trip.checkOutTime ?? '—'}`;
    const sms = contacts[0]?.phone
      ? `sms:${contacts[0].phone}${Platform.OS === 'ios' ? '&' : '?'}body=${encodeURIComponent(text)}`
      : null;
    if (sms) Linking.openURL(sms);
    else Alert.alert('Itinerary', text);
  };

  return (
    <AppBackground>
      <ScreenHeader title="Emergency SOS" subtitle={`Local emergency: ${guide.emergency.general}`} />
      <ScrollView contentContainerStyle={styles.pad}>
        <GlassButton
          label="Share my location"
          tint={Colors.red}
          onPress={shareLocation}
          textStyle={{ color: '#fff' }}
        />
        <GlassButton label="Call emergency services" tint={Colors.blue} onPress={callEmergency} textStyle={{ color: '#fff' }} />
        <GlassButton label="Share trip itinerary" onPress={shareItinerary} />

        <GlassCard contentStyle={{ gap: Spacing.sm }}>
          <Text style={[Typography.h3, { color: theme.text }]}>Family contacts</Text>
          <TextInput
            placeholder="Name"
            placeholderTextColor={theme.textTertiary}
            value={name}
            onChangeText={setName}
            style={[styles.input, field(theme)]}
          />
          <TextInput
            placeholder="Phone"
            placeholderTextColor={theme.textTertiary}
            value={phone}
            onChangeText={setPhone}
            keyboardType="phone-pad"
            style={[styles.input, field(theme)]}
          />
          <GlassButton
            label="Add contact"
            tint={Colors.blue}
            textStyle={{ color: '#fff' }}
            onPress={() => {
              if (!name.trim() || !phone.trim()) return;
              addSosContact({ name: name.trim(), phone: phone.trim() });
              setName('');
              setPhone('');
            }}
          />
        </GlassCard>

        {contacts.map((c) => (
          <GlassCard key={c.id} contentStyle={styles.row}>
            <MaterialIcons name="phone" size={20} color={Colors.blue} />
            <View style={{ flex: 1 }}>
              <Text style={[Typography.body, { color: theme.text }]}>{c.name}</Text>
              <Text style={[Typography.tiny, { color: theme.textSecondary }]}>{c.phone}</Text>
            </View>
            <TouchableOpacity onPress={() => Linking.openURL(`tel:${c.phone}`)}>
              <MaterialIcons name="call" size={22} color={Colors.green} />
            </TouchableOpacity>
            <TouchableOpacity onPress={() => removeSosContact(c.id)}>
              <MaterialIcons name="close" size={22} color={Colors.red} />
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
  row: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
});
