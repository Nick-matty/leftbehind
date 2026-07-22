import { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  Switch,
  Alert,
  Platform,
  AppState,
  type AppStateStatus,
} from 'react-native';
import * as LocalAuthentication from 'expo-local-authentication';
import { MaterialIcons } from '@expo/vector-icons';
import { GlassCard, GlassButton } from './Glass';
import { useThemeContext } from '../store/settingsStore';
import { useSecurityStore } from '../store/securityStore';
import { useDeviceIntegrity } from '../utils/deviceIntegrity';
import { Colors, Radius, Spacing, Typography } from '../utils/theme';

// Prevent screenshots / screen recording / app-switcher previews while the
// vault is on screen. Native only; lazily required so Expo Go / web still bundle.
function useScreenCaptureProtection() {
  useEffect(() => {
    if (Platform.OS === 'web') return;
    let capture: typeof import('expo-screen-capture') | null = null;
    try {
      capture = require('expo-screen-capture');
    } catch {
      capture = null;
    }
    if (!capture) return;
    const tag = 'vault';
    capture.preventScreenCaptureAsync(tag).catch(() => {});
    return () => {
      capture?.allowScreenCaptureAsync(tag).catch(() => {});
    };
  }, []);
}

function formatCountdown(ms: number): string {
  const total = Math.ceil(ms / 1000);
  const m = Math.floor(total / 60);
  const s = total % 60;
  return m > 0 ? `${m}m ${s}s` : `${s}s`;
}

export function VaultLockGate({ children }: { children: React.ReactNode }) {
  const { theme } = useThemeContext();
  const hasHydrated = useSecurityStore((s) => s.hasHydrated);
  const vaultUnlocked = useSecurityStore((s) => s.vaultUnlocked);
  const biometricsEnabled = useSecurityStore((s) => s.biometricsEnabled);
  const setBiometricsEnabled = useSecurityStore((s) => s.setBiometricsEnabled);
  const hasPin = useSecurityStore((s) => s.hasPin);
  const setPin = useSecurityStore((s) => s.setPin);
  const verifyPin = useSecurityStore((s) => s.verifyPin);
  const unlockVault = useSecurityStore((s) => s.unlockVault);
  const lockVault = useSecurityStore((s) => s.lockVault);
  const lockRemainingMs = useSecurityStore((s) => s.lockRemainingMs);

  const [pin, setPinInput] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [biometricAvailable, setBiometricAvailable] = useState(false);
  const [remaining, setRemaining] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const integrity = useDeviceIntegrity();

  useScreenCaptureProtection();

  // Auto-lock when the app backgrounds so vault docs aren't left open.
  useEffect(() => {
    const onChange = (state: AppStateStatus) => {
      if (state === 'background' || state === 'inactive') {
        lockVault();
      }
    };
    const sub = AppState.addEventListener('change', onChange);
    return () => sub.remove();
  }, [lockVault]);

  useEffect(() => {
    (async () => {
      try {
        const hasHardware = await LocalAuthentication.hasHardwareAsync();
        const enrolled = await LocalAuthentication.isEnrolledAsync();
        setBiometricAvailable(hasHardware && enrolled);
      } catch {
        setBiometricAvailable(false);
      }
    })();
  }, []);

  // Keep the lockout countdown ticking while locked.
  useEffect(() => {
    const tick = () => setRemaining(lockRemainingMs());
    tick();
    timerRef.current = setInterval(tick, 1000);
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [lockRemainingMs]);

  useEffect(() => {
    if (!hasHydrated || vaultUnlocked || !hasPin() || !biometricsEnabled || !biometricAvailable) return;
    void tryBiometric();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hasHydrated, vaultUnlocked, biometricsEnabled, biometricAvailable]);

  const tryBiometric = async () => {
    if (!biometricAvailable || !biometricsEnabled || !hasPin()) return;
    try {
      const result = await LocalAuthentication.authenticateAsync({
        promptMessage: 'Unlock Document Vault',
        cancelLabel: 'Use PIN',
        // Do not fall back to the device passcode — only biometrics or the app PIN.
        disableDeviceFallback: true,
      });
      if (result.success) unlockVault();
    } catch {
      // Fall back to PIN UI
    }
  };

  if (!hasHydrated) {
    return (
      <View style={styles.center}>
        <Text style={{ color: theme.textSecondary }}>Loading security…</Text>
      </View>
    );
  }

  if (vaultUnlocked) return <>{children}</>;

  const setupMode = !hasPin();
  const isLocked = remaining > 0;

  const onSubmit = async () => {
    setError(null);
    try {
      if (setupMode) {
        if (pin !== confirm) {
          setError('PINs do not match.');
          return;
        }
        await setPin(pin);
        Alert.alert(
          'Vault secured',
          'Your documents are now protected by PIN' + (biometricsEnabled ? ' and biometrics.' : '.'),
        );
      } else {
        if (isLocked) {
          setError(`Too many attempts. Try again in ${formatCountdown(remaining)}.`);
          return;
        }
        const result = await verifyPin(pin);
        if (!result.ok) {
          if (result.lockedForMs) {
            setRemaining(result.lockedForMs);
            setError(`Too many attempts. Locked for ${formatCountdown(result.lockedForMs)}.`);
          } else {
            setError('Incorrect PIN.');
          }
        }
      }
      setPinInput('');
      setConfirm('');
    } catch (e: any) {
      setError(e?.message ?? 'Could not save PIN.');
    }
  };

  return (
    <View style={[styles.center, { padding: Spacing.md }]}>
      <GlassCard contentStyle={{ gap: Spacing.md, width: '100%', maxWidth: 400, alignSelf: 'center' }}>
        <View style={styles.iconRow}>
          <MaterialIcons name="fingerprint" size={36} color={Colors.blue} />
          <MaterialIcons name="pin" size={32} color={Colors.blue} />
        </View>
        <Text style={[Typography.h3, { color: theme.text, textAlign: 'center' }]}>
          {setupMode ? 'Secure your Document Vault' : 'Unlock Document Vault'}
        </Text>
        <Text style={[Typography.small, { color: theme.textSecondary, textAlign: 'center' }]}>
          {setupMode
            ? 'Create a 4–8 digit PIN. Enable fingerprint / Face ID for faster unlock.'
            : 'Use your fingerprint or enter your PIN to view travel documents.'}
        </Text>

        {integrity.available && integrity.isCompromised && (
          <View style={styles.warnRow}>
            <MaterialIcons name="gpp-maybe" size={18} color={Colors.red} />
            <Text style={{ color: Colors.red, fontSize: 12, flex: 1 }}>
              This device appears rooted/jailbroken. Stored documents are more exposed on modified devices.
            </Text>
          </View>
        )}

        <TextInput
          value={pin}
          onChangeText={setPinInput}
          keyboardType="number-pad"
          secureTextEntry
          maxLength={8}
          editable={!isLocked}
          placeholder={setupMode ? 'Create PIN' : 'Enter PIN'}
          placeholderTextColor={theme.textTertiary}
          style={[styles.input, { color: theme.text, borderColor: theme.border, backgroundColor: theme.bgSecondary, opacity: isLocked ? 0.5 : 1 }]}
        />
        {setupMode && (
          <TextInput
            value={confirm}
            onChangeText={setConfirm}
            keyboardType="number-pad"
            secureTextEntry
            maxLength={8}
            placeholder="Confirm PIN"
            placeholderTextColor={theme.textTertiary}
            style={[styles.input, { color: theme.text, borderColor: theme.border, backgroundColor: theme.bgSecondary }]}
          />
        )}

        {(setupMode || biometricAvailable) && (
          <View style={styles.switchRow}>
            <Text style={[Typography.body, { color: theme.text, flex: 1 }]}>
              {Platform.OS === 'ios' ? 'Face ID / Touch ID' : 'Fingerprint unlock'}
            </Text>
            <Switch
              value={biometricsEnabled}
              onValueChange={setBiometricsEnabled}
              trackColor={{ true: Colors.blue }}
            />
          </View>
        )}

        {isLocked && (
          <Text style={{ color: Colors.red, fontSize: 13, textAlign: 'center' }}>
            Locked due to too many attempts. Try again in {formatCountdown(remaining)}.
          </Text>
        )}
        {error && !isLocked && <Text style={{ color: Colors.red, fontSize: 13 }}>{error}</Text>}

        <GlassButton
          label={setupMode ? 'Set PIN & unlock' : isLocked ? `Locked (${formatCountdown(remaining)})` : 'Unlock with PIN'}
          tint={Colors.blue}
          textStyle={{ color: '#fff' }}
          onPress={onSubmit}
        />

        {!setupMode && biometricsEnabled && biometricAvailable && !isLocked && (
          <GlassButton label="Use fingerprint / biometrics" onPress={tryBiometric} />
        )}
      </GlassCard>
    </View>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, justifyContent: 'center' },
  iconRow: { flexDirection: 'row', justifyContent: 'center', gap: 12 },
  input: {
    height: 48,
    borderRadius: Radius.md,
    borderWidth: 1,
    paddingHorizontal: Spacing.md,
    letterSpacing: 4,
    textAlign: 'center',
    fontSize: 18,
  },
  switchRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  warnRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
});
