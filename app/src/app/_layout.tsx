import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { ProfileProvider } from '@/features/profile';
import { useThemeColors } from '@/theme';

export default function RootLayout() {
  const colors = useThemeColors();
  return (
    <SafeAreaProvider>
      <ProfileProvider>
      <StatusBar style="auto" />
      <Stack
        screenOptions={{
          headerStyle: { backgroundColor: colors.surface },
          headerTintColor: colors.text,
          contentStyle: { backgroundColor: colors.background },
        }}
      >
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      </Stack>
      </ProfileProvider>
    </SafeAreaProvider>
  );
}
