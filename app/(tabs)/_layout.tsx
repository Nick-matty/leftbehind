import { Tabs } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import { StyleSheet, View } from 'react-native';
import { useThemeContext } from '../../src/store/settingsStore';
import { useT } from '../../src/i18n/useT';
import { FloatingAssistant } from '../../src/components/FloatingAssistant';

export default function TabsLayout() {
  const { theme, isDark } = useThemeContext();
  const { t } = useT();

  return (
    <View style={{ flex: 1 }}>
      <Tabs
        screenOptions={{
          headerShown: false,
          tabBarActiveTintColor: theme.tint,
          tabBarInactiveTintColor: theme.textTertiary,
          tabBarStyle: {
            position: 'absolute',
            borderTopWidth: 0,
            elevation: 0,
            backgroundColor: 'transparent',
            height: 84,
            paddingTop: 8,
          },
          tabBarBackground: () => (
            <View style={StyleSheet.absoluteFill}>
              <BlurView
                intensity={isDark ? 48 : 42}
                tint={isDark ? 'systemThinMaterialDark' : 'systemThinMaterialLight'}
                style={StyleSheet.absoluteFill}
              />
              <View
                style={[
                  StyleSheet.absoluteFill,
                  {
                    backgroundColor: isDark ? 'rgba(8,14,24,0.38)' : 'rgba(255,255,255,0.28)',
                    borderTopWidth: StyleSheet.hairlineWidth,
                    borderTopColor: isDark ? 'rgba(255,255,255,0.14)' : 'rgba(255,255,255,0.55)',
                  },
                ]}
              />
            </View>
          ),
          tabBarLabelStyle: { fontSize: 11, fontWeight: '600' },
        }}
      >
        <Tabs.Screen name="index" options={{ title: t('home'), tabBarIcon: ({ color, size }) => <MaterialIcons name="home" size={size} color={color} /> }} />
        <Tabs.Screen name="trips" options={{ title: t('trips'), tabBarIcon: ({ color, size }) => <MaterialIcons name="card-travel" size={size} color={color} /> }} />
        <Tabs.Screen name="map" options={{ title: t('map'), tabBarIcon: ({ color, size }) => <MaterialIcons name="map" size={size} color={color} /> }} />
        <Tabs.Screen name="calendar" options={{ title: t('calendar'), tabBarIcon: ({ color, size }) => <MaterialIcons name="calendar-today" size={size} color={color} /> }} />
        <Tabs.Screen name="profile" options={{ title: t('profile'), tabBarIcon: ({ color, size }) => <MaterialIcons name="person" size={size} color={color} /> }} />
      </Tabs>
      <FloatingAssistant />
    </View>
  );
}
