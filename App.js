import 'react-native-gesture-handler';
import React, { useEffect } from 'react';
import { StatusBar } from 'expo-status-bar';
import * as SplashScreen from 'expo-splash-screen';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { AuthProvider } from './src/context/AuthContext';
import AppNavigator    from './src/navigation/AppNavigator';

// Keep splash screen visible while we bootstrap
SplashScreen.preventAutoHideAsync();

export default function App() {
  useEffect(() => {
    // Hide splash once fonts/assets are ready
    SplashScreen.hideAsync();
  }, []);

  return (
    <SafeAreaProvider>
      <AuthProvider>
        <StatusBar style="light" backgroundColor="transparent" translucent />
        <AppNavigator />
      </AuthProvider>
    </SafeAreaProvider>
  );
}
