import { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TextInput, TouchableOpacity, Alert, Image } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { MaterialIcons } from '@expo/vector-icons';
import { AppBackground } from '../../src/components/AppBackground';
import { GlassCard, GlassButton } from '../../src/components/Glass';
import { ScreenHeader } from '../../src/components/ScreenHeader';
import { VaultLockGate } from '../../src/components/VaultLockGate';
import { VaultDocImage } from '../../src/components/VaultDocImage';
import { useThemeContext } from '../../src/store/settingsStore';
import { DocType, useTravelStore } from '../../src/store/travelStore';
import { useSecurityStore } from '../../src/store/securityStore';
import { uploadDocumentImage, deleteDocumentImage } from '../../src/features/cloud/fileSync';
import { Colors, Radius, Spacing, Typography } from '../../src/utils/theme';

const TYPES: { id: DocType; label: string; icon: keyof typeof MaterialIcons.glyphMap }[] = [
  { id: 'passport', label: 'Passport', icon: 'badge' },
  { id: 'visa', label: 'Visa', icon: 'assignment' },
  { id: 'flight', label: 'Flight', icon: 'flight' },
  { id: 'hotel', label: 'Hotel', icon: 'hotel' },
  { id: 'vaccination', label: 'Vaccine', icon: 'medical-services' },
  { id: 'insurance', label: 'Insurance', icon: 'health-and-safety' },
  { id: 'other', label: 'Other', icon: 'description' },
];

export default function VaultScreen() {
  const { theme } = useThemeContext();
  const documents = useTravelStore((s) => s.documents);
  const addDocument = useTravelStore((s) => s.addDocument);
  const removeDocument = useTravelStore((s) => s.removeDocument);
  const lockVault = useSecurityStore((s) => s.lockVault);
  const [type, setType] = useState<DocType>('passport');
  const [title, setTitle] = useState('');
  const [notes, setNotes] = useState('');
  const [imageUri, setImageUri] = useState<string | undefined>();

  const scan = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Camera needed', 'Allow camera access to scan documents.');
      return;
    }
    const result = await ImagePicker.launchCameraAsync({
      quality: 0.7,
      allowsEditing: true,
      aspect: [3, 4],
    });
    if (!result.canceled && result.assets[0]) setImageUri(result.assets[0].uri);
  };

  const pick = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') return;
    const result = await ImagePicker.launchImageLibraryAsync({
      quality: 0.7,
      allowsEditing: true,
    });
    if (!result.canceled && result.assets[0]) setImageUri(result.assets[0].uri);
  };

  const save = () => {
    if (!title.trim()) {
      Alert.alert('Add a title', 'e.g. Passport — Jane Doe');
      return;
    }
    const newId = addDocument({ type, title: title.trim(), notes: notes.trim() || undefined, imageUri });
    // Encrypt + upload the image so it syncs to your other devices (best-effort).
    if (imageUri) void uploadDocumentImage(newId, imageUri);
    setTitle('');
    setNotes('');
    setImageUri(undefined);
  };

  const handleRemove = (docId: string) => {
    removeDocument(docId);
    void deleteDocumentImage(docId);
  };

  return (
    <AppBackground>
      <ScreenHeader title="Document Vault" subtitle="PIN + fingerprint protected" />
      <VaultLockGate>
        <ScrollView contentContainerStyle={styles.pad}>
          <GlassCard contentStyle={{ gap: Spacing.sm }}>
            <View style={styles.lockRow}>
              <MaterialIcons name="verified-user" size={20} color={Colors.green} />
              <Text style={[Typography.small, { color: theme.textSecondary, flex: 1 }]}>
                Unlocked for this session. Documents stay on-device. Lock when you leave.
              </Text>
              <TouchableOpacity onPress={lockVault} accessibilityRole="button" accessibilityLabel="Lock vault">
                <MaterialIcons name="lock" size={22} color={Colors.blue} />
              </TouchableOpacity>
            </View>
            <View style={styles.chips}>
              {TYPES.map((t) => (
                <TouchableOpacity
                  key={t.id}
                  onPress={() => setType(t.id)}
                  style={[styles.chip, { backgroundColor: type === t.id ? Colors.blue : theme.bgTertiary }]}
                >
                  <MaterialIcons name={t.icon} size={14} color={type === t.id ? '#fff' : Colors.blue} />
                  <Text style={{ color: type === t.id ? '#fff' : theme.text, fontSize: 11, fontWeight: '600' }}>
                    {t.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
            <TextInput
              placeholder="Title"
              placeholderTextColor={theme.textTertiary}
              value={title}
              onChangeText={setTitle}
              style={[styles.input, { color: theme.text, borderColor: theme.border, backgroundColor: theme.bgSecondary }]}
            />
            <TextInput
              placeholder="Notes (optional)"
              placeholderTextColor={theme.textTertiary}
              value={notes}
              onChangeText={setNotes}
              style={[styles.input, { color: theme.text, borderColor: theme.border, backgroundColor: theme.bgSecondary }]}
            />
            {imageUri ? <Image source={{ uri: imageUri }} style={styles.preview} /> : null}
            <View style={styles.row}>
              <GlassButton label="Scan" style={{ flex: 1 }} onPress={scan} />
              <GlassButton label="Gallery" style={{ flex: 1 }} onPress={pick} />
            </View>
            <GlassButton label="Save document" tint={Colors.blue} onPress={save} textStyle={{ color: '#fff' }} />
          </GlassCard>

          {documents.map((d) => (
            <GlassCard key={d.id} contentStyle={styles.docRow}>
              <VaultDocImage docId={d.id} imageUri={d.imageUri} />
              <View style={{ flex: 1, minWidth: 0 }}>
                <Text style={[Typography.body, { color: theme.text, fontWeight: '600' }]} numberOfLines={1}>
                  {d.title}
                </Text>
                <Text style={[Typography.tiny, { color: theme.textSecondary }]}>
                  {d.type} · {new Date(d.createdAt).toLocaleDateString()}
                </Text>
              </View>
              <TouchableOpacity onPress={() => handleRemove(d.id)} accessibilityLabel="Delete">
                <MaterialIcons name="delete-outline" size={22} color={Colors.red} />
              </TouchableOpacity>
            </GlassCard>
          ))}
        </ScrollView>
      </VaultLockGate>
    </AppBackground>
  );
}

const styles = StyleSheet.create({
  pad: { padding: Spacing.md, paddingBottom: 120, gap: Spacing.sm },
  lockRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  chip: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 8, paddingVertical: 6, borderRadius: Radius.full },
  input: { height: 46, borderRadius: Radius.md, borderWidth: 1, paddingHorizontal: Spacing.md },
  row: { flexDirection: 'row', gap: Spacing.sm },
  preview: { width: '100%', height: 160, borderRadius: Radius.md },
  docRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md },
});
