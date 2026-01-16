import { Tabs } from 'expo-router';
import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSettings } from '@/contexts/SettingsContext';

const styles = StyleSheet.create({
  iconContainer: {
    width: 50,
    height: 50,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 25,
  },
  iconContainerFocused: {
    backgroundColor: '#355e3b15',
    shadowColor: '#355e3b',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 4,
  },
});

const TabBarIcon = ({ name, color, focused }: { name: any; color: string; focused: boolean }) => {
  return (
    <View style={[styles.iconContainer, focused && styles.iconContainerFocused]}>
      <Ionicons name={name} size={30} color={color} />
    </View>
  );
};

export default function TabLayout() {
  const { settings } = useSettings();

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: '#355e3b',
        headerShown: true,
        tabBarStyle: {
          position: 'absolute',
          backgroundColor: '#fff',
          borderRadius: 20,
          marginHorizontal: 16,
          marginBottom: 30,
          height: 65,
          paddingBottom: 8,
          paddingTop: 8,
          borderTopWidth: 0,
          shadowColor: '#000',
          shadowOffset: {
            width: 0,
            height: 4,
          },
          shadowOpacity: 0.15,
          shadowRadius: 8,
          elevation: 8,
        },
      }}>
      <Tabs.Screen
        name="index"
        options={{
          title: 'Budgets',
          tabBarIcon: ({ color, focused }) => (
            <TabBarIcon name="wallet-outline" color={color} focused={focused} />
          ),
        }}
      />
      <Tabs.Screen
        name="charts"
        options={{
          title: 'Charts',
          tabBarIcon: ({ color, focused }) => (
            <TabBarIcon name="bar-chart-outline" color={color} focused={focused} />
          ),
        }}
      />
      <Tabs.Screen
        name="networth"
        options={{
          href: settings.netWorthEnabled ? '/(tabs)/networth' : null,
          title: 'Net Worth',
          tabBarIcon: ({ color, focused }) => (
            <TabBarIcon name="trending-up-outline" color={color} focused={focused} />
          ),
        }}
      />
      <Tabs.Screen
        name="more"
        options={{
          title: 'More',
          tabBarIcon: ({ color, focused }) => (
            <TabBarIcon name="menu-outline" color={color} focused={focused} />
          ),
        }}
      />
    </Tabs>
  );
}
