import { Tabs, usePathname } from 'expo-router';
import React, { useState, useEffect } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { getSettings } from '@/lib/settings';

export default function TabLayout() {
  const [netWorthEnabled, setNetWorthEnabled] = useState(false);
  const pathname = usePathname();

  // Reload settings whenever the route changes (including when navigating back from More)
  useEffect(() => {
    loadSettings();
  }, [pathname]);

  const loadSettings = async () => {
    const settings = await getSettings();
    setNetWorthEnabled(settings.netWorthEnabled);
  };

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: '#355e3b',
        headerShown: true,
        tabBarStyle: {
          backgroundColor: '#fff',
        },
      }}>
      <Tabs.Screen
        name="index"
        options={{
          title: 'Budgets',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="wallet-outline" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="charts"
        options={{
          title: 'Charts',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="bar-chart-outline" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="networth"
        options={{
          href: netWorthEnabled ? '/(tabs)/networth' : null,
          title: 'Net Worth',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="trending-up-outline" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="more"
        options={{
          title: 'More',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="menu-outline" size={size} color={color} />
          ),
        }}
      />
    </Tabs>
  );
}
