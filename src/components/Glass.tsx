// Liquid-glass primitives: frosted surfaces with a specular rim so panels read
// as glass — dim and deep in dark mode, soft in light — with content padded inside.
import {
  StyleSheet,
  View,
  Text,
  StyleProp,
  ViewStyle,
  TextStyle,
  TouchableOpacity,
  TouchableOpacityProps,
  Platform,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { useThemeContext } from '../store/settingsStore';
import { Radius, Spacing, Typography, Glass as GlassTokens } from '../utils/theme';

type GlassVariant = 'auto' | 'overlay';

interface GlassViewProps {
  children?: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  contentStyle?: StyleProp<ViewStyle>;
  radius?: number;
  strong?: boolean;
  variant?: GlassVariant;
  padded?: boolean;
}

function useGlassTokens(variant: GlassVariant) {
  const { theme, isDark } = useThemeContext();
  const g = variant === 'overlay' ? GlassTokens.overlay : theme.glass;
  return { g, isDark, theme };
}

export function GlassView({
  children,
  style,
  contentStyle,
  radius = Radius.lg,
  strong = false,
  variant = 'auto',
  padded = true,
}: GlassViewProps) {
  const { g, isDark } = useGlassTokens(variant);

  return (
    <View
      style={[
        styles.shell,
        {
          borderRadius: radius,
          borderColor: g.border,
          shadowColor: g.shadow,
          shadowOpacity: isDark ? 0.45 : 0.22,
        },
      ]}
    >
      <BlurView intensity={g.intensity} tint={g.tint} style={StyleSheet.absoluteFill} />
      <View
        style={[
          StyleSheet.absoluteFill,
          { backgroundColor: strong ? g.surfaceStrong : g.surface },
        ]}
      />
      <View
        pointerEvents="none"
        style={[
          StyleSheet.absoluteFill,
          isDark ? styles.darkVeil : styles.lightVeil,
        ]}
      />
      <LinearGradient
        pointerEvents="none"
        colors={
          isDark
            ? ['rgba(255,255,255,0.18)', 'rgba(255,255,255,0.03)', 'transparent']
            : ['rgba(255,255,255,0.55)', 'rgba(255,255,255,0.12)', 'transparent']
        }
        locations={[0, 0.35, 1]}
        style={[styles.sheen, { borderTopLeftRadius: radius, borderTopRightRadius: radius }]}
      />
      <View
        pointerEvents="none"
        style={[
          styles.rim,
          {
            borderTopLeftRadius: radius,
            borderTopRightRadius: radius,
            backgroundColor: g.highlight,
            opacity: isDark ? 0.75 : 0.65,
          },
        ]}
      />
      <View style={[styles.content, padded && styles.padded, style, contentStyle]}>
        {children}
      </View>
    </View>
  );
}

export function GlassCard(props: GlassViewProps) {
  return <GlassView {...props} />;
}

interface GlassButtonProps extends TouchableOpacityProps {
  children?: React.ReactNode;
  label?: string;
  tint?: string;
  variant?: GlassVariant;
  textStyle?: StyleProp<TextStyle>;
}

export function GlassButton({
  children,
  label,
  style,
  tint,
  variant = 'auto',
  textStyle,
  disabled,
  ...rest
}: GlassButtonProps) {
  const { g, isDark, theme } = useGlassTokens(variant);
  const onGlass = variant === 'overlay' ? '#FFFFFF' : theme.glass.onGlassText;

  return (
    <TouchableOpacity
      activeOpacity={0.85}
      disabled={disabled}
      style={[{ opacity: disabled ? 0.5 : 1 }, style as StyleProp<ViewStyle>]}
      {...rest}
    >
      <View
        style={[
          styles.buttonShell,
          {
            borderRadius: Radius.lg,
            borderColor: tint ? 'transparent' : g.border,
            overflow: 'hidden',
          },
        ]}
      >
        <BlurView intensity={g.intensity} tint={g.tint} style={StyleSheet.absoluteFill} />
        <View
          style={[
            StyleSheet.absoluteFill,
            { backgroundColor: tint ?? g.surfaceStrong },
          ]}
        />
        {!tint &&
          (isDark ? (
            <View pointerEvents="none" style={[StyleSheet.absoluteFill, styles.darkVeil]} />
          ) : (
            <View pointerEvents="none" style={[StyleSheet.absoluteFill, styles.lightVeil]} />
          ))}
        {!tint && (
          <LinearGradient
            pointerEvents="none"
            colors={
              isDark
                ? ['rgba(180,205,255,0.12)', 'transparent']
                : ['rgba(255,255,255,0.22)', 'transparent']
            }
            style={styles.sheen}
          />
        )}
        <View style={styles.buttonContent}>
          {label ? (
            <Text style={[styles.buttonLabel, { color: tint ? '#fff' : onGlass }, textStyle]}>
              {label}
            </Text>
          ) : (
            children
          )}
        </View>
      </View>
    </TouchableOpacity>
  );
}

/** Constrains auth/onboarding content so glass panels don't stretch edge-to-edge on wide screens. */
export function ScreenNarrow({
  children,
  style,
}: {
  children?: React.ReactNode;
  style?: StyleProp<ViewStyle>;
}) {
  return <View style={[styles.narrow, style]}>{children}</View>;
}

const styles = StyleSheet.create({
  shell: {
    overflow: 'hidden',
    borderWidth: StyleSheet.hairlineWidth,
    shadowOffset: { width: 0, height: 12 },
    shadowRadius: 28,
    elevation: 6,
    ...(Platform.OS === 'web' ? ({ backgroundColor: 'transparent' } as ViewStyle) : null),
  },
  darkVeil: {
    backgroundColor: 'rgba(8,14,28,0.08)',
  },
  lightVeil: {
    backgroundColor: 'rgba(255,255,255,0.04)',
  },
  sheen: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 44,
  },
  rim: {
    position: 'absolute',
    top: 0,
    left: 10,
    right: 10,
    height: StyleSheet.hairlineWidth * 2,
  },
  content: {
    width: '100%',
    minWidth: 0,
  },
  padded: {
    padding: Spacing.md,
  },
  buttonShell: {
    borderWidth: StyleSheet.hairlineWidth * 2,
  },
  buttonContent: {
    minHeight: 54,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 8,
  },
  buttonLabel: {
    ...Typography.body,
    fontWeight: '600',
    fontSize: 16,
  },
  narrow: {
    width: '100%',
    maxWidth: 420,
    alignSelf: 'center',
  },
});
