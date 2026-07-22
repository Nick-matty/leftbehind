import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useColorScheme } from 'react-native';
import * as Localization from 'expo-localization';
import { resolveTheme, ThemeMode } from '../utils/theme';
import { LanguageCode, isSupportedLanguage } from '../i18n/translations';
import type { TravelStyleId } from '../data/personalOptions';
import {
  AssistantStyle,
  DEFAULT_ASSISTANT_STYLE,
} from '../data/assistantPersona';

export interface PersonalProfile {
  /** Country / nationality label */
  nationality: string;
  /** Age in years (user-entered at onboarding / profile) */
  age: number | null;
  homeCurrency: string;
  hobbies: string[];
  interests: string[];
  traits: string[];
  travelStyle: TravelStyleId | '';
  /** Free-text bio the assistant can use */
  aboutMe: string;
  /** True once the user finished (or skipped) about-you onboarding */
  onboardingComplete: boolean;
}

export const EMPTY_PERSONAL_PROFILE: PersonalProfile = {
  nationality: '',
  age: null,
  homeCurrency: 'USD',
  hobbies: [],
  interests: [],
  traits: [],
  travelStyle: '',
  aboutMe: '',
  onboardingComplete: false,
};

interface SettingsState {
  themeMode: ThemeMode;
  language: LanguageCode;
  backgroundUri: string | null;
  personal: PersonalProfile;
  /** How the AI sounds and talks */
  assistantStyle: AssistantStyle;
  hasHydrated: boolean;
  setThemeMode: (mode: ThemeMode) => void;
  setLanguage: (lang: LanguageCode) => void;
  setBackgroundUri: (uri: string | null) => void;
  setPersonal: (patch: Partial<PersonalProfile>) => void;
  replacePersonal: (profile: PersonalProfile) => void;
  setAssistantStyle: (patch: Partial<AssistantStyle>) => void;
}

const deviceLocale = Localization.getLocales()[0]?.languageCode ?? 'en';

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set, get) => ({
      themeMode: 'system',
      language: isSupportedLanguage(deviceLocale) ? (deviceLocale as LanguageCode) : 'en',
      backgroundUri: null,
      personal: { ...EMPTY_PERSONAL_PROFILE },
      assistantStyle: { ...DEFAULT_ASSISTANT_STYLE },
      hasHydrated: false,
      setThemeMode: (mode) => set({ themeMode: mode }),
      setLanguage: (lang) => set({ language: lang }),
      setBackgroundUri: (uri) => set({ backgroundUri: uri }),
      setPersonal: (patch) =>
        set({
          personal: { ...get().personal, ...patch },
        }),
      replacePersonal: (profile) => set({ personal: profile }),
      setAssistantStyle: (patch) =>
        set({
          assistantStyle: { ...get().assistantStyle, ...patch },
        }),
    }),
    {
      name: 'leftbehind-settings',
      storage: createJSONStorage(() => AsyncStorage),
      merge: (persisted, current) => {
        const p = (persisted ?? {}) as Partial<SettingsState>;
        return {
          ...current,
          ...p,
          personal: {
            ...EMPTY_PERSONAL_PROFILE,
            ...(p.personal ?? {}),
          },
          assistantStyle: {
            ...DEFAULT_ASSISTANT_STYLE,
            ...(p.assistantStyle ?? {}),
          },
        };
      },
      onRehydrateStorage: () => (_state, error) => {
        if (error) {
          console.warn('LeftBehind: failed to restore settings, using defaults.', error);
        }
        useSettingsStore.setState({ hasHydrated: true });
      },
    }
  )
);

/** Resolves the active theme object from the persisted preference + live OS scheme. */
export function useThemeContext() {
  const mode = useSettingsStore((s) => s.themeMode);
  const systemScheme = useColorScheme();
  const theme = resolveTheme(mode, systemScheme);
  return { theme, mode, isDark: theme.scheme === 'dark' };
}
