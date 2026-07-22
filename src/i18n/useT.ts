import { useSettingsStore } from '../store/settingsStore';
import { translations, TranslationKey, isRTL } from './translations';

/** Simple string interpolation: t('helloName', { name: 'Nick' }) -> "Hello, Nick" */
export function useT() {
  const language = useSettingsStore((s) => s.language);
  const dict = translations[language];

  function t(key: TranslationKey, vars?: Record<string, string | number>): string {
    let str = dict[key] ?? translations.en[key] ?? String(key);
    if (vars) {
      for (const [k, v] of Object.entries(vars)) {
        str = str.replace(`{${k}}`, String(v));
      }
    }
    return str;
  }

  return { t, language, isRTL: isRTL(language) };
}
