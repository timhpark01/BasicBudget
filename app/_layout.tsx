import { Stack } from "expo-router";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SettingsProvider } from "@/contexts/SettingsContext";
import Toast from 'react-native-toast-message';

export default function RootLayout() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SettingsProvider>
        <Stack>
          <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        </Stack>
      </SettingsProvider>
      <Toast />
    </GestureHandlerRootView>
  );
}
