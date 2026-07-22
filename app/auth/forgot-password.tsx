import { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  TouchableOpacity,
  Pressable,
} from 'react-native';
import { router } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialIcons } from '@expo/vector-icons';
import { Spacing, Colors } from '../../src/utils/theme';
import { AuthLandscapeBackground } from '../../src/components/AuthLandscapeBackground';
import { useAuthStore } from '../../src/store/authStore';
import { useT } from '../../src/i18n/useT';
import { GlassInput } from './login';

export default function ForgotPassword() {
  const { t } = useT();
  const resetPassword = useAuthStore((s) => s.resetPassword);
  const [email, setEmail] = useState('');
  const [currentPassword, setCurrentPassword] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleReset = async () => {
    if (!email.trim() || !currentPassword || !password || !confirmPassword) {
      setError(t('fillAllFields'));
      return;
    }
    if (password !== confirmPassword) {
      setError(t('passwordsDontMatch'));
      return;
    }
    setError(null);
    setLoading(true);
    try {
      const result = await resetPassword(email, currentPassword, password);
      if (!result.ok) {
        const key =
          result.error === 'accountNotFound'
            ? 'accountNotFound'
            : result.error === 'passwordTooShort'
              ? 'passwordTooShort'
              : result.error === 'passwordWeak'
                ? 'passwordWeak'
                : result.error === 'invalidCredentials'
                  ? 'invalidCredentials'
                  : 'fillAllFields';
        setError(t(key as any));
        return;
      }
      setDone(true);
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
          <TouchableOpacity
            onPress={() => router.back()}
            style={styles.back}
            accessibilityRole="button"
            accessibilityLabel={t('cancel')}
          >
            <MaterialIcons name="arrow-back" size={24} color="#fff" />
          </TouchableOpacity>

          <Text style={styles.brand}>LeftBehind</Text>
          <View style={styles.header}>
            <Text style={styles.title}>{t('resetPassword')}</Text>
            <Text style={styles.subtitle}>{t('resetPasswordSubtitle')}</Text>
          </View>

          {done ? (
            <View style={styles.form}>
              <MaterialIcons name="check-circle" size={44} color="#fff" />
              <Text style={styles.success}>{t('passwordResetSuccess')}</Text>
              <Pressable onPress={() => router.replace('/auth/login')}>
                <LinearGradient
                  colors={['#5B9BFF', Colors.blue, Colors.blueDark]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.cta}
                >
                  <Text style={styles.btnText}>{t('signIn')}</Text>
                </LinearGradient>
              </Pressable>
            </View>
          ) : (
            <>
              <View style={styles.form}>
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
                  placeholder={t('currentPassword')}
                  value={currentPassword}
                  onChangeText={setCurrentPassword}
                  secureTextEntry
                />
                <GlassInput
                  icon="lock-outline"
                  placeholder={t('newPassword')}
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry
                />
                <GlassInput
                  icon="lock-outline"
                  placeholder={t('confirmPassword')}
                  value={confirmPassword}
                  onChangeText={setConfirmPassword}
                  secureTextEntry
                />
                {error ? <Text style={styles.error}>{error}</Text> : null}
              </View>

              <Pressable
                onPress={() => void handleReset()}
                disabled={loading}
                style={({ pressed }) => [{ opacity: loading ? 0.55 : pressed ? 0.9 : 1 }]}
              >
                <LinearGradient
                  colors={['#5B9BFF', Colors.blue, Colors.blueDark]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.cta}
                >
                  <Text style={styles.btnText}>{loading ? '…' : t('resetPassword')}</Text>
                </LinearGradient>
              </Pressable>
            </>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </AuthLandscapeBackground>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  container: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: Spacing.lg,
    paddingTop: 88,
    paddingBottom: 56,
  },
  back: { position: 'absolute', top: 56, left: Spacing.lg, zIndex: 1, padding: 4 },
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
  form: { gap: 6, marginBottom: Spacing.lg },
  error: { color: '#FFC9C9', fontSize: 13, marginTop: 8 },
  success: { color: '#fff', fontSize: 15, lineHeight: 22, marginVertical: 12 },
  cta: {
    height: 54,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnText: { color: '#fff', fontSize: 16, fontWeight: '700', letterSpacing: 0.2 },
});
