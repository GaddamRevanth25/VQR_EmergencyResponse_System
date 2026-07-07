import { DarkTheme, DefaultTheme, ThemeProvider } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useColorScheme } from 'react-native';
import React, { useState, useEffect } from 'react';

import VQRSplashScreen from '@/components/auth/splash-screen';
import VQRLoginScreen from '@/components/auth/login-screen';
import VQRRegisterScreen from '@/components/auth/register-screen';
import VQRTwoFactorScreen from '@/components/auth/two-factor-screen';
import AppTabs from '@/components/app-tabs';

SplashScreen.preventAutoHideAsync();

export default function TabLayout() {
  const colorScheme = useColorScheme();

  // Auth state machine: 'splash' | 'login' | 'register' | 'two-factor' | 'authenticated'
  const [authState, setAuthState] = useState<'splash' | 'login' | 'register' | 'two-factor' | 'authenticated'>('splash');
  const [regSuccessMsg, setRegSuccessMsg] = useState('');

  // Hide the native splash screen as soon as our React Native app starts rendering our custom splash
  useEffect(() => {
    SplashScreen.hideAsync().catch(() => { });
  }, []);

  const handleSplashFinish = () => {
    setAuthState('login');
  };

  const handleLoginSuccess = () => {
    setAuthState('two-factor');
  };

  const handleRegisterSuccess = (msg: string) => {
    setRegSuccessMsg(msg);
    setAuthState('login');
  };

  const handleVerifySuccess = () => {
    setAuthState('authenticated');
  };

  return (
    <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
      {authState === 'splash' && (
        <VQRSplashScreen onFinish={handleSplashFinish} />
      )}

      {authState === 'login' && (
        <VQRLoginScreen
          onLoginSuccess={handleLoginSuccess}
          onGoToRegister={() => setAuthState('register')}
          registrationSuccessMsg={regSuccessMsg}
          clearSuccessMsg={() => setRegSuccessMsg('')}
        />
      )}

      {authState === 'register' && (
        <VQRRegisterScreen
          onRegisterSuccess={handleRegisterSuccess}
          onGoToLogin={() => setAuthState('login')}
        />
      )}

      {authState === 'two-factor' && (
        <VQRTwoFactorScreen
          onVerifySuccess={handleVerifySuccess}
          onGoBack={() => setAuthState('login')}
        />
      )}

      {authState === 'authenticated' && (
        <AppTabs />
      )}
    </ThemeProvider>
  );
}
