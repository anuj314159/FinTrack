import { Tabs } from 'expo-router';
import React from 'react';
import { Ionicons } from '@expo/vector-icons';
import { useColorScheme } from '@/hooks/useColorScheme';

export default function TabLayout() {
  const colorScheme = useColorScheme();
  const tabBarBackground = colorScheme === 'dark' ? '#040404' : '#FAFAFA'; // Dark mode: black, Light mode: white
  const glowColor = colorScheme === 'dark' ? '#D35400' : '#FFA500'; // Dark orange for dark mode, neon orange for light mode

  return (
    <Tabs
      screenOptions={{
        tabBarLabelPosition: 'below-icon', // Ensures labels appear under icons
        tabBarStyle: {
          paddingBottom: 5, // Adjust spacing
          height: 60, // Make tab bar slightly taller
          backgroundColor: tabBarBackground, // Set dynamic background color
        },
        tabBarLabelStyle: {
          fontSize: 12, // Adjust label size
        },
        tabBarActiveTintColor: glowColor, // Change glow color based on theme
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Home',
          tabBarIcon: ({ color, size }) => <Ionicons name="home-outline" size={size} color={color} />, 
        }}
      />
      <Tabs.Screen
        name="explore"
        options={{
          title: 'Charts',
          tabBarIcon: ({ color, size }) => <Ionicons name="bar-chart-outline" size={size} color={color}/>, 
        }}
      />
      <Tabs.Screen
        name="addData"
        options={{
          title: 'New Entry',
          tabBarIcon: ({ color, size }) => <Ionicons name="add-circle-outline" size={size} color={color} />, 
        }}
      />
      <Tabs.Screen
        name="reports"
        options={{
          title: 'Report',
          tabBarIcon: ({ color, size }) => <Ionicons name="document-text-outline" size={size} color={color} />, 
        }}
      />
      <Tabs.Screen
        name="overview"
        options={{
          title: 'Settings',
          tabBarIcon: ({ color, size }) => <Ionicons name="cog-outline" size={size} color={color} />, 
        }}
      />
    </Tabs>
  );
}