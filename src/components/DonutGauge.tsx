import { View, Text, StyleSheet } from 'react-native';
import Svg, { Circle } from 'react-native-svg';
import { Colors, Typography } from '../utils/theme';
import { useThemeContext } from '../store/settingsStore';

/** Circular spent/remaining gauge matching the glass mockup. */
export function DonutGauge({
  percent,
  size = 120,
  stroke = 12,
  label = 'Spent',
}: {
  percent: number;
  size?: number;
  stroke?: number;
  label?: string;
}) {
  const { theme } = useThemeContext();
  const pct = Math.max(0, Math.min(100, percent));
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const offset = c * (1 - pct / 100);

  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      <Svg width={size} height={size} style={StyleSheet.absoluteFill}>
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          stroke={theme.border}
          strokeWidth={stroke}
          fill="none"
          opacity={0.55}
        />
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          stroke={Colors.blue}
          strokeWidth={stroke}
          fill="none"
          strokeDasharray={`${c} ${c}`}
          strokeDashoffset={offset}
          strokeLinecap="round"
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
        />
      </Svg>
      <Text style={[Typography.h2, { color: theme.text }]}>{Math.round(pct)}%</Text>
      <Text style={[Typography.tiny, { color: theme.textSecondary }]}>{label}</Text>
    </View>
  );
}
