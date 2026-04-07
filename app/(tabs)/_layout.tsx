import { Tabs } from 'expo-router';
import { View, Text, StyleSheet, Platform } from 'react-native';
import { Colors, Fonts } from '@constants/theme';

function TabIcon({ symbol, label, focused }: { symbol: string; label: string; focused: boolean }) {
  return (
    <View style={styles.tabItem}>
      <Text style={[styles.icon, focused && styles.iconFocused]}>{symbol}</Text>
      <Text style={[styles.label, focused && styles.labelFocused]}>{label}</Text>
    </View>
  );
}

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarShowLabel: false,
        tabBarHideOnKeyboard: true,
        tabBarStyle: styles.tabBar,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Home',
          tabBarIcon: ({ focused }) => (
            <TabIcon symbol="✦" label="Home" focused={focused} />
          ),
        }}
      />
      <Tabs.Screen
        name="chart"
        options={{
          title: 'Chart',
          tabBarIcon: ({ focused }) => (
            <TabIcon symbol="⬡" label="Chart" focused={focused} />
          ),
        }}
      />
      <Tabs.Screen
        name="guru"
        options={{
          title: 'Guru',
          tabBarIcon: ({ focused }) => (
            <TabIcon symbol="🔱" label="Guru" focused={focused} />
          ),
        }}
      />
      <Tabs.Screen
        name="explore"
        options={{
          title: 'Explore',
          tabBarIcon: ({ focused }) => (
            <TabIcon symbol="◉" label="Explore" focused={focused} />
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profile',
          tabBarIcon: ({ focused }) => (
            <TabIcon symbol="☽" label="Profile" focused={focused} />
          ),
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  tabBar: {
    backgroundColor: 'rgba(8,11,20,0.98)',
    borderTopColor: 'rgba(201,168,76,0.25)',
    borderTopWidth: 1,
    height: Platform.OS === 'ios' ? 88 : 68,
    paddingBottom: Platform.OS === 'ios' ? 20 : 8,
    paddingTop: 6,
  },
  tabItem: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    paddingHorizontal: 4,
  },
  icon: {
    fontSize: 24,
    opacity: 0.35,
    color: Colors.star,
  },
  iconFocused: {
    opacity: 1,
    color: Colors.gold,
  },
  label: {
    fontSize: 10,
    letterSpacing: 0.5,
    fontFamily: Fonts.cinzel,
    color: Colors.muted,
    opacity: 0.7,
  },
  labelFocused: {
    color: Colors.gold,
    opacity: 1,
  },
});
