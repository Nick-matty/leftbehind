import { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Modal,
  FlatList,
  Switch,
  TextInput,
  Alert,
  Linking,
  Platform,
  Image,
} from 'react-native';
import { router } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import { MaterialIcons } from '@expo/vector-icons';
import { useAuthStore } from '../../src/store/authStore';
import { useAppStore } from '../../src/store/appStore';
import { useSettingsStore, useThemeContext } from '../../src/store/settingsStore';
import { useAssistantStore } from '../../src/store/assistantStore';
import { useSecurityStore } from '../../src/store/securityStore';
import { GlassCard, GlassButton } from '../../src/components/Glass';
import { AppBackground } from '../../src/components/AppBackground';
import { Typography, Spacing, Radius, Colors } from '../../src/utils/theme';
import { useT } from '../../src/i18n/useT';
import { LANGUAGES } from '../../src/i18n/translations';
import { useOnlineStatus } from '../../src/utils/network';
import { useEffect } from 'react';
import { requestNotificationPermission, hasNotificationPermission } from '../../src/hooks/useNotifications';
import { isCloudEnabled } from '../../src/features/cloud/api';
import { useSyncStatus } from '../../src/features/cloud/syncStatus';
import { persistAvatarUri, deletePersistedAvatar } from '../../src/utils/avatar';
import {
  COUNTRIES,
  HOME_CURRENCIES,
  HOBBY_OPTIONS,
  INTEREST_OPTIONS,
  TRAIT_OPTIONS,
  TRAVEL_STYLES,
  type TravelStyleId,
} from '../../src/data/personalOptions';
import { currencyForCountry } from '../../src/features/currency';
import {
  PERSONA_OPTIONS,
  VOICE_OPTIONS,
  SLANG_OPTIONS,
  getPersona,
  getVoiceTone,
  getSlang,
} from '../../src/data/assistantPersona';
import { speak } from '../../src/utils/voice';

function RowLink({
  icon,
  label,
  onPress,
  color,
}: {
  icon: keyof typeof MaterialIcons.glyphMap;
  label: string;
  onPress: () => void;
  color?: string;
}) {
  const { theme } = useThemeContext();
  return (
    <TouchableOpacity style={styles.rowBetween} onPress={onPress} accessibilityRole="button" accessibilityLabel={label}>
      <View style={styles.rowLeft}>
        <MaterialIcons name={icon} size={20} color={color ?? Colors.blue} />
        <Text style={[Typography.body, { color: color ?? theme.text }]}>{label}</Text>
      </View>
      <MaterialIcons name="chevron-right" size={20} color={theme.textTertiary} />
    </TouchableOpacity>
  );
}

export default function Profile() {
  const { theme, mode, isDark } = useThemeContext();
  const { t } = useT();
  const currentUser = useAuthStore((s) => {
    if (!s.currentUserId) return null;
    return s.users.find((u) => u.id === s.currentUserId) ?? null;
  });
  const logout = useAuthStore((s) => s.logout);
  const updateProfile = useAuthStore((s) => s.updateProfile);
  const setAvatarUri = useAuthStore((s) => s.setAvatarUri);
  const syncState = useSyncStatus((s) => s.state);
  const lastSyncedAt = useSyncStatus((s) => s.lastSyncedAt);
  const cloudOn = isCloudEnabled();
  const setThemeMode = useSettingsStore((s) => s.setThemeMode);
  const language = useSettingsStore((s) => s.language);
  const setLanguage = useSettingsStore((s) => s.setLanguage);
  const blindSpots = useAppStore((s) => s.blindSpots);
  const trips = useAppStore((s) => s.trips);
  const isOnline = useOnlineStatus();
  const backgroundUri = useSettingsStore((s) => s.backgroundUri);
  const setBackgroundUri = useSettingsStore((s) => s.setBackgroundUri);
  const personal = useSettingsStore((s) => s.personal);
  const setPersonal = useSettingsStore((s) => s.setPersonal);
  const voiceReplies = useAssistantStore((s) => s.voiceReplies);
  const setVoiceReplies = useAssistantStore((s) => s.setVoiceReplies);
  const setBubbleOpen = useAssistantStore((s) => s.setBubbleOpen);
  const memories = useAssistantStore((s) => s.memories);
  const clearMemories = useAssistantStore((s) => s.clearMemories);
  const assistantStyle = useSettingsStore((s) => s.assistantStyle);
  const setAssistantStyle = useSettingsStore((s) => s.setAssistantStyle);
  const biometricsEnabled = useSecurityStore((s) => s.biometricsEnabled);
  const setBiometricsEnabled = useSecurityStore((s) => s.setBiometricsEnabled);
  const pinConfigured = useSecurityStore((s) => !!s.pinHash);
  const lockVault = useSecurityStore((s) => s.lockVault);

  const [langModalOpen, setLangModalOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [personalOpen, setPersonalOpen] = useState(false);
  const [nameDraft, setNameDraft] = useState(currentUser?.fullName ?? '');
  const [notifOn, setNotifOn] = useState(false);
  const [versionTaps, setVersionTaps] = useState(0);
  const [natDraft, setNatDraft] = useState(personal.nationality);
  const [ageDraft, setAgeDraft] = useState(personal.age != null ? String(personal.age) : '');
  const [currencyDraft, setCurrencyDraft] = useState(personal.homeCurrency || 'USD');
  const [hobbiesDraft, setHobbiesDraft] = useState<string[]>(personal.hobbies);
  const [interestsDraft, setInterestsDraft] = useState<string[]>(personal.interests);
  const [traitsDraft, setTraitsDraft] = useState<string[]>(personal.traits);
  const [styleDraft, setStyleDraft] = useState<TravelStyleId | ''>(personal.travelStyle);
  const [aboutDraft, setAboutDraft] = useState(personal.aboutMe);
  const [personalPicker, setPersonalPicker] = useState<'country' | 'currency' | null>(null);
  const [styleOpen, setStyleOpen] = useState(false);

  const openPersonalEditor = () => {
    setNatDraft(personal.nationality);
    setAgeDraft(personal.age != null ? String(personal.age) : '');
    setCurrencyDraft(personal.homeCurrency || 'USD');
    setHobbiesDraft(personal.hobbies);
    setInterestsDraft(personal.interests);
    setTraitsDraft(personal.traits);
    setStyleDraft(personal.travelStyle);
    setAboutDraft(personal.aboutMe);
    setPersonalOpen(true);
  };

  const savePersonal = () => {
    const ageNum = Number(ageDraft);
    const age = Number.isFinite(ageNum) && ageNum >= 13 && ageNum <= 120 ? Math.round(ageNum) : null;
    setPersonal({
      nationality: natDraft.trim(),
      age,
      homeCurrency: currencyDraft || currencyForCountry(natDraft),
      hobbies: hobbiesDraft,
      interests: interestsDraft,
      traits: traitsDraft,
      travelStyle: styleDraft,
      aboutMe: aboutDraft.trim(),
      onboardingComplete: true,
    });
    setPersonalOpen(false);
  };

  const toggleChip = (list: string[], value: string, setter: (v: string[]) => void) => {
    setter(list.includes(value) ? list.filter((x) => x !== value) : [...list, value].slice(0, 12));
  };

  useEffect(() => {
    void hasNotificationPermission().then(setNotifOn);
  }, []);

  const topMisses = Object.values(blindSpots)
    .filter((b) => b.missCount > 0)
    .sort((a, b) => b.missCount - a.missCount)
    .slice(0, 5);

  const completedTrips = trips.filter((x) => x.status === 'completed').length;

  const handlePickBackground = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') return;
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      quality: 0.8,
      allowsEditing: true,
    });
    if (!result.canceled && result.assets[0]) {
      setBackgroundUri(result.assets[0].uri);
    }
  };

  const pickAvatar = async () => {
    if (!currentUser) return;
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Photos', 'Allow photo access to set a profile picture.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      quality: 0.75,
      allowsEditing: true,
      aspect: [1, 1],
    });
    if (result.canceled || !result.assets[0]?.uri) return;
    const durable = await persistAvatarUri(currentUser.id, result.assets[0].uri);
    setAvatarUri(durable);
  };

  const removeAvatar = async () => {
    if (!currentUser) return;
    await deletePersistedAvatar(currentUser.id, currentUser.avatarUri);
    setAvatarUri(null);
  };

  const handleAvatarPress = () => {
    if (!currentUser) return;
    if (currentUser.avatarUri) {
      Alert.alert('Profile photo', 'Update your profile picture', [
        { text: 'Change photo', onPress: () => void pickAvatar() },
        { text: 'Remove photo', style: 'destructive', onPress: () => void removeAvatar() },
        { text: 'Cancel', style: 'cancel' },
      ]);
    } else {
      void pickAvatar();
    }
  };

  const toggleNotifications = async (on: boolean) => {
    if (on) {
      const ok = await requestNotificationPermission();
      setNotifOn(ok);
      if (!ok) {
        Alert.alert(
          'Notifications unavailable',
          'Trip reminders need a development build — Expo Go no longer supports them on Android.',
          [
            { text: 'OK', style: 'cancel' },
            ...(Platform.OS !== 'web'
              ? [{ text: 'Open Settings', onPress: () => Linking.openSettings().catch(() => {}) }]
              : []),
          ],
        );
      }
    } else {
      setNotifOn(false);
      if (Platform.OS !== 'web') {
        Alert.alert('Tip', 'Turn notifications off fully from your phone Settings → LeftBehind.');
      }
    }
  };

  const handleSyncNow = async () => {
    try {
      const { syncNow } = await import('../../src/features/cloud/syncManager');
      await syncNow();
    } catch {
      Alert.alert('Sync', 'Could not sync right now. Try again when online.');
    }
  };

  const handleLogout = () => {
    lockVault();
    logout();
    router.replace('/auth/login');
  };

  const onVersionTap = () => {
    // The hidden developer console is only reachable in development builds.
    if (!__DEV__) return;
    const next = versionTaps + 1;
    setVersionTaps(next);
    if (next >= 7) {
      setVersionTaps(0);
      router.push('/dev/knowledge');
    }
  };

  return (
    <AppBackground>
      <ScrollView contentContainerStyle={{ padding: Spacing.md, paddingTop: 60, paddingBottom: 140, gap: Spacing.md }}>
        <GlassCard contentStyle={styles.profileHeader}>
          <TouchableOpacity
            onPress={handleAvatarPress}
            accessibilityRole="button"
            accessibilityLabel={currentUser?.avatarUri ? 'Change profile photo' : 'Add profile photo'}
            style={styles.avatarWrap}
          >
            {currentUser?.avatarUri ? (
              <Image source={{ uri: currentUser.avatarUri }} style={styles.avatarImage} />
            ) : (
              <View style={[styles.avatar, { backgroundColor: Colors.blue }]}>
                <Text style={styles.avatarText}>{currentUser?.fullName?.[0]?.toUpperCase() ?? '?'}</Text>
              </View>
            )}
            <View style={[styles.avatarBadge, { backgroundColor: Colors.blue }]}>
              <MaterialIcons name="photo-camera" size={12} color="#fff" />
            </View>
          </TouchableOpacity>
          <View style={{ flex: 1, minWidth: 0 }}>
            <Text style={[Typography.h3, { color: theme.text }]} numberOfLines={1}>
              {currentUser?.fullName}
            </Text>
            <Text style={[Typography.small, { color: theme.textSecondary }]} numberOfLines={1}>
              {currentUser?.email}
            </Text>
            <Text style={[Typography.tiny, { color: theme.textTertiary, marginTop: 4 }]}>
              {completedTrips} trips completed · {isOnline ? t('online') : t('offline')}
            </Text>
          </View>
          <TouchableOpacity
            onPress={() => {
              setNameDraft(currentUser?.fullName ?? '');
              setEditOpen(true);
            }}
            accessibilityLabel="Edit profile"
          >
            <MaterialIcons name="edit" size={22} color={Colors.blue} />
          </TouchableOpacity>
        </GlassCard>

        <View>
          <Text style={sectionLabel(theme)}>{t('aboutYouSection').toUpperCase()}</Text>
          <GlassCard contentStyle={{ gap: Spacing.sm }}>
            <Text style={[Typography.body, { color: theme.text }]}>
              {[
                personal.nationality && `${personal.nationality}`,
                personal.age != null && `${personal.age} yrs`,
                personal.homeCurrency && personal.homeCurrency,
                personal.travelStyle && personal.travelStyle,
              ]
                .filter(Boolean)
                .join(' · ') || t('editPersonalInfo')}
            </Text>
            {(personal.hobbies.length > 0 || personal.interests.length > 0) && (
              <Text style={[Typography.tiny, { color: theme.textSecondary }]} numberOfLines={2}>
                {[...personal.hobbies, ...personal.interests].slice(0, 8).join(' · ')}
              </Text>
            )}
            <Text style={[Typography.tiny, { color: theme.textTertiary }]}>
              {t('aiMemory')}: {memories.length} note{memories.length === 1 ? '' : 's'}
            </Text>
            <RowLink icon="person-outline" label={t('editPersonalInfo')} onPress={openPersonalEditor} />
            {memories.length > 0 && (
              <RowLink
                icon="psychology"
                label={t('clearAiMemory')}
                color={Colors.red}
                onPress={() =>
                  Alert.alert(t('aiMemory'), 'Forget personal notes the assistant learned?', [
                    { text: t('cancel'), style: 'cancel' },
                    { text: t('clearAiMemory'), style: 'destructive', onPress: () => clearMemories() },
                  ])
                }
              />
            )}
          </GlassCard>
        </View>

        {cloudOn && currentUser && (
          <View>
            <Text style={sectionLabel(theme)}>CLOUD SYNC</Text>
            <GlassCard contentStyle={{ gap: Spacing.sm }}>
              <View style={styles.rowBetween}>
                <View style={styles.rowLeft}>
                  <MaterialIcons
                    name={
                      syncState === 'syncing'
                        ? 'sync'
                        : syncState === 'error'
                          ? 'sync-problem'
                          : 'cloud-done'
                    }
                    size={22}
                    color={syncState === 'error' ? Colors.red : Colors.green}
                  />
                  <View>
                    <Text style={[Typography.body, { color: theme.text }]}>
                      {syncState === 'syncing'
                        ? 'Syncing…'
                        : syncState === 'error'
                          ? 'Sync error'
                          : 'Encrypted & synced'}
                    </Text>
                    <Text style={[Typography.tiny, { color: theme.textTertiary }]}>
                      {lastSyncedAt
                        ? `Last synced ${new Date(lastSyncedAt).toLocaleTimeString()}`
                        : 'Not synced yet'}
                    </Text>
                  </View>
                </View>
                <TouchableOpacity
                  onPress={() => void handleSyncNow()}
                  disabled={syncState === 'syncing'}
                  accessibilityRole="button"
                  accessibilityLabel="Sync now"
                >
                  <MaterialIcons
                    name="refresh"
                    size={22}
                    color={syncState === 'syncing' ? theme.textTertiary : Colors.blue}
                  />
                </TouchableOpacity>
              </View>
              <Text style={[Typography.tiny, { color: theme.textTertiary }]}>
                End-to-end encrypted. Only you can read your data.
              </Text>
            </GlassCard>
          </View>
        )}

        <View>
          <Text style={sectionLabel(theme)}>{t('theme').toUpperCase()}</Text>
          <GlassCard contentStyle={{ flexDirection: 'row', padding: 4, gap: 4 }}>
            {(['light', 'dark', 'system'] as const).map((m) => (
              <TouchableOpacity
                key={m}
                onPress={() => setThemeMode(m)}
                style={[
                  styles.segment,
                  {
                    backgroundColor:
                      mode === m
                        ? isDark
                          ? 'rgba(59,125,232,0.55)'
                          : Colors.blue
                        : 'transparent',
                  },
                ]}
              >
                <Text style={{ color: mode === m ? '#fff' : theme.text, fontSize: 13 }}>{t(m)}</Text>
              </TouchableOpacity>
            ))}
          </GlassCard>
        </View>

        <View>
          <Text style={sectionLabel(theme)}>{t('language').toUpperCase()}</Text>
          <TouchableOpacity onPress={() => setLangModalOpen(true)}>
            <GlassCard contentStyle={styles.rowBetween}>
              <Text style={[Typography.body, { color: theme.text }]}>
                {LANGUAGES.find((l) => l.code === language)?.native}
              </Text>
              <MaterialIcons name="chevron-right" size={20} color={theme.textTertiary} />
            </GlassCard>
          </TouchableOpacity>
        </View>

        <View>
          <Text style={sectionLabel(theme)}>ASSISTANT & ALERTS</Text>
          <GlassCard contentStyle={{ gap: Spacing.md }}>
            <View style={styles.rowBetween}>
              <View style={styles.rowLeft}>
                <MaterialIcons name="record-voice-over" size={20} color={Colors.blue} />
                <Text style={[Typography.body, { color: theme.text }]}>AI voice replies</Text>
              </View>
              <Switch value={voiceReplies} onValueChange={setVoiceReplies} trackColor={{ true: Colors.blue }} />
            </View>
            <RowLink
              icon="psychology"
              label={`Personality · ${getPersona(assistantStyle.persona).label}`}
              onPress={() => setStyleOpen(true)}
            />
            <Text style={[Typography.tiny, { color: theme.textTertiary, marginTop: -6 }]}>
              Voice: {getVoiceTone(assistantStyle.voice).label} · Slang: {getSlang(assistantStyle.slang).label}
            </Text>
            <View style={styles.rowBetween}>
              <View style={styles.rowLeft}>
                <MaterialIcons name="notifications-active" size={20} color={Colors.blue} />
                <Text style={[Typography.body, { color: theme.text }]}>Trip reminders</Text>
              </View>
              <Switch
                value={notifOn}
                onValueChange={toggleNotifications}
                trackColor={{ true: Colors.blue }}
              />
            </View>
            <RowLink icon="auto-awesome" label="Open floating AI chat" onPress={() => setBubbleOpen(true)} />
          </GlassCard>
        </View>

        <View>
          <Text style={sectionLabel(theme)}>SECURITY</Text>
          <GlassCard contentStyle={{ gap: Spacing.md }}>
            <View style={styles.rowBetween}>
              <View style={styles.rowLeft}>
                <MaterialIcons name="fingerprint" size={20} color={Colors.blue} />
                <Text style={[Typography.body, { color: theme.text }]}>Vault biometrics</Text>
              </View>
              <Switch
                value={biometricsEnabled}
                onValueChange={setBiometricsEnabled}
                trackColor={{ true: Colors.blue }}
              />
            </View>
            <RowLink
              icon="folder-special"
              label={pinConfigured ? 'Open secure document vault' : 'Set up document vault PIN'}
              onPress={() => router.push('/tools/vault')}
            />
            {pinConfigured && (
              <RowLink icon="lock" label="Lock document vault now" onPress={() => { lockVault(); Alert.alert('Locked', 'Vault locked for this session.'); }} />
            )}
          </GlassCard>
        </View>

        <View>
          <Text style={sectionLabel(theme)}>QUICK LINKS</Text>
          <GlassCard contentStyle={{ gap: Spacing.sm }}>
            <RowLink icon="emoji-events" label="Achievements" onPress={() => router.push('/tools/achievements')} />
            <RowLink icon="insights" label="Travel stats" onPress={() => router.push('/tools/stats')} />
            <RowLink icon="favorite" label="Wishlist" onPress={() => router.push('/tools/wishlist')} />
            <RowLink icon="emergency" label="Emergency SOS" onPress={() => router.push('/tools/sos')} color={Colors.red} />
            <RowLink icon="apps" label="All travel tools" onPress={() => router.push('/tools')} />
          </GlassCard>
        </View>

        <View>
          <Text style={sectionLabel(theme)}>LOOK & FEEL</Text>
          <GlassCard contentStyle={{ gap: Spacing.sm }}>
            <TouchableOpacity style={styles.rowBetween} onPress={handlePickBackground}>
              <Text style={[Typography.body, { color: theme.text }]}>
                {backgroundUri ? 'Change background photo' : 'Choose background photo'}
              </Text>
              <MaterialIcons name="image" size={20} color={Colors.blue} />
            </TouchableOpacity>
            {backgroundUri && (
              <TouchableOpacity style={styles.rowBetween} onPress={() => setBackgroundUri(null)}>
                <Text style={[Typography.body, { color: Colors.red }]}>Remove photo</Text>
                <MaterialIcons name="close" size={20} color={Colors.red} />
              </TouchableOpacity>
            )}
          </GlassCard>
        </View>

        {topMisses.length > 0 && (
          <View>
            <Text style={sectionLabel(theme)}>{t('insights').toUpperCase()}</Text>
            <GlassCard contentStyle={{ gap: 8 }}>
              {topMisses.map((b) => (
                <View key={b.label} style={styles.rowBetween}>
                  <Text style={[Typography.body, { color: theme.text }]}>{b.label}</Text>
                  <Text style={[Typography.small, { color: Colors.amber }]}>{t('topMiss')} ×{b.missCount}</Text>
                </View>
              ))}
            </GlassCard>
          </View>
        )}

        <TouchableOpacity onPress={handleLogout}>
          <GlassCard contentStyle={styles.rowBetween}>
            <Text style={[Typography.body, { color: Colors.red }]}>{t('logout')}</Text>
            <MaterialIcons name="logout" size={20} color={Colors.red} />
          </GlassCard>
        </TouchableOpacity>

        <TouchableOpacity onPress={onVersionTap} activeOpacity={0.7}>
          <Text style={[Typography.tiny, { color: theme.textTertiary, textAlign: 'center' }]}>
            LeftBehind v2.0.0
          </Text>
        </TouchableOpacity>
      </ScrollView>

      <Modal visible={langModalOpen} transparent animationType="slide" onRequestClose={() => setLangModalOpen(false)}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalSheet, { backgroundColor: theme.card }]}>
            <Text style={[Typography.h3, { color: theme.text, marginBottom: Spacing.sm }]}>{t('language')}</Text>
            <FlatList
              data={LANGUAGES}
              keyExtractor={(l) => l.code}
              style={{ maxHeight: 400 }}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={styles.langRow}
                  onPress={() => {
                    setLanguage(item.code);
                    setLangModalOpen(false);
                  }}
                >
                  <Text style={{ color: theme.text, fontSize: 15 }}>{item.native}</Text>
                  {item.code === language && <MaterialIcons name="check" size={18} color={Colors.blue} />}
                </TouchableOpacity>
              )}
            />
          </View>
        </View>
      </Modal>

      <Modal visible={personalOpen} transparent animationType="slide" onRequestClose={() => setPersonalOpen(false)}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalSheet, { backgroundColor: theme.card }]}>
            <Text style={[Typography.h3, { color: theme.text }]}>{t('aboutYouTitle')}</Text>
            <ScrollView style={{ maxHeight: 420 }} contentContainerStyle={{ gap: Spacing.sm }}>
              <TouchableOpacity
                style={[styles.pickRow, { borderColor: theme.border, backgroundColor: theme.bgSecondary }]}
                onPress={() => setPersonalPicker('country')}
              >
                <Text style={{ color: theme.text, flex: 1 }}>{natDraft || t('nationality')}</Text>
                <MaterialIcons name="expand-more" size={20} color={theme.textTertiary} />
              </TouchableOpacity>
              <View style={{ flexDirection: 'row', gap: 8 }}>
                <TextInput
                  value={ageDraft}
                  onChangeText={setAgeDraft}
                  keyboardType="number-pad"
                  placeholder={t('age')}
                  placeholderTextColor={theme.textTertiary}
                  style={[styles.nameInput, { flex: 1, color: theme.text, borderColor: theme.border, backgroundColor: theme.bgSecondary }]}
                />
                <TouchableOpacity
                  style={[styles.pickRow, { flex: 1.2, borderColor: theme.border, backgroundColor: theme.bgSecondary }]}
                  onPress={() => setPersonalPicker('currency')}
                >
                  <Text style={{ color: theme.text, flex: 1 }}>{currencyDraft}</Text>
                  <MaterialIcons name="expand-more" size={20} color={theme.textTertiary} />
                </TouchableOpacity>
              </View>
              <Text style={[Typography.tiny, { color: theme.textTertiary }]}>{t('travelStyle')}</Text>
              <View style={styles.chipWrap}>
                {TRAVEL_STYLES.map((s) => (
                  <TouchableOpacity
                    key={s.id}
                    onPress={() => setStyleDraft(styleDraft === s.id ? '' : s.id)}
                    style={[
                      styles.chip,
                      {
                        backgroundColor: styleDraft === s.id ? Colors.blue : theme.bgSecondary,
                        borderColor: styleDraft === s.id ? Colors.blue : theme.border,
                      },
                    ]}
                  >
                    <Text style={{ color: styleDraft === s.id ? '#fff' : theme.text, fontSize: 12 }}>{s.label}</Text>
                  </TouchableOpacity>
                ))}
              </View>
              <Text style={[Typography.tiny, { color: theme.textTertiary }]}>{t('hobbies')}</Text>
              <View style={styles.chipWrap}>
                {HOBBY_OPTIONS.map((h) => (
                  <TouchableOpacity
                    key={h}
                    onPress={() => toggleChip(hobbiesDraft, h, setHobbiesDraft)}
                    style={[
                      styles.chip,
                      {
                        backgroundColor: hobbiesDraft.includes(h) ? Colors.blue : theme.bgSecondary,
                        borderColor: hobbiesDraft.includes(h) ? Colors.blue : theme.border,
                      },
                    ]}
                  >
                    <Text style={{ color: hobbiesDraft.includes(h) ? '#fff' : theme.text, fontSize: 12 }}>{h}</Text>
                  </TouchableOpacity>
                ))}
              </View>
              <Text style={[Typography.tiny, { color: theme.textTertiary }]}>{t('interests')}</Text>
              <View style={styles.chipWrap}>
                {INTEREST_OPTIONS.map((h) => (
                  <TouchableOpacity
                    key={h}
                    onPress={() => toggleChip(interestsDraft, h, setInterestsDraft)}
                    style={[
                      styles.chip,
                      {
                        backgroundColor: interestsDraft.includes(h) ? Colors.blue : theme.bgSecondary,
                        borderColor: interestsDraft.includes(h) ? Colors.blue : theme.border,
                      },
                    ]}
                  >
                    <Text style={{ color: interestsDraft.includes(h) ? '#fff' : theme.text, fontSize: 12 }}>{h}</Text>
                  </TouchableOpacity>
                ))}
              </View>
              <Text style={[Typography.tiny, { color: theme.textTertiary }]}>{t('traits')}</Text>
              <View style={styles.chipWrap}>
                {TRAIT_OPTIONS.map((h) => (
                  <TouchableOpacity
                    key={h}
                    onPress={() => toggleChip(traitsDraft, h, setTraitsDraft)}
                    style={[
                      styles.chip,
                      {
                        backgroundColor: traitsDraft.includes(h) ? Colors.blue : theme.bgSecondary,
                        borderColor: traitsDraft.includes(h) ? Colors.blue : theme.border,
                      },
                    ]}
                  >
                    <Text style={{ color: traitsDraft.includes(h) ? '#fff' : theme.text, fontSize: 12 }}>{h}</Text>
                  </TouchableOpacity>
                ))}
              </View>
              <TextInput
                value={aboutDraft}
                onChangeText={setAboutDraft}
                placeholder={t('aboutMePlaceholder')}
                placeholderTextColor={theme.textTertiary}
                multiline
                style={[
                  styles.nameInput,
                  { minHeight: 72, color: theme.text, borderColor: theme.border, backgroundColor: theme.bgSecondary, textAlignVertical: 'top' },
                ]}
              />
            </ScrollView>
            <GlassButton label={t('save')} tint={Colors.blue} textStyle={{ color: '#fff' }} onPress={savePersonal} />
            <GlassButton label={t('cancel')} onPress={() => setPersonalOpen(false)} />
          </View>
        </View>
      </Modal>

      <Modal
        visible={!!personalPicker}
        transparent
        animationType="fade"
        onRequestClose={() => setPersonalPicker(null)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalSheet, { backgroundColor: theme.card }]}>
            <Text style={[Typography.h3, { color: theme.text }]}>
              {personalPicker === 'country' ? t('nationality') : t('homeCurrency')}
            </Text>
            <FlatList
              data={personalPicker === 'country' ? [...COUNTRIES] : [...HOME_CURRENCIES]}
              keyExtractor={(item) => item}
              style={{ maxHeight: 360 }}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={styles.langRow}
                  onPress={() => {
                    if (personalPicker === 'country') {
                      setNatDraft(item);
                      setCurrencyDraft(currencyForCountry(item));
                    } else {
                      setCurrencyDraft(item);
                    }
                    setPersonalPicker(null);
                  }}
                >
                  <Text style={{ color: theme.text, fontSize: 15 }}>{item}</Text>
                  {((personalPicker === 'country' && natDraft === item) ||
                    (personalPicker === 'currency' && currencyDraft === item)) && (
                    <MaterialIcons name="check" size={18} color={Colors.blue} />
                  )}
                </TouchableOpacity>
              )}
            />
            <GlassButton label={t('close')} onPress={() => setPersonalPicker(null)} />
          </View>
        </View>
      </Modal>

      <Modal visible={styleOpen} transparent animationType="slide" onRequestClose={() => setStyleOpen(false)}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalSheet, { backgroundColor: theme.card }]}>
            <Text style={[Typography.h3, { color: theme.text }]}>AI personality & voice</Text>
            <ScrollView style={{ maxHeight: 460 }} contentContainerStyle={{ gap: Spacing.md, paddingBottom: Spacing.md }}>
              <Text style={[Typography.tiny, { color: theme.textTertiary }]}>PERSONALITY</Text>
              {PERSONA_OPTIONS.map((opt) => {
                const on = assistantStyle.persona === opt.id;
                return (
                  <TouchableOpacity
                    key={opt.id}
                    onPress={() => {
                      const next = { ...assistantStyle, persona: opt.id };
                      setAssistantStyle({ persona: opt.id });
                      if (voiceReplies) {
                        void speak(`Hey — I'm your ${opt.label} now. How can I help with your trip?`, true, next);
                      }
                    }}
                    style={[
                      styles.styleOption,
                      {
                        borderColor: on ? Colors.blue : theme.border,
                        backgroundColor: on
                          ? isDark
                            ? 'rgba(59,125,232,0.2)'
                            : 'rgba(59,125,232,0.1)'
                          : theme.bgSecondary,
                      },
                    ]}
                  >
                    <Text style={[Typography.body, { color: theme.text, fontWeight: on ? '700' : '500' }]}>
                      {opt.label}
                    </Text>
                    <Text style={[Typography.tiny, { color: theme.textSecondary }]}>{opt.blurb}</Text>
                  </TouchableOpacity>
                );
              })}

              <Text style={[Typography.tiny, { color: theme.textTertiary }]}>VOICE TONE</Text>
              {VOICE_OPTIONS.map((opt) => {
                const on = assistantStyle.voice === opt.id;
                return (
                  <TouchableOpacity
                    key={opt.id}
                    onPress={() => {
                      const next = { ...assistantStyle, voice: opt.id };
                      setAssistantStyle({ voice: opt.id });
                      void speak(`This is my ${opt.label} voice. Does it sound good to you?`, true, next);
                    }}
                    style={[
                      styles.styleOption,
                      {
                        borderColor: on ? Colors.blue : theme.border,
                        backgroundColor: on
                          ? isDark
                            ? 'rgba(59,125,232,0.2)'
                            : 'rgba(59,125,232,0.1)'
                          : theme.bgSecondary,
                      },
                    ]}
                  >
                    <Text style={[Typography.body, { color: theme.text, fontWeight: on ? '700' : '500' }]}>
                      {opt.label}
                    </Text>
                    <Text style={[Typography.tiny, { color: theme.textSecondary }]}>{opt.blurb}</Text>
                  </TouchableOpacity>
                );
              })}

              <Text style={[Typography.tiny, { color: theme.textTertiary }]}>SLANG</Text>
              {SLANG_OPTIONS.map((opt) => {
                const on = assistantStyle.slang === opt.id;
                return (
                  <TouchableOpacity
                    key={opt.id}
                    onPress={() => {
                      const next = { ...assistantStyle, slang: opt.id };
                      setAssistantStyle({ slang: opt.id });
                      if (voiceReplies) {
                        void speak(
                          opt.id === 'street'
                            ? 'Aight — slang mode is on. Still respectful, just more chill.'
                            : opt.id === 'travel'
                              ? 'Traveler talk locked in. Ready for the next adventure.'
                              : opt.id === 'casual'
                                ? "Casual chat it is — I'll keep things friendly."
                                : "Neutral tone selected. I'll keep the language clear.",
                          true,
                          next
                        );
                      }
                    }}
                    style={[
                      styles.styleOption,
                      {
                        borderColor: on ? Colors.blue : theme.border,
                        backgroundColor: on
                          ? isDark
                            ? 'rgba(59,125,232,0.2)'
                            : 'rgba(59,125,232,0.1)'
                          : theme.bgSecondary,
                      },
                    ]}
                  >
                    <Text style={[Typography.body, { color: theme.text, fontWeight: on ? '700' : '500' }]}>
                      {opt.label}
                    </Text>
                    <Text style={[Typography.tiny, { color: theme.textSecondary }]}>{opt.blurb}</Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
            <GlassButton label={t('close')} onPress={() => setStyleOpen(false)} />
          </View>
        </View>
      </Modal>

      <Modal visible={editOpen} transparent animationType="fade" onRequestClose={() => setEditOpen(false)}>
        <View style={styles.modalOverlay}>
          <View style={[styles.editSheet, { backgroundColor: theme.card }]}>
            <Text style={[Typography.h3, { color: theme.text }]}>Edit profile</Text>
            <TouchableOpacity style={styles.editAvatarRow} onPress={handleAvatarPress} accessibilityRole="button">
              {currentUser?.avatarUri ? (
                <Image source={{ uri: currentUser.avatarUri }} style={styles.editAvatarImage} />
              ) : (
                <View style={[styles.editAvatarFallback, { backgroundColor: Colors.blue }]}>
                  <Text style={styles.avatarText}>{currentUser?.fullName?.[0]?.toUpperCase() ?? '?'}</Text>
                </View>
              )}
              <View style={{ flex: 1 }}>
                <Text style={[Typography.body, { color: theme.text }]}>
                  {currentUser?.avatarUri ? 'Change photo' : 'Add profile photo'}
                </Text>
                <Text style={[Typography.tiny, { color: theme.textTertiary }]}>Stored on this device only</Text>
              </View>
              <MaterialIcons name="photo-camera" size={20} color={Colors.blue} />
            </TouchableOpacity>
            <Text style={[Typography.small, { color: theme.textSecondary }]}>Display name</Text>
            <TextInput
              value={nameDraft}
              onChangeText={setNameDraft}
              style={[styles.nameInput, { color: theme.text, borderColor: theme.border, backgroundColor: theme.bgSecondary }]}
            />
            <GlassButton
              label="Save"
              tint={Colors.blue}
              textStyle={{ color: '#fff' }}
              onPress={async () => {
                const res = await updateProfile(nameDraft);
                if (!res.ok) Alert.alert('Error', 'Enter a valid name.');
                else setEditOpen(false);
              }}
            />
            <GlassButton label="Cancel" onPress={() => setEditOpen(false)} />
          </View>
        </View>
      </Modal>
    </AppBackground>
  );
}

function sectionLabel(theme: { textTertiary: string }) {
  return [Typography.tiny, { color: theme.textTertiary, marginBottom: Spacing.xs, marginLeft: 4 }];
}

const styles = StyleSheet.create({
  profileHeader: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md },
  avatarWrap: { width: 64, height: 64 },
  avatar: { width: 64, height: 64, borderRadius: 32, alignItems: 'center', justifyContent: 'center' },
  avatarImage: { width: 64, height: 64, borderRadius: 32 },
  avatarBadge: {
    position: 'absolute',
    right: 0,
    bottom: 0,
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#fff',
  },
  avatarText: { color: '#fff', fontSize: 22, fontWeight: '700' },
  editAvatarRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md },
  editAvatarImage: { width: 56, height: 56, borderRadius: 28 },
  editAvatarFallback: { width: 56, height: 56, borderRadius: 28, alignItems: 'center', justifyContent: 'center' },
  rowBetween: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  rowLeft: { flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1, minWidth: 0 },
  segment: { flex: 1, paddingVertical: 10, borderRadius: Radius.md, alignItems: 'center' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' },
  modalSheet: { padding: Spacing.lg, borderTopLeftRadius: Radius.xl, borderTopRightRadius: Radius.xl, maxHeight: '70%' },
  editSheet: { margin: Spacing.lg, padding: Spacing.lg, borderRadius: Radius.xl, gap: Spacing.md },
  langRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 12 },
  nameInput: { height: 48, borderRadius: Radius.md, borderWidth: 1, paddingHorizontal: Spacing.md },
  pickRow: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 48,
    borderRadius: Radius.md,
    borderWidth: 1,
    paddingHorizontal: Spacing.md,
  },
  chipWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 999, borderWidth: 1 },
  styleOption: {
    borderWidth: 1,
    borderRadius: Radius.md,
    padding: Spacing.md,
    gap: 4,
  },
});
