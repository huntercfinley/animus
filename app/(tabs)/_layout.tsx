import { Tabs } from 'expo-router';
import { View, StyleSheet, Platform } from 'react-native';
import { BlurView } from 'expo-blur';
import Svg, { Path } from 'react-native-svg';
import { colors, fonts } from '@/constants/theme';

function RecordIcon({ color, size }: { color: string; size: number }) {
  const dotSize = size - 4;
  return (
    <View style={[styles.recordWrap, { width: size + 16, height: size + 16 }]}>
      <View style={[styles.recordDot, { width: dotSize, height: dotSize, backgroundColor: colors.record }]} />
    </View>
  );
}

function TabIcon({ d, color, size }: { d: string; color: string; size: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
      <Path d={d} />
    </Svg>
  );
}

function TabBarBackground() {
  if (Platform.OS === 'ios') {
    return <BlurView intensity={80} tint="systemChromeMaterialLight" style={StyleSheet.absoluteFill} />;
  }
  return <View style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(250, 249, 255, 0.92)' }]} />;
}

export default function TabLayout() {
  return (
    <Tabs screenOptions={{
      headerShown: false,
      tabBarBackground: () => <TabBarBackground />,
      tabBarStyle: {
        position: 'absolute',
        borderTopWidth: 0,
        elevation: 0,
        height: 82,
        paddingBottom: 22,
        paddingTop: 10,
        backgroundColor: 'transparent',
      },
      tabBarActiveTintColor: colors.primary,
      tabBarInactiveTintColor: colors.textMuted,
      tabBarLabelStyle: {
        fontFamily: fonts.sansMedium,
        fontSize: 10,
        letterSpacing: 0.3,
      },
    }}>
      <Tabs.Screen name="journal" options={{
        title: 'JOURNAL',
        tabBarIcon: ({ color, size }) => <TabIcon d="M4 19V5a2 2 0 012-2h8l6 6v10a2 2 0 01-2 2H6a2 2 0 01-2-2z" color={color} size={size} />,
      }} />
      <Tabs.Screen name="dream-map" options={{
        title: 'MAP',
        tabBarIcon: ({ color, size }) => <TabIcon d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" color={color} size={size} />,
      }} />
      <Tabs.Screen name="record" options={{
        title: 'RECORD',
        tabBarIcon: ({ color, size }) => <RecordIcon color={color} size={size} />,
      }} />
      <Tabs.Screen name="shadow-work" options={{
        title: 'SHADOW',
        tabBarIcon: ({ color, size }) => <TabIcon d="M12 3v1m0 16v1m8.66-13.66l-.71.71M4.05 19.95l-.71.71M21 12h-1M4 12H3m16.66 7.66l-.71-.71M4.05 4.05l-.71-.71" color={color} size={size} />,
      }} />
      <Tabs.Screen name="my-world" options={{
        title: 'WORLD',
        tabBarIcon: ({ color, size }) => <TabIcon d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z" color={color} size={size} />,
      }} />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  recordWrap: {
    borderRadius: 999,
    borderWidth: 2,
    borderColor: 'rgba(70, 72, 212, 0.25)',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: -8,
  },
  recordDot: {
    borderRadius: 999,
  },
});
