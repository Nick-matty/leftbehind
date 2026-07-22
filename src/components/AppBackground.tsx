// Soft atmospheric backdrop so glass cards read as frost (register-style),
// with an even lighter veil when the user sets a custom photo.
import { View, ImageBackground, StyleSheet, StyleProp, ViewStyle } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSettingsStore, useThemeContext } from '../store/settingsStore';

export function AppBackground({
  children,
  style,
}: {
  children?: React.ReactNode;
  style?: StyleProp<ViewStyle>;
}) {
  const backgroundUri = useSettingsStore((s) => s.backgroundUri);
  const { theme, isDark } = useThemeContext();

  if (backgroundUri) {
    return (
      <ImageBackground source={{ uri: backgroundUri }} style={[{ flex: 1 }, style]} resizeMode="cover">
        <View
          style={[
            StyleSheet.absoluteFill,
            { backgroundColor: isDark ? 'rgba(8,14,24,0.28)' : 'rgba(220,230,242,0.22)' },
          ]}
        />
        {children}
      </ImageBackground>
    );
  }

  return (
    <View style={[{ flex: 1, backgroundColor: theme.bg }, style]}>
      <LinearGradient
        pointerEvents="none"
        colors={
          isDark
            ? ['#152238', '#0B1220', '#091018']
            : ['#E8EEF7', '#D5DFEC', '#C8D4E6']
        }
        locations={[0, 0.45, 1]}
        style={StyleSheet.absoluteFill}
      />
      {children}
    </View>
  );
}
