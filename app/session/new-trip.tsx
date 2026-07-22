import { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, Alert, Linking, Platform } from 'react-native';
import { router } from 'expo-router';
import { MaterialIcons, MaterialCommunityIcons } from '@expo/vector-icons';
import { VENUES, VenueType } from '../../src/data/venues';
import { useAppStore } from '../../src/store/appStore';
import { useThemeContext } from '../../src/store/settingsStore';
import { GlassCard, GlassButton } from '../../src/components/Glass';
import { Typography, Spacing, Radius, Colors } from '../../src/utils/theme';
import { useT } from '../../src/i18n/useT';
import { requestNotificationPermission, scheduleCheckoutReminder } from '../../src/hooks/useNotifications';

export default function NewTrip() {
  const { theme } = useThemeContext();
  const { t } = useT();
  const createTrip = useAppStore((s) => s.createTrip);

  const [venueId, setVenueId] = useState<VenueType | null>(null);
  const [destination, setDestination] = useState('');
  const [country, setCountry] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [checkInTime, setCheckInTime] = useState('');
  const [checkOutTime, setCheckOutTime] = useState('');
  const [budget, setBudget] = useState('');

  const venue = VENUES.find((v) => v.id === venueId);
  const canSubmit = venueId && destination.trim() && startDate.trim() && endDate.trim();

  const handleCreate = async () => {
    if (!venue) return;
    const id = createTrip({
      destination: destination.trim(),
      country: country.trim(),
      venueId: venue.id,
      venueName: venue.label,
      startDate: startDate.trim(),
      endDate: endDate.trim(),
      checkInTime: checkInTime.trim() || undefined,
      checkOutTime: checkOutTime.trim() || undefined,
      totalItems: venue.checklist.length,
      budgetTotal: Number(budget) || 0,
    });
    const granted = await requestNotificationPermission();
    if (granted) {
      const reminderId = await scheduleCheckoutReminder(id, destination.trim() || venue.label, 30);
      if (reminderId) useAppStore.getState().setReminderId(id, reminderId);
    } else {
      const buttons: { text: string; style?: 'cancel'; onPress?: () => void }[] = [
        { text: t('notNow'), style: 'cancel' },
      ];
      if (Platform.OS !== 'web') {
        buttons.push({ text: t('openSettings'), onPress: () => Linking.openSettings().catch(() => {}) });
      }
      Alert.alert(t('notificationsDeniedTitle'), t('notificationsDeniedBody'), buttons);
    }
    router.replace('/session/active');
  };

  return (
    <View style={{ flex: 1, backgroundColor: theme.bg }}>
      <View style={[styles.header, { paddingTop: 60 }]}>
        <TouchableOpacity onPress={() => router.back()} accessibilityRole="button" accessibilityLabel={t('close')}>
          <MaterialIcons name="close" size={26} color={theme.text} />
        </TouchableOpacity>
        <Text style={[Typography.h3, { color: theme.text }]}>New Trip</Text>
        <View style={{ width: 26 }} />
      </View>

      <ScrollView contentContainerStyle={{ padding: Spacing.lg, gap: Spacing.md, paddingBottom: 60 }}>
        <Text style={[Typography.small, { color: theme.textSecondary }]}>Where are you staying?</Text>
        <View style={styles.venueGrid}>
          {VENUES.map((v) => {
            const selected = v.id === venueId;
            return (
              <TouchableOpacity
                key={v.id}
                onPress={() => setVenueId(v.id)}
                accessibilityRole="button"
                accessibilityState={{ selected }}
                accessibilityLabel={v.label}
                style={[
                  styles.venueTile,
                  { backgroundColor: selected ? Colors.blue : theme.bgSecondary, borderColor: selected ? Colors.blue : theme.border },
                ]}
              >
                <MaterialCommunityIcons name={v.icon as any} size={22} color={selected ? '#fff' : Colors.blue} />
                <Text style={[Typography.tiny, { color: selected ? '#fff' : theme.text, marginTop: 4 }]}>{v.label}</Text>
              </TouchableOpacity>
            );
          })}
        </View>

        <GlassCard style={{ gap: Spacing.sm }}>
          <Field theme={theme} placeholder="Destination (e.g. Zanzibar)" value={destination} onChangeText={setDestination} />
          <Field theme={theme} placeholder="Country" value={country} onChangeText={setCountry} />
          <View style={styles.rowGap}>
            <Field theme={theme} placeholder="Start date (YYYY-MM-DD)" value={startDate} onChangeText={setStartDate} style={{ flex: 1 }} />
            <Field theme={theme} placeholder="End date (YYYY-MM-DD)" value={endDate} onChangeText={setEndDate} style={{ flex: 1 }} />
          </View>
          <View style={styles.rowGap}>
            <Field theme={theme} placeholder="Check-in time" value={checkInTime} onChangeText={setCheckInTime} style={{ flex: 1 }} />
            <Field theme={theme} placeholder="Check-out time" value={checkOutTime} onChangeText={setCheckOutTime} style={{ flex: 1 }} />
          </View>
          <Field theme={theme} placeholder="Budget (optional)" value={budget} onChangeText={setBudget} keyboardType="numeric" />
        </GlassCard>

        <GlassButton onPress={handleCreate} disabled={!canSubmit} style={{ opacity: canSubmit ? 1 : 0.5, backgroundColor: Colors.blue }}>
          <Text style={styles.btnText}>{t('startChecklist')}</Text>
        </GlassButton>
      </ScrollView>
    </View>
  );
}

function Field({ theme, style, ...rest }: any) {
  return (
    <TextInput
      style={[
        { height: 48, borderRadius: Radius.md, borderWidth: 1, borderColor: theme.border, paddingHorizontal: Spacing.md, color: theme.text, backgroundColor: theme.bgSecondary },
        style,
      ]}
      placeholderTextColor={theme.textTertiary}
      {...rest}
    />
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: Spacing.lg },
  venueGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm },
  venueTile: { width: '30%', aspectRatio: 1, borderRadius: Radius.lg, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  rowGap: { flexDirection: 'row', gap: Spacing.sm },
  btnText: { color: '#fff', fontSize: 16, fontWeight: '600' },
});
