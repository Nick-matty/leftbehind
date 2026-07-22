import { useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  TouchableOpacity,
  Modal,
  FlatList,
  TextInput,
  Pressable,
  Alert,
} from 'react-native';
import { router } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialIcons } from '@expo/vector-icons';
import { Spacing, Radius, Colors } from '../../src/utils/theme';
import { GlassButton, ScreenNarrow, GlassCard } from '../../src/components/Glass';
import { AuthLandscapeBackground } from '../../src/components/AuthLandscapeBackground';
import { useAuthStore } from '../../src/store/authStore';
import { useSettingsStore } from '../../src/store/settingsStore';
import { useT } from '../../src/i18n/useT';
import { GlassInput } from './login';
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

type Step = 1 | 2;

function Chip({
  label,
  selected,
  onPress,
}: {
  label: string;
  selected: boolean;
  onPress: () => void;
}) {
  return (
    <TouchableOpacity
      onPress={onPress}
      style={[
        styles.chip,
        {
          backgroundColor: selected ? 'rgba(91,155,255,0.35)' : 'transparent',
          borderColor: selected ? 'rgba(255,255,255,0.85)' : 'rgba(255,255,255,0.28)',
        },
      ]}
    >
      <Text style={{ color: '#fff', fontSize: 13, fontWeight: selected ? '700' : '500' }}>{label}</Text>
    </TouchableOpacity>
  );
}

function toggleIn(list: string[], value: string): string[] {
  return list.includes(value) ? list.filter((x) => x !== value) : [...list, value].slice(0, 12);
}

export default function Register() {
  const { t } = useT();
  const register = useAuthStore((s) => s.register);
  const setPersonal = useSettingsStore((s) => s.setPersonal);

  const [step, setStep] = useState<Step>(1);
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const [nationality, setNationality] = useState('');
  const [ageText, setAgeText] = useState('');
  const [homeCurrency, setHomeCurrency] = useState('USD');
  const [hobbies, setHobbies] = useState<string[]>([]);
  const [interests, setInterests] = useState<string[]>([]);
  const [traits, setTraits] = useState<string[]>([]);
  const [travelStyle, setTravelStyle] = useState<TravelStyleId | ''>('');
  const [aboutMe, setAboutMe] = useState('');
  const [picker, setPicker] = useState<'country' | 'currency' | null>(null);

  const countryHint = useMemo(
    () => (nationality ? currencyForCountry(nationality) : 'USD'),
    [nationality]
  );

  const goStep2 = () => {
    if (!fullName.trim() || !email.trim() || !password || !confirmPassword) {
      setError(t('fillAllFields'));
      return;
    }
    if (password !== confirmPassword) {
      setError(t('passwordsDontMatch'));
      return;
    }
    // Surface password policy before step 2 so users don't bounce later.
    if (password.length < 8) {
      setError(t('passwordTooShort'));
      return;
    }
    if (!/[A-Za-z]/.test(password) || !/\d/.test(password)) {
      setError(t('passwordWeak'));
      return;
    }
    setError(null);
    setStep(2);
  };

  const saveProfileAndFinish = () => {
    const ageNum = Number(ageText);
    const age = Number.isFinite(ageNum) && ageNum >= 13 && ageNum <= 120 ? Math.round(ageNum) : null;
    setPersonal({
      nationality: nationality.trim(),
      age,
      homeCurrency: homeCurrency || countryHint,
      hobbies,
      interests,
      traits,
      travelStyle,
      aboutMe: aboutMe.trim(),
      onboardingComplete: true,
    });
  };

  const handleRegister = async (skipPersonal: boolean) => {
    setError(null);
    setLoading(true);
    try {
      const result = await register(fullName, email, password);
      if (!result.ok) {
        const key =
          result.error === 'emailInUse'
            ? 'emailInUse'
            : result.error === 'passwordTooShort'
              ? 'passwordTooShort'
              : result.error === 'passwordWeak'
                ? 'passwordWeak'
                : 'fillAllFields';
        setError(t(key));
        // Stay on the step that caused the problem — password issues → step 1;
        // don't bounce people who already filled About you for no reason.
        if (result.error === 'passwordTooShort' || result.error === 'passwordWeak' || result.error === 'fillAllFields') {
          setStep(1);
        }
        return;
      }

      try {
        if (skipPersonal) {
          setPersonal({ onboardingComplete: true, homeCurrency: countryHint });
        } else {
          saveProfileAndFinish();
        }
      } catch {
        // Profile prefs are best-effort — account already exists.
      }

      router.replace('/(tabs)');
    } catch (e) {
      console.warn('register failed', e);
      setError(t('fillAllFields'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthLandscapeBackground>
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
          <ScreenNarrow>
            <Text style={styles.brand}>LeftBehind</Text>
            <View style={styles.header}>
              <Text style={styles.title}>
                {step === 1 ? t('createAccount') : t('aboutYouTitle')}
              </Text>
              <Text style={styles.subtitle}>
                {step === 1 ? t('registerSubtitle') : t('aboutYouSubtitle')}
              </Text>
              <Text style={styles.stepLabel}>{t('stepOf', { n: step, total: 2 })}</Text>
            </View>

            <GlassCard variant="overlay" strong contentStyle={styles.panel}>
            {step === 1 ? (
              <View style={styles.form}>
                <GlassInput
                  icon="person-outline"
                  placeholder={t('fullName')}
                  value={fullName}
                  onChangeText={setFullName}
                  autoCapitalize="words"
                />
                <GlassInput
                  icon="mail-outline"
                  placeholder={t('emailAddress')}
                  value={email}
                  onChangeText={setEmail}
                  keyboardType="email-address"
                  autoCapitalize="none"
                />
                <GlassInput
                  icon="lock-outline"
                  placeholder={t('password')}
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry={!showPassword}
                  rightIcon={showPassword ? 'visibility-off' : 'visibility'}
                  onRightIconPress={() => setShowPassword((v) => !v)}
                />
                <GlassInput
                  icon="lock-outline"
                  placeholder={t('confirmPassword')}
                  value={confirmPassword}
                  onChangeText={setConfirmPassword}
                  secureTextEntry={!showPassword}
                />
                {error ? <Text style={styles.error}>{error}</Text> : null}
              </View>
            ) : (
              <View style={styles.form}>
                <TouchableOpacity style={styles.selectRow} onPress={() => setPicker('country')}>
                  <MaterialIcons name="public" size={20} color="rgba(255,255,255,0.7)" />
                  <Text style={[styles.selectText, !nationality && styles.placeholder]}>
                    {nationality || t('nationality')}
                  </Text>
                  <MaterialIcons name="expand-more" size={20} color="rgba(255,255,255,0.7)" />
                </TouchableOpacity>

                <View style={styles.inlineRow}>
                  <View style={{ flex: 1 }}>
                    <GlassInput
                      icon="cake"
                      placeholder={t('age')}
                      value={ageText}
                      onChangeText={setAgeText}
                      keyboardType="number-pad"
                    />
                  </View>
                  <TouchableOpacity
                    style={[styles.selectRow, { flex: 1.15 }]}
                    onPress={() => setPicker('currency')}
                  >
                    <MaterialIcons name="payments" size={20} color="rgba(255,255,255,0.7)" />
                    <Text style={styles.selectText}>{homeCurrency || countryHint}</Text>
                    <MaterialIcons name="expand-more" size={20} color="rgba(255,255,255,0.7)" />
                  </TouchableOpacity>
                </View>

                <Text style={styles.fieldLabel}>{t('travelStyle')}</Text>
                <View style={styles.chipWrap}>
                  {TRAVEL_STYLES.map((s) => (
                    <Chip
                      key={s.id}
                      label={s.label}
                      selected={travelStyle === s.id}
                      onPress={() => setTravelStyle(travelStyle === s.id ? '' : s.id)}
                    />
                  ))}
                </View>

                <Text style={styles.fieldLabel}>{t('hobbies')}</Text>
                <View style={styles.chipWrap}>
                  {HOBBY_OPTIONS.map((h) => (
                    <Chip
                      key={h}
                      label={h}
                      selected={hobbies.includes(h)}
                      onPress={() => setHobbies((prev) => toggleIn(prev, h))}
                    />
                  ))}
                </View>

                <Text style={styles.fieldLabel}>{t('interests')}</Text>
                <View style={styles.chipWrap}>
                  {INTEREST_OPTIONS.map((h) => (
                    <Chip
                      key={h}
                      label={h}
                      selected={interests.includes(h)}
                      onPress={() => setInterests((prev) => toggleIn(prev, h))}
                    />
                  ))}
                </View>

                <Text style={styles.fieldLabel}>{t('traits')}</Text>
                <View style={styles.chipWrap}>
                  {TRAIT_OPTIONS.map((h) => (
                    <Chip
                      key={h}
                      label={h}
                      selected={traits.includes(h)}
                      onPress={() => setTraits((prev) => toggleIn(prev, h))}
                    />
                  ))}
                </View>

                <Text style={styles.fieldLabel}>{t('aboutMe')}</Text>
                <TextInput
                  value={aboutMe}
                  onChangeText={setAboutMe}
                  placeholder={t('aboutMePlaceholder')}
                  placeholderTextColor="rgba(255,255,255,0.45)"
                  multiline
                  style={styles.aboutInput}
                  underlineColorAndroid="transparent"
                  selectionColor={Colors.blue}
                />
                {error ? <Text style={styles.error}>{error}</Text> : null}
              </View>
            )}

            {step === 1 ? (
              <>
                <Pressable
                  onPress={goStep2}
                  style={({ pressed }) => [{ opacity: pressed ? 0.9 : 1, marginTop: Spacing.sm }]}
                >
                  <LinearGradient
                    colors={['#5B9BFF', Colors.blue, Colors.blueDark]}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={styles.cta}
                  >
                    <Text style={styles.btnText}>{t('continueLabel')}</Text>
                  </LinearGradient>
                </Pressable>
                <Text style={styles.or}>or continue with</Text>
                <View style={styles.socialRow}>
                  {(
                    [
                      { id: 'google', icon: 'g-translate' as const, label: 'Google' },
                      { id: 'apple', icon: 'phone-iphone' as const, label: 'Apple' },
                      { id: 'facebook', icon: 'facebook' as const, label: 'Facebook' },
                    ] as const
                  ).map((s) => (
                    <TouchableOpacity
                      key={s.id}
                      style={styles.socialBtn}
                      onPress={() =>
                        Alert.alert(s.label, `${s.label} sign-in is coming soon. Use email for now.`)
                      }
                      accessibilityRole="button"
                      accessibilityLabel={`Sign up with ${s.label}`}
                    >
                      <MaterialIcons name={s.icon} size={22} color="#fff" />
                    </TouchableOpacity>
                  ))}
                </View>
              </>
            ) : (
              <View style={{ gap: Spacing.sm, marginTop: Spacing.sm }}>
                <Pressable
                  onPress={() => void handleRegister(false)}
                  disabled={loading}
                  style={({ pressed }) => [{ opacity: loading ? 0.55 : pressed ? 0.9 : 1 }]}
                >
                  <LinearGradient
                    colors={['#5B9BFF', Colors.blue, Colors.blueDark]}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={styles.cta}
                  >
                    <Text style={styles.btnText}>{loading ? '…' : t('finishRegister')}</Text>
                  </LinearGradient>
                </Pressable>
                <TouchableOpacity onPress={() => void handleRegister(true)} disabled={loading}>
                  <Text style={styles.skip}>{t('skipForNow')}</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={() => { setError(null); setStep(1); }}>
                  <Text style={styles.skip}>{t('goBack')}</Text>
                </TouchableOpacity>
              </View>
            )}
            </GlassCard>

            {step === 1 && (
              <TouchableOpacity style={styles.footerRow} onPress={() => router.back()}>
                <Text style={styles.footerText}>{t('alreadyHaveAccount')} </Text>
                <Text style={styles.footerLink}>{t('signIn')}</Text>
              </TouchableOpacity>
            )}
          </ScreenNarrow>
        </ScrollView>
      </KeyboardAvoidingView>

      <Modal visible={!!picker} transparent animationType="slide" onRequestClose={() => setPicker(null)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalSheet}>
            <Text style={styles.modalTitle}>
              {picker === 'country' ? t('nationality') : t('homeCurrency')}
            </Text>
            <FlatList
              data={picker === 'country' ? [...COUNTRIES] : [...HOME_CURRENCIES]}
              keyExtractor={(item) => item}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={styles.modalRow}
                  onPress={() => {
                    if (picker === 'country') {
                      setNationality(item);
                      setHomeCurrency(currencyForCountry(item));
                    } else {
                      setHomeCurrency(item);
                    }
                    setPicker(null);
                  }}
                >
                  <Text style={{ color: '#111', fontSize: 16 }}>{item}</Text>
                  {((picker === 'country' && nationality === item) ||
                    (picker === 'currency' && homeCurrency === item)) && (
                    <MaterialIcons name="check" size={20} color={Colors.blue} />
                  )}
                </TouchableOpacity>
              )}
            />
            <GlassButton label={t('close')} onPress={() => setPicker(null)} />
          </View>
        </View>
      </Modal>
    </AuthLandscapeBackground>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  container: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: Spacing.lg,
    paddingTop: 72,
    paddingBottom: 56,
  },
  brand: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '700',
    letterSpacing: 3,
    textTransform: 'uppercase',
    opacity: 0.9,
    marginBottom: Spacing.md,
  },
  header: { marginBottom: Spacing.xl },
  title: {
    color: '#fff',
    fontSize: 34,
    fontWeight: '700',
    letterSpacing: -0.8,
    marginBottom: 8,
  },
  subtitle: { color: 'rgba(255,255,255,0.72)', fontSize: 15, lineHeight: 22 },
  stepLabel: {
    color: 'rgba(255,255,255,0.55)',
    fontSize: 12,
    marginTop: 10,
    fontWeight: '600',
    letterSpacing: 0.4,
  },
  form: { gap: 6 },
  panel: { gap: 4 },
  error: { color: '#FFC9C9', fontSize: 13, marginTop: 8 },
  cta: {
    height: 54,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnText: { color: '#fff', fontSize: 16, fontWeight: '700', letterSpacing: 0.2 },
  or: {
    color: 'rgba(255,255,255,0.65)',
    textAlign: 'center',
    fontSize: 12,
    marginTop: Spacing.md,
    marginBottom: Spacing.sm,
  },
  socialRow: { flexDirection: 'row', justifyContent: 'center', gap: 14 },
  socialBtn: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.12)',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255,255,255,0.35)',
  },
  footerRow: { flexDirection: 'row', justifyContent: 'center', marginTop: Spacing.xl },
  footerText: { color: 'rgba(255,255,255,0.7)', fontSize: 14 },
  footerLink: { color: '#fff', fontSize: 14, fontWeight: '700' },
  skip: { color: 'rgba(255,255,255,0.85)', textAlign: 'center', fontSize: 14, paddingVertical: 6 },
  selectRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth * 2,
    borderBottomColor: 'rgba(255,255,255,0.28)',
  },
  selectText: { color: '#fff', flex: 1, fontSize: 16, fontWeight: '500' },
  placeholder: { color: 'rgba(255,255,255,0.45)' },
  fieldLabel: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 12,
    fontWeight: '600',
    letterSpacing: 0.6,
    textTransform: 'uppercase',
    marginTop: 10,
  },
  chipWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 999,
    borderWidth: 1,
  },
  inlineRow: { flexDirection: 'row', gap: 14, alignItems: 'flex-end' },
  aboutInput: {
    minHeight: 72,
    paddingVertical: 12,
    color: '#fff',
    fontSize: 15,
    fontWeight: '500',
    textAlignVertical: 'top',
    borderBottomWidth: StyleSheet.hairlineWidth * 2,
    borderBottomColor: 'rgba(255,255,255,0.28)',
    ...(Platform.OS === 'web' ? ({ outlineStyle: 'none' } as object) : null),
  },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'flex-end' },
  modalSheet: {
    backgroundColor: '#fff',
    borderTopLeftRadius: Radius.xl,
    borderTopRightRadius: Radius.xl,
    maxHeight: '70%',
    padding: Spacing.lg,
    gap: Spacing.sm,
  },
  modalTitle: { fontSize: 18, fontWeight: '700', color: '#111', marginBottom: 4 },
  modalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#eee',
  },
});
