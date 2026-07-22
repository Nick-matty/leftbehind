import { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TextInput, Image, TouchableOpacity } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { MaterialIcons } from '@expo/vector-icons';
import { AppBackground } from '../../src/components/AppBackground';
import { GlassCard, GlassButton } from '../../src/components/Glass';
import { ScreenHeader } from '../../src/components/ScreenHeader';
import { useThemeContext } from '../../src/store/settingsStore';
import { useTravelStore } from '../../src/store/travelStore';
import { Colors, Radius, Spacing, Typography } from '../../src/utils/theme';

export default function JournalScreen() {
  const { theme } = useThemeContext();
  const journal = useTravelStore((s) => s.journal);
  const addJournal = useTravelStore((s) => s.addJournal);
  const removeJournal = useTravelStore((s) => s.removeJournal);
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [place, setPlace] = useState('');
  const [mediaUri, setMediaUri] = useState<string | undefined>();

  const pick = async () => {
    const res = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 0.7 });
    if (!res.canceled && res.assets[0]) setMediaUri(res.assets[0].uri);
  };

  return (
    <AppBackground>
      <ScreenHeader title="Trip Journal" subtitle="Photos, videos & notes" />
      <ScrollView contentContainerStyle={styles.pad}>
        <GlassCard contentStyle={{ gap: Spacing.sm }}>
          <TextInput placeholder="Title" placeholderTextColor={theme.textTertiary} value={title} onChangeText={setTitle} style={[styles.input, field(theme)]} />
          <TextInput placeholder="Place visited" placeholderTextColor={theme.textTertiary} value={place} onChangeText={setPlace} style={[styles.input, field(theme)]} />
          <TextInput
            placeholder="Notes"
            placeholderTextColor={theme.textTertiary}
            value={body}
            onChangeText={setBody}
            multiline
            style={[styles.input, field(theme), { height: 90, textAlignVertical: 'top', paddingTop: 12 }]}
          />
          {mediaUri ? <Image source={{ uri: mediaUri }} style={styles.media} /> : null}
          <View style={styles.row}>
            <GlassButton label="Add media" style={{ flex: 1 }} onPress={pick} />
            <GlassButton
              label="Save entry"
              style={{ flex: 1 }}
              tint={Colors.blue}
              textStyle={{ color: '#fff' }}
              onPress={() => {
                if (!title.trim()) return;
                addJournal({ title: title.trim(), body: body.trim(), place: place.trim() || undefined, mediaUri });
                setTitle('');
                setBody('');
                setPlace('');
                setMediaUri(undefined);
              }}
            />
          </View>
        </GlassCard>

        {journal.map((j) => (
          <GlassCard key={j.id} contentStyle={{ gap: 8 }}>
            <View style={styles.row}>
              <Text style={[Typography.h3, { color: theme.text, flex: 1 }]} numberOfLines={1}>{j.title}</Text>
              <TouchableOpacity onPress={() => removeJournal(j.id)}>
                <MaterialIcons name="delete-outline" size={22} color={Colors.red} />
              </TouchableOpacity>
            </View>
            {!!j.place && <Text style={[Typography.tiny, { color: Colors.blue }]}>{j.place}</Text>}
            <Text style={[Typography.small, { color: theme.textSecondary }]}>{j.body}</Text>
            {j.mediaUri ? <Image source={{ uri: j.mediaUri }} style={styles.media} /> : null}
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
  input: { borderRadius: Radius.md, borderWidth: 1, paddingHorizontal: Spacing.md, height: 46 },
  row: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  media: { width: '100%', height: 160, borderRadius: Radius.md },
});
