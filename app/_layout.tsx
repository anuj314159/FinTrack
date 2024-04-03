import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import 'react-native-reanimated';
import React from 'react';
import { AuthProvider } from '../AuthContext'; // Adjust path
import { useColorScheme } from '@/hooks/useColorScheme';
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

SplashScreen.preventAutoHideAsync();

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

export default function RootLayout() {
  const colorScheme = useColorScheme();
  const [loaded] = useFonts({
    SpaceMono: require('../assets/fonts/SpaceMono-Regular.ttf'),
  });

  useEffect(() => {
    if (loaded) {
      SplashScreen.hideAsync();
      setupNotificationsIfEnabled();
    }
  }, [loaded]);

  if (!loaded) {
    return null;
  }

  return (
    <AuthProvider>
      <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
      <Stack>
      {/* Main Tabs */}
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />

      {/* Stack-only screens */}
      <Stack.Screen name="genAiAnalysis" options={{ title: "Gen AI Analysis", headerShown: true }} />
      <Stack.Screen name="Search" options={{ headerShown: true }} />
      <Stack.Screen name="About" options={{ headerShown: true }} />

      {/* Not found fallback */}
      <Stack.Screen name="+not-found" />
      </Stack>
        <StatusBar style="auto" />
      </ThemeProvider>
    </AuthProvider>
  );
}

// 🔍 Check user preferences before scheduling
async function setupNotificationsIfEnabled() {
  try {
    const prefs = await AsyncStorage.getItem('user_preferences');
    const parsed = prefs ? JSON.parse(prefs) : null;

    if (parsed?.notifications === true) {
      console.log('🔔 Notifications enabled by user — scheduling now...');
      await scheduleDailyNotifications();
    } else {
      console.log('🔕 Notifications turned off — nothing scheduled');
    }
  } catch (error) {
    console.error('❌ Failed to read user preferences:', error);
  }
}

// 📆 Real scheduling function
async function scheduleDailyNotifications() {
  if (!Device.isDevice) {
    console.log('Must use physical device for push notifications');
    return;
  }

  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;

  if (existingStatus !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }

  if (finalStatus !== 'granted') {
    console.log('Notification permission not granted');
    return;
  }

  await Notifications.cancelAllScheduledNotificationsAsync();

  await Notifications.scheduleNotificationAsync({
    content: {
      title: '💸 Track Your Finances!',
      body: 'Don’t forget to log your expenses for the day!',
    },
    trigger: {
      hour: 10,
      minute: 0,
      repeats: true,
    },
  });

  await Notifications.scheduleNotificationAsync({
    content: {
      title: '📊 Time to Reflect!',
      body: 'Check how your financial goals are going today.',
    },
    trigger: {
      hour: 17,
      minute: 0,
      repeats: true,
    },
  });

  console.log('✅ Notifications scheduled for 10:00 and 17:00');
}
