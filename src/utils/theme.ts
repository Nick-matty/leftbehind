import { useColorScheme } from 'react-native';

// Primary blue palette, matched to the approved mockup.
export const Colors = {
  blue: '#3B7DE8',
  blueDark: '#2456B0',
  blueLight: '#E7EFFD',
  blueText: '#12305E',
  green: '#22B07D',
  greenLight: '#E4F8EF',
  amber: '#BA7517',
  amberLight: '#FAEEDA',
  red: '#E24B4A',
  redLight: '#FCEBEB',
  cyan: '#2BB8D6',
  /** Quick-action tile gradients from the glass mockup */
  quickPacking: ['#3B7DE8', '#2456B0'] as const,
  quickBudget: ['#2EC98A', '#1A9A66'] as const,
  quickMap: ['#4CC3E0', '#1F91B0'] as const,
  quickCalendar: ['#F06565', '#C93C3C'] as const,
};

export const GradientStops = {
  auth: ['#0F2A4A', '#2456B0', '#3B7DE8'] as const,
};

// Mockup glassmorphism: high blur, light frost tint, thin luminous border.
export const Glass = {
  light: {
    tint: 'systemThinMaterialLight' as const,
    intensity: 52,
    surface: 'rgba(255,255,255,0.22)',
    surfaceStrong: 'rgba(255,255,255,0.32)',
    border: 'rgba(255,255,255,0.55)',
    highlight: 'rgba(255,255,255,0.7)',
    shadow: 'rgba(15,30,55,0.18)',
    onGlassText: '#12305E',
  },
  dark: {
    tint: 'systemChromeMaterialDark' as const,
    intensity: 48,
    surface: 'rgba(255,255,255,0.10)',
    surfaceStrong: 'rgba(255,255,255,0.16)',
    border: 'rgba(255,255,255,0.28)',
    highlight: 'rgba(210,225,255,0.4)',
    shadow: 'rgba(0,0,0,0.35)',
    onGlassText: '#EEF2FA',
  },
  overlay: {
    tint: 'systemChromeMaterialDark' as const,
    intensity: 55,
    surface: 'rgba(255,255,255,0.12)',
    surfaceStrong: 'rgba(255,255,255,0.18)',
    border: 'rgba(255,255,255,0.32)',
    highlight: 'rgba(255,255,255,0.45)',
    shadow: 'rgba(0,0,0,0.35)',
    onGlassText: '#FFFFFF',
  },
};

export const light = {
  bg: '#D5DFEC',
  bgSecondary: 'rgba(255,255,255,0.35)',
  bgTertiary: 'rgba(186,198,216,0.28)',
  text: '#0F1A2B',
  textSecondary: '#5B6472',
  textTertiary: '#8A93A3',
  border: 'rgba(15,26,43,0.10)',
  borderStrong: 'rgba(15,26,43,0.18)',
  tint: Colors.blue,
  card: 'rgba(255,255,255,0.22)',
  glass: Glass.light,
  scheme: 'light' as const,
};

export const dark = {
  bg: '#0B1220',
  bgSecondary: 'rgba(255,255,255,0.08)',
  bgTertiary: 'rgba(255,255,255,0.06)',
  text: '#EEF2FA',
  textSecondary: '#9AA5B8',
  textTertiary: '#5B6472',
  border: 'rgba(255,255,255,0.12)',
  borderStrong: 'rgba(255,255,255,0.2)',
  tint: Colors.blue,
  card: 'rgba(255,255,255,0.08)',
  glass: Glass.dark,
  scheme: 'dark' as const,
};

export type ThemeMode = 'light' | 'dark' | 'system';

export function resolveTheme(mode: ThemeMode, systemScheme: 'light' | 'dark' | null | undefined) {
  const effective = mode === 'system' ? (systemScheme ?? 'light') : mode;
  return effective === 'dark' ? dark : light;
}

export function useTheme() {
  const scheme = useColorScheme();
  return scheme === 'dark' ? dark : light;
}

export const Typography = {
  h1: { fontSize: 28, fontWeight: '700' as const, letterSpacing: -0.5 },
  h2: { fontSize: 22, fontWeight: '700' as const, letterSpacing: -0.3 },
  h3: { fontSize: 17, fontWeight: '600' as const },
  body: { fontSize: 15, fontWeight: '400' as const, lineHeight: 22 },
  small: { fontSize: 13, fontWeight: '400' as const },
  tiny: { fontSize: 11, fontWeight: '600' as const },
};

export const Radius = { sm: 8, md: 12, lg: 16, xl: 24, full: 999 };
export const Spacing = { xs: 4, sm: 8, md: 16, lg: 24, xl: 32 };
