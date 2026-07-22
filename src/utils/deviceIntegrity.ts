// Root / jailbreak & tamper awareness.
//
// IMPORTANT: This uses `jail-monkey`, a native module that only works in a
// custom dev/production build (EAS build), NOT in Expo Go. The module is loaded
// lazily and every call is guarded, so in Expo Go (or before install) this
// simply reports "unavailable" and never crashes.
//
// Policy (per product constraints): we DETECT and WARN. We do NOT hard-block
// legitimate users, since root/jailbreak signals have false positives and
// blocking would lock people out. Screens that show highly-sensitive data (the
// document vault) can choose to add friction based on `isCompromised`.
import { Platform } from 'react-native';
import { useEffect, useState } from 'react';

export interface IntegrityResult {
  /** Whether a native integrity module was available to make a determination. */
  available: boolean;
  isCompromised: boolean;
  isJailBroken?: boolean;
  isRooted?: boolean;
  hookDetected?: boolean;
  onExternalStorage?: boolean;
  debuggedMode?: boolean;
  reasons: string[];
}

const SAFE_RESULT: IntegrityResult = { available: false, isCompromised: false, reasons: [] };

let jailMonkey: any;
function getJailMonkey(): any {
  if (jailMonkey !== undefined) return jailMonkey;
  if (Platform.OS === 'web') {
    jailMonkey = null;
    return null;
  }
  try {
    jailMonkey = require('jail-monkey');
  } catch {
    jailMonkey = null; // Expo Go / not installed
  }
  return jailMonkey;
}

export function checkDeviceIntegrity(): IntegrityResult {
  const jm = getJailMonkey();
  if (!jm) return SAFE_RESULT;

  try {
    const reasons: string[] = [];
    const isJailBroken = safeBool(() => jm.isJailBroken());
    const hookDetected = safeBool(() => jm.hookDetected?.());
    const onExternalStorage = safeBool(() => jm.isOnExternalStorage?.());
    const debuggedMode = safeBool(() => jm.isDebuggedMode?.()); // async on some versions

    if (isJailBroken) reasons.push(Platform.OS === 'ios' ? 'jailbroken' : 'rooted');
    if (hookDetected) reasons.push('hooking-framework-detected');
    if (onExternalStorage) reasons.push('app-on-external-storage');

    return {
      available: true,
      isCompromised: isJailBroken || hookDetected,
      isJailBroken: Platform.OS === 'ios' ? isJailBroken : undefined,
      isRooted: Platform.OS === 'android' ? isJailBroken : undefined,
      hookDetected,
      onExternalStorage,
      debuggedMode,
      reasons,
    };
  } catch {
    return SAFE_RESULT;
  }
}

function safeBool(fn: () => unknown): boolean {
  try {
    return fn() === true;
  } catch {
    return false;
  }
}

/** React hook: runs the check once on mount. Returns SAFE_RESULT until resolved. */
export function useDeviceIntegrity(): IntegrityResult {
  const [result, setResult] = useState<IntegrityResult>(SAFE_RESULT);
  useEffect(() => {
    setResult(checkDeviceIntegrity());
  }, []);
  return result;
}
