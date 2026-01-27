import { useEffect } from 'react';
import { Stack } from "expo-router";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import * as Linking from 'expo-linking';
import { SettingsProvider } from "@/contexts/SettingsContext";
import Toast from 'react-native-toast-message';
import { addExpenseFromURL } from '@/lib/utils/url-handler';

export default function RootLayout() {
  useEffect(() => {
    // Handle initial URL when app is opened from a closed state
    Linking.getInitialURL().then((url) => {
      if (url) {
        handleDeepLink(url);
      }
    });

    // Handle URLs when app is already open or in background
    const subscription = Linking.addEventListener('url', (event) => {
      handleDeepLink(event.url);
    });

    return () => {
      subscription.remove();
    };
  }, []);

  async function handleDeepLink(url: string) {
    try {
      // Check if this is an add-expense URL
      if (url.includes('add-expense')) {
        await addExpenseFromURL(url);

        // Success feedback
        Toast.show({
          type: 'success',
          text1: 'Expense added',
          text2: 'Via iOS Shortcut',
          position: 'top',
          visibilityTime: 3000,
        });
      }
    } catch (error) {
      // Error feedback
      const message = error instanceof Error ? error.message : 'Unknown error';
      Toast.show({
        type: 'error',
        text1: 'Failed to add expense',
        text2: message,
        position: 'top',
        visibilityTime: 4000,
      });
    }
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SettingsProvider>
        <Stack
          screenOptions={{
            headerShown: false,
          }}
        >
          <Stack.Screen name="(tabs)" />
        </Stack>
      </SettingsProvider>
      <Toast />
    </GestureHandlerRootView>
  );
}
