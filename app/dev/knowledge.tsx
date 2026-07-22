/**
 * Hidden developer console — not linked in the user UI.
 * Open via Profile → tap “LeftBehind v2.0.0” seven times, then enter the passcode.
 */
import { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TextInput, TouchableOpacity, Alert } from 'react-native';
import { router } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import { AppBackground } from '../../src/components/AppBackground';
import { GlassCard, GlassButton } from '../../src/components/Glass';
import { ScreenHeader } from '../../src/components/ScreenHeader';
import { useThemeContext } from '../../src/store/settingsStore';
import { useAssistantStore } from '../../src/store/assistantStore';
import { Colors, Radius, Spacing, Typography } from '../../src/utils/theme';
import { SecurityConfig } from '../../src/config/security';
import { timingSafeEqual } from '../../src/utils/crypto';

const MAX_CODE_ATTEMPTS = 5;

export default function DevKnowledgeScreen() {
  const { theme } = useThemeContext();
  const knowledge = useAssistantStore((s) => s.knowledge);
  const adminTeach = useAssistantStore((s) => s.adminTeach);
  const adminRemoveFact = useAssistantStore((s) => s.adminRemoveFact);
  const syncSeedKnowledge = useAssistantStore((s) => s.syncSeedKnowledge);
  const [authed, setAuthed] = useState(false);
  const [code, setCode] = useState('');
  const [attempts, setAttempts] = useState(0);
  const [fact, setFact] = useState('');

  // Hard gate: the developer console does not exist in production builds, so no
  // usable backdoor ships in release binaries.
  if (!__DEV__) {
    return (
      <AppBackground>
        <ScreenHeader title="Not available" subtitle="" />
        <View style={styles.lock}>
          <GlassCard contentStyle={{ gap: Spacing.md, maxWidth: 400, width: '100%' }}>
            <Text style={[Typography.body, { color: theme.textSecondary }]}>
              This screen is only available in development builds.
            </Text>
            <GlassButton label="Go back" onPress={() => router.back()} />
          </GlassCard>
        </View>
      </AppBackground>
    );
  }

  const checkPasscode = () => {
    // Passcode comes from the build-time env (LB_DEV_PASSCODE); never hardcoded.
    // In an unconfigured local dev session it is null and access is allowed
    // (still dev-only via the __DEV__ gate above).
    const expected = SecurityConfig.devPasscode;
    const ok = expected == null ? true : timingSafeEqual(code, expected);
    if (ok) {
      setAuthed(true);
      return;
    }
    const next = attempts + 1;
    setAttempts(next);
    setCode('');
    if (next >= MAX_CODE_ATTEMPTS) {
      Alert.alert('Locked', 'Too many attempts.');
      router.back();
    } else {
      Alert.alert('Denied', `Wrong passcode. ${MAX_CODE_ATTEMPTS - next} attempt(s) left.`);
    }
  };

  if (!authed) {
    return (
      <AppBackground>
        <ScreenHeader title="Dev access" subtitle="Backend only" />
        <View style={styles.lock}>
          <GlassCard contentStyle={{ gap: Spacing.md, maxWidth: 400, width: '100%' }}>
            <Text style={[Typography.body, { color: theme.textSecondary }]}>
              Enter the developer passcode to feed assistant knowledge. Regular users never see this screen.
            </Text>
            <TextInput
              value={code}
              onChangeText={setCode}
              secureTextEntry
              placeholder="Passcode"
              placeholderTextColor={theme.textTertiary}
              style={[styles.input, { color: theme.text, borderColor: theme.border, backgroundColor: theme.bgSecondary }]}
            />
            <GlassButton
              label="Unlock feed console"
              tint={Colors.blue}
              textStyle={{ color: '#fff' }}
              onPress={checkPasscode}
            />
            <GlassButton label="Go back" onPress={() => router.back()} />
          </GlassCard>
        </View>
      </AppBackground>
    );
  }

  return (
    <AppBackground>
      <ScreenHeader title="AI Knowledge Feed" subtitle="Developer console" />
      <ScrollView contentContainerStyle={styles.pad}>
        <GlassCard contentStyle={{ gap: Spacing.sm }}>
          <Text style={[Typography.small, { color: theme.textSecondary }]}>
            Facts you add here power the floating AI for all users. You can also edit `src/data/assistantKnowledge.ts`.
          </Text>
          <TextInput
            value={fact}
            onChangeText={setFact}
            multiline
            placeholder="New knowledge fact…"
            placeholderTextColor={theme.textTertiary}
            style={[styles.area, { color: theme.text, borderColor: theme.border, backgroundColor: theme.bgSecondary }]}
          />
          <GlassButton
            label="Feed to assistant"
            tint={Colors.blue}
            textStyle={{ color: '#fff' }}
            onPress={() => {
              if (!fact.trim()) return;
              adminTeach(fact.trim());
              setFact('');
              Alert.alert('Fed', 'Users will now get this in AI answers when relevant.');
            }}
          />
          <GlassButton label="Resync code seeds" onPress={() => syncSeedKnowledge()} />
        </GlassCard>

        {knowledge.map((k) => (
          <GlassCard key={k.id} contentStyle={styles.row}>
            <View style={{ flex: 1, minWidth: 0 }}>
              <Text style={[Typography.tiny, { color: Colors.blue }]}>{k.source}</Text>
              <Text style={[Typography.small, { color: theme.text }]}>{k.text}</Text>
            </View>
            {k.source === 'admin' && (
              <TouchableOpacity onPress={() => adminRemoveFact(k.id)}>
                <MaterialIcons name="delete-outline" size={22} color={Colors.red} />
              </TouchableOpacity>
            )}
          </GlassCard>
        ))}
      </ScrollView>
    </AppBackground>
  );
}

const styles = StyleSheet.create({
  lock: { flex: 1, justifyContent: 'center', padding: Spacing.md, alignItems: 'center' },
  pad: { padding: Spacing.md, paddingBottom: 120, gap: Spacing.sm },
  input: { height: 48, borderRadius: Radius.md, borderWidth: 1, paddingHorizontal: Spacing.md },
  area: { minHeight: 100, borderRadius: Radius.md, borderWidth: 1, padding: Spacing.md, textAlignVertical: 'top' },
  row: { flexDirection: 'row', alignItems: 'flex-start', gap: Spacing.sm },
});
