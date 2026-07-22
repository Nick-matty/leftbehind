import { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Animated,
  Platform,
  Pressable,
} from 'react-native';
import { BlurView } from 'expo-blur';
import { MaterialIcons } from '@expo/vector-icons';
import { useThemeContext, useSettingsStore } from '../store/settingsStore';
import { useAppStore } from '../store/appStore';
import { useAuthStore } from '../store/authStore';
import { useAssistantStore } from '../store/assistantStore';
import { runAssistant } from '../features/assistantBrain';
import { packingScore } from '../features/smartPacking';
import { scheduleCheckoutReminder } from '../hooks/useNotifications';
import { speak, startListening, stopSpeaking, voiceSupported } from '../utils/voice';
import { useOnlineStatus } from '../utils/network';
import { Colors, Radius, Spacing, Typography } from '../utils/theme';

export function FloatingAssistant() {
  const { theme, isDark } = useThemeContext();
  const trip = useAppStore((s) => {
    const upcoming = s.trips.find((t) => t.status === 'upcoming');
    return upcoming ?? null;
  });
  const open = useAssistantStore((s) => s.bubbleOpen);
  const setBubbleOpen = useAssistantStore((s) => s.setBubbleOpen);
  const messages = useAssistantStore((s) => s.messages);
  const knowledge = useAssistantStore((s) => s.knowledge);
  const memories = useAssistantStore((s) => s.memories);
  const reminders = useAssistantStore((s) => s.reminders);
  const voiceReplies = useAssistantStore((s) => s.voiceReplies);
  const addMessage = useAssistantStore((s) => s.addMessage);
  const addReminder = useAssistantStore((s) => s.addReminder);
  const remember = useAssistantStore((s) => s.remember);
  const forgetMatching = useAssistantStore((s) => s.forgetMatching);
  const personal = useSettingsStore((s) => s.personal);
  const setPersonal = useSettingsStore((s) => s.setPersonal);
  const assistantStyle = useSettingsStore((s) => s.assistantStyle);
  const userName = useAuthStore((s) => {
    if (!s.currentUserId) return undefined;
    return s.users.find((u) => u.id === s.currentUserId)?.fullName;
  });
  const online = useOnlineStatus();

  const [input, setInput] = useState('');
  const [listening, setListening] = useState(false);
  const pulse = useRef(new Animated.Value(1)).current;
  const glow = useRef(new Animated.Value(0.45)).current;
  const scrollRef = useRef<ScrollView>(null);
  const stopListenRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.parallel([
          Animated.timing(pulse, { toValue: 1.08, duration: 1400, useNativeDriver: true }),
          Animated.timing(glow, { toValue: 0.85, duration: 1400, useNativeDriver: true }),
        ]),
        Animated.parallel([
          Animated.timing(pulse, { toValue: 1, duration: 1400, useNativeDriver: true }),
          Animated.timing(glow, { toValue: 0.4, duration: 1400, useNativeDriver: true }),
        ]),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [pulse, glow]);

  const progress = trip
    ? packingScore(trip.checkedItems.length, Math.max(trip.totalItems, 1))
    : undefined;

  const handleUserText = async (text: string) => {
    const trimmed = text.trim();
    if (!trimmed) return;
    addMessage('user', trimmed);
    setInput('');

    const result = await runAssistant(trimmed, {
      userName,
      destination: trip?.destination,
      country: trip?.country,
      startDate: trip?.startDate,
      checkOutTime: trip?.checkOutTime,
      packingProgress: progress,
      knowledge,
      reminders,
      memories,
      personal,
      online,
      style: assistantStyle,
    });

    if (result.effects?.remember) {
      remember(result.effects.remember);
    }
    if (result.effects?.forgetQuery) {
      forgetMatching(result.effects.forgetQuery);
    }
    if (result.effects?.profilePatch) {
      setPersonal(result.effects.profilePatch);
    }
    if (result.effects?.reminder) {
      const due = new Date(Date.now() + result.effects.reminder.minutesFromNow * 60_000).toISOString();
      addReminder(result.effects.reminder.text, due);
      if (result.effects.scheduleLocalNotification) {
        await scheduleCheckoutReminder(
          trip?.id ?? 'assistant',
          result.effects.reminder.text,
          result.effects.reminder.minutesFromNow
        );
      }
    }

    addMessage('assistant', result.reply);
    if (voiceReplies) void speak(result.reply, true, assistantStyle);
    setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 80);
  };

  const toggleListen = () => {
    if (listening) {
      stopListenRef.current?.();
      setListening(false);
      return;
    }
    setListening(true);
    stopListenRef.current = startListening({
      onResult: (text) => {
        setListening(false);
        void handleUserText(text);
      },
      onError: () => setListening(false),
      onEnd: () => setListening(false),
    });
  };

  return (
    <View pointerEvents="box-none" style={styles.layer}>
      {open && (
        <View style={[styles.panelWrap, { maxWidth: 360 }]}>
          <View
            style={[
              styles.panel,
              { borderColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(255,255,255,0.55)' },
            ]}
          >
            <BlurView
              intensity={isDark ? 28 : 48}
              tint={isDark ? 'systemChromeMaterialDark' : 'systemUltraThinMaterialLight'}
              style={StyleSheet.absoluteFill}
            />
            <View
              style={[
                StyleSheet.absoluteFill,
                { backgroundColor: isDark ? 'rgba(4,8,16,0.82)' : 'rgba(210,220,235,0.62)' },
              ]}
            />
            <View
              pointerEvents="none"
              style={[
                StyleSheet.absoluteFill,
                { backgroundColor: isDark ? 'rgba(0,0,0,0.22)' : 'rgba(180,195,215,0.18)' },
              ]}
            />
            <View style={styles.panelHeader}>
              <View style={styles.headerLeft}>
                <View style={styles.miniOrb}>
                  <MaterialIcons name="auto-awesome" size={16} color="#fff" />
                </View>
                <View>
                  <Text style={[Typography.h3, { color: theme.text, fontSize: 15 }]}>LeftBehind AI</Text>
                  <Text style={[Typography.tiny, { color: theme.textSecondary }]}>
                    {listening ? 'Listening…' : voiceSupported() ? 'Tap mic to talk' : 'Type to chat'}
                  </Text>
                </View>
              </View>
              <TouchableOpacity
                onPress={() => {
                  stopSpeaking();
                  setBubbleOpen(false);
                }}
                accessibilityLabel="Close assistant"
              >
                <MaterialIcons name="close" size={22} color={theme.textSecondary} />
              </TouchableOpacity>
            </View>

            <ScrollView
              ref={scrollRef}
              style={styles.chat}
              contentContainerStyle={{ gap: 8, paddingBottom: 8 }}
              onContentSizeChange={() => scrollRef.current?.scrollToEnd({ animated: true })}
            >
              {messages.slice(-12).map((m) => (
                <View
                  key={m.id}
                  style={[
                    styles.bubble,
                    m.role === 'user'
                      ? { alignSelf: 'flex-end', backgroundColor: Colors.blue }
                      : {
                          alignSelf: 'flex-start',
                          backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(15,26,43,0.06)',
                        },
                  ]}
                >
                  <Text style={{ color: m.role === 'user' ? '#fff' : theme.text, fontSize: 13, lineHeight: 18 }}>
                    {m.text}
                  </Text>
                </View>
              ))}
            </ScrollView>

            <View
              style={[
                styles.composer,
                { borderTopColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(15,26,43,0.1)' },
              ]}
            >
              <TouchableOpacity
                onPress={toggleListen}
                style={[styles.micBtn, { backgroundColor: listening ? Colors.red : Colors.blue }]}
              >
                <MaterialIcons name={listening ? 'mic' : 'mic-none'} size={18} color="#fff" />
              </TouchableOpacity>
              <TextInput
                value={input}
                onChangeText={setInput}
                placeholder="Ask me anything…"
                placeholderTextColor={theme.textTertiary}
                style={[
                  styles.input,
                  {
                    color: theme.text,
                    backgroundColor: isDark ? 'rgba(0,0,0,0.25)' : 'rgba(255,255,255,0.9)',
                    borderColor: theme.border,
                  },
                ]}
                onSubmitEditing={() => void handleUserText(input)}
                returnKeyType="send"
              />
              <TouchableOpacity
                onPress={() => void handleUserText(input)}
                style={[styles.sendBtn, { backgroundColor: Colors.blue }]}
              >
                <MaterialIcons name="send" size={16} color="#fff" />
              </TouchableOpacity>
            </View>
          </View>
        </View>
      )}

      <Pressable
        onPress={() => setBubbleOpen(!open)}
        accessibilityRole="button"
        accessibilityLabel={open ? 'Close AI assistant' : 'Open AI assistant'}
        style={styles.fabHit}
      >
        <Animated.View style={[styles.glowRing, { opacity: glow, transform: [{ scale: pulse }] }]} />
        <Animated.View style={[styles.fab, { transform: [{ scale: pulse }] }]}>
          <BlurView intensity={40} tint="dark" style={StyleSheet.absoluteFill} />
          <View style={styles.fabFill} />
          <MaterialIcons name={open ? 'close' : 'auto-awesome'} size={26} color="#fff" />
        </Animated.View>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  layer: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 50,
    elevation: 50,
    justifyContent: 'flex-end',
    alignItems: 'flex-end',
    paddingRight: 16,
    paddingBottom: Platform.OS === 'web' ? 100 : 108,
  },
  fabHit: {
    width: 64,
    height: 64,
    alignItems: 'center',
    justifyContent: 'center',
  },
  glowRing: {
    position: 'absolute',
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: 'rgba(59,125,232,0.35)',
  },
  fab: {
    width: 58,
    height: 58,
    borderRadius: 29,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.45)',
    shadowColor: Colors.blue,
    shadowOpacity: 0.45,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 6 },
    elevation: 8,
  },
  fabFill: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(36,86,176,0.82)',
  },
  panelWrap: {
    width: '92%',
    marginRight: 4,
    marginBottom: 12,
  },
  panel: {
    height: 380,
    borderRadius: 24,
    overflow: 'hidden',
    borderWidth: 1,
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 10 },
    elevation: 10,
  },
  panelHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    paddingTop: 12,
    paddingBottom: 8,
  },
  headerLeft: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  miniOrb: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: Colors.blue,
    alignItems: 'center',
    justifyContent: 'center',
  },
  chat: { flex: 1, paddingHorizontal: 12 },
  bubble: {
    maxWidth: '90%',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 16,
  },
  composer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    padding: 10,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: 'rgba(255,255,255,0.2)',
  },
  micBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  input: {
    flex: 1,
    height: 38,
    borderRadius: Radius.full,
    borderWidth: 1,
    paddingHorizontal: 12,
    fontSize: 13,
  },
});
