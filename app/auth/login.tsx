import { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  TouchableOpacity,
  Pressable,
  Alert,
} from 'react-native';
import { router } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialIcons } from '@expo/vector-icons';
import { Spacing, Colors } from '../../src/utils/theme';
import { ScreenNarrow, GlassCard } from '../../src/components/Glass';
import { AuthLandscapeBackground } from '../../src/components/AuthLandscapeBackground';
import { useAuthStore } from '../../src/store/authStore';
import { useT } from '../../src/i18n/useT';

export default function Login() {
  const { t } = useT();
  const login = useAuthStore((s) => s.login);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSignIn = async () => {
    if (!email.trim() || !password) {
      setError(t('fillAllFields'));
      return;
    }
    setError(null);
    setLoading(true);
    try {
      const result = await login(email, password);
      if (!result.ok) {
        const key =
          result.error === 'accountLocked'
            ? 'accountLocked'
            : result.error === 'invalidCredentials'
              ? 'invalidCredentials'
              : 'fillAllFields';
        setError(t(key));
        return;
      }
      router.replace('/(tabs)');
    } catch {
      setError(t('invalidCredentials'));
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
              <Text style={styles.title}>{t('welcomeBack')}</Text>
              <Text style={styles.subtitle}>{t('signInSubtitle')}</Text>
            </View>

            <GlassCard variant="overlay" strong contentStyle={styles.panel}>
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
              {error ? <Text style={styles.error}>{error}</Text> : null}
              <TouchableOpacity
                onPress={() => router.push('/auth/forgot-password')}
                accessibilityRole="button"
                accessibilityLabel={t('forgotPassword')}
                style={styles.forgotWrap}
              >
                <Text style={styles.link}>{t('forgotPassword')}</Text>
              </TouchableOpacity>

              <Pressable
                onPress={() => void handleSignIn()}
                disabled={loading}
                style={({ pressed }) => [{ opacity: loading ? 0.55 : pressed ? 0.9 : 1, marginTop: Spacing.md }]}
                accessibilityRole="button"
                accessibilityLabel={t('signIn')}
              >
                <LinearGradient
                  colors={['#5B9BFF', Colors.blue, Colors.blueDark]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.cta}
                >
                  <Text style={styles.btnText}>{loading ? '…' : t('signIn')}</Text>
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
                      Alert.alert(
                        s.label,
                        `${s.label} sign-in is coming soon. Use email for now.`,
                      )
                    }
                    accessibilityRole="button"
                    accessibilityLabel={`Sign in with ${s.label}`}
                  >
                    <MaterialIcons name={s.icon} size={22} color="#fff" />
                  </TouchableOpacity>
                ))}
              </View>
            </GlassCard>

            <TouchableOpacity
              style={styles.footerRow}
              onPress={() => router.push('/auth/register')}
              accessibilityRole="button"
              accessibilityLabel={t('register')}
            >
              <Text style={styles.footerText}>{t('dontHaveAccount')} </Text>
              <Text style={styles.footerLink}>{t('register')}</Text>
            </TouchableOpacity>
          </ScreenNarrow>
        </ScrollView>
      </KeyboardAvoidingView>
    </AuthLandscapeBackground>
  );
}

/** Underline field — no boxed chrome around typing. */
export function GlassInput({
  icon,
  placeholder,
  value,
  onChangeText,
  secureTextEntry,
  keyboardType,
  autoCapitalize,
  rightIcon,
  onRightIconPress,
}: {
  icon: keyof typeof MaterialIcons.glyphMap;
  placeholder: string;
  value: string;
  onChangeText: (v: string) => void;
  secureTextEntry?: boolean;
  keyboardType?: 'default' | 'email-address' | 'number-pad';
  autoCapitalize?: 'none' | 'words';
  rightIcon?: keyof typeof MaterialIcons.glyphMap;
  onRightIconPress?: () => void;
}) {
  const [focused, setFocused] = useState(false);

  return (
    <View style={[inputStyles.field, focused && inputStyles.fieldFocused]}>
      <MaterialIcons
        name={icon}
        size={20}
        color={focused ? '#fff' : 'rgba(255,255,255,0.55)'}
      />
      <TextInput
        style={inputStyles.input}
        placeholder={placeholder}
        placeholderTextColor="rgba(255,255,255,0.45)"
        value={value}
        onChangeText={onChangeText}
        secureTextEntry={secureTextEntry}
        keyboardType={keyboardType}
        autoCapitalize={autoCapitalize ?? 'none'}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        underlineColorAndroid="transparent"
        selectionColor={Colors.blue}
      />
      {rightIcon ? (
        <TouchableOpacity
          onPress={onRightIconPress}
          accessibilityRole="button"
          accessibilityLabel={rightIcon === 'visibility' ? 'Show password' : 'Hide password'}
          hitSlop={10}
        >
          <MaterialIcons name={rightIcon} size={20} color="rgba(255,255,255,0.7)" />
        </TouchableOpacity>
      ) : null}
    </View>
  );
}

const inputStyles = StyleSheet.create({
  field: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth * 2,
    borderBottomColor: 'rgba(255,255,255,0.28)',
  },
  fieldFocused: {
    borderBottomColor: 'rgba(255,255,255,0.92)',
  },
  input: {
    flex: 1,
    color: '#fff',
    fontSize: 16,
    fontWeight: '500',
    paddingVertical: 0,
    ...(Platform.OS === 'web' ? ({ outlineStyle: 'none' } as object) : null),
  },
});

const styles = StyleSheet.create({
  flex: { flex: 1 },
  container: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: Spacing.lg,
    paddingTop: 88,
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
  form: { gap: 8, marginBottom: Spacing.lg },
  panel: { gap: 8 },
  forgotWrap: { alignSelf: 'flex-end', paddingTop: 10 },
  error: { color: '#FFC9C9', fontSize: 13, marginTop: 6 },
  link: { color: 'rgba(255,255,255,0.9)', fontSize: 13, fontWeight: '600' },
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
});
