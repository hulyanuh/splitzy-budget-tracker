import 'react-native-gesture-handler';
import React, { useEffect } from 'react';
import { StatusBar } from 'expo-status-bar';
import * as SplashScreen from 'expo-splash-screen';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { AuthProvider } from './src/context/AuthContext';
import AppNavigator    from './src/navigation/AppNavigator';
import { AppAlertProvider } from './src/components/UIComponents';

// Keep splash screen visible while we bootstrap
try {
  SplashScreen.preventAutoHideAsync().catch(() => {});
} catch (e) {
  console.warn('SplashScreen.preventAutoHideAsync failed:', e);
}

export default function App() {
  return (
    <SafeAreaProvider>
      <AuthProvider>
        <StatusBar style="light" backgroundColor="transparent" translucent />
        <AppAlertProvider>
          <AppNavigator />
        </AppAlertProvider>
      </AuthProvider>
    </SafeAreaProvider>
  );
}
