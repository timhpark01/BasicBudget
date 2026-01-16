import { Tabs } from 'expo-router';
import React from 'react';
import { Ionicons } from '@expo/vector-icons';
import { useSettings } from '@/contexts/SettingsContext';

export default function TabLayout() {
  const { settings } = useSettings();

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
        name="budgets"
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
          href: settings.netWorthEnabled ? '/(tabs)/networth' : null,
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
