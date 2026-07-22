import { useEffect, useRef } from 'react';
import {
  View,
  Image,
  StyleSheet,
  Animated,
  useWindowDimensions,
  StyleProp,
  ViewStyle,
  Platform,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

const LANDSCAPE = require('../../assets/auth-landscape.png');

const SCALE = 1.2;
const MAX_SHIFT = 32;

/**
 * Full-bleed interactive travel landscape for auth screens.
 * Ambient drift + device-tilt parallax when sensors are available.
 */
export function AuthLandscapeBackground({
  children,
  style,
}: {
  children?: React.ReactNode;
  style?: StyleProp<ViewStyle>;
}) {
  const { width, height } = useWindowDimensions();
  const driftX = useRef(new Animated.Value(0)).current;
  const driftY = useRef(new Animated.Value(0)).current;
  const tiltX = useRef(new Animated.Value(0)).current;
  const tiltY = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.parallel([
          Animated.timing(driftX, { toValue: 1, duration: 16000, useNativeDriver: true }),
          Animated.timing(driftY, { toValue: 1, duration: 12000, useNativeDriver: true }),
        ]),
        Animated.parallel([
          Animated.timing(driftX, { toValue: 0, duration: 16000, useNativeDriver: true }),
          Animated.timing(driftY, { toValue: 0, duration: 12000, useNativeDriver: true }),
        ]),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [driftX, driftY]);

  useEffect(() => {
    let sub: { remove: () => void } | null = null;
    let cancelled = false;
    let onMove: ((e: MouseEvent) => void) | null = null;

    const applyTilt = (nx: number, ny: number) => {
      if (cancelled) return;
      Animated.spring(tiltX, {
        toValue: Math.max(-1, Math.min(1, nx)),
        useNativeDriver: true,
        friction: 9,
        tension: 40,
      }).start();
      Animated.spring(tiltY, {
        toValue: Math.max(-1, Math.min(1, ny)),
        useNativeDriver: true,
        friction: 9,
        tension: 40,
      }).start();
    };

    (async () => {
      if (Platform.OS === 'web') {
        // Pointer parallax on web (no accelerometer).
        onMove = (e: MouseEvent) => {
          const nx = (e.clientX / Math.max(window.innerWidth, 1) - 0.5) * 2;
          const ny = (e.clientY / Math.max(window.innerHeight, 1) - 0.5) * 2;
          applyTilt(nx * 0.9, ny * 0.9);
        };
        window.addEventListener('mousemove', onMove);
        return;
      }
      try {
        const Sensors = await import('expo-sensors');
        Sensors.Accelerometer.setUpdateInterval(48);
        sub = Sensors.Accelerometer.addListener(({ x, y }) => {
          applyTilt(x * 1.2, -y * 1.2);
        });
      } catch {
        /* sensors optional — ambient drift still runs */
      }
    })();

    return () => {
      cancelled = true;
      sub?.remove();
      if (onMove) window.removeEventListener('mousemove', onMove);
    };
  }, [tiltX, tiltY]);

  const translateX = Animated.add(
    driftX.interpolate({ inputRange: [0, 1], outputRange: [-MAX_SHIFT, MAX_SHIFT] }),
    tiltX.interpolate({ inputRange: [-1, 1], outputRange: [MAX_SHIFT * 0.85, -MAX_SHIFT * 0.85] })
  );
  const translateY = Animated.add(
    driftY.interpolate({ inputRange: [0, 1], outputRange: [-MAX_SHIFT * 0.5, MAX_SHIFT * 0.5] }),
    tiltY.interpolate({ inputRange: [-1, 1], outputRange: [MAX_SHIFT * 0.55, -MAX_SHIFT * 0.55] })
  );

  const imgW = width * SCALE;
  const imgH = height * SCALE;

  return (
    <View style={[styles.root, style]}>
      <Animated.View
        pointerEvents="none"
        style={[
          styles.imageWrap,
          {
            width: imgW,
            height: imgH,
            left: (width - imgW) / 2,
            top: (height - imgH) / 2,
            transform: [{ translateX }, { translateY }],
          },
        ]}
      >
        <Image source={LANDSCAPE} style={styles.image} resizeMode="cover" />
      </Animated.View>

      <LinearGradient
        pointerEvents="none"
        colors={['rgba(8,18,36,0.52)', 'rgba(12,28,52,0.38)', 'rgba(6,14,28,0.7)']}
        locations={[0, 0.45, 1]}
        style={StyleSheet.absoluteFill}
      />
      <LinearGradient
        pointerEvents="none"
        colors={['transparent', 'rgba(4,10,22,0.4)']}
        style={styles.bottomFade}
      />

      <View style={styles.content}>{children}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#0A1628', overflow: 'hidden' },
  imageWrap: { position: 'absolute' },
  image: { width: '100%', height: '100%' },
  bottomFade: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: '42%',
  },
  content: { flex: 1 },
});
