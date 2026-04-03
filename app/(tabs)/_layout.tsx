import { Tabs } from 'expo-router';
import { View, StyleSheet } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { colors } from '@/constants/theme';

function RecordIcon({ color, size }: { color: string; size: number }) {
  return (
    <View style={[styles.recordWrap, { width: size + 20, height: size + 20 }]}>
      <View style={[styles.recordDot, { width: size, height: size, backgroundColor: color }]} />
    </View>
  );
}

function TabIcon({ d, color, size }: { d: string; color: string; size: number }) {
  return <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={1.5}><Path d={d} /></Svg>;
}

export default function TabLayout() {
  return (
    <Tabs screenOptions={{
      headerShown: false,
      tabBarStyle: {
        backgroundColor: '#FFFFFF',
        borderTopColor: colors.border,
        borderTopWidth: 1,
        height: 80,
        paddingBottom: 20,
        paddingTop: 8,
      },
      tabBarActiveTintColor: colors.accent,
      tabBarInactiveTintColor: colors.textMuted,
      tabBarLabelStyle: { fontSize: 11 },
    }}>
      <Tabs.Screen name="journal" options={{
        title: 'Journal',
        tabBarIcon: ({ color, size }) => <TabIcon d="M4 19V5a2 2 0 012-2h8l6 6v10a2 2 0 01-2 2H6a2 2 0 01-2-2z" color={color} size={size} />,
      }} />
      <Tabs.Screen name="dream-map" options={{
        title: 'Dream Map',
        tabBarIcon: ({ color, size }) => <TabIcon d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" color={color} size={size} />,
      }} />
      <Tabs.Screen name="record" options={{
        title: 'Record',
        tabBarIcon: ({ color, size }) => <RecordIcon color={color} size={size} />,
      }} />
      <Tabs.Screen name="shadow-work" options={{
        title: 'Shadow',
        tabBarIcon: ({ color, size }) => <TabIcon d="M12 3v1m0 16v1m8.66-13.66l-.71.71M4.05 19.95l-.71.71M21 12h-1M4 12H3m16.66 7.66l-.71-.71M4.05 4.05l-.71-.71" color={color} size={size} />,
      }} />
      <Tabs.Screen name="my-world" options={{
        title: 'My World',
        tabBarIcon: ({ color, size }) => <TabIcon d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z" color={color} size={size} />,
      }} />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  recordWrap: {
    borderRadius: 999,
    borderWidth: 2,
    borderColor: colors.accent,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: -10,
  },
  recordDot: {
    borderRadius: 999,
  },
});
