import { DarkTheme, DefaultTheme, ThemeProvider } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import React, { useEffect } from 'react';
import { ThemeAndAuthPropsProvider, useThemeAndAuth } from '../context/ThemeAndAuthContext';

import VQRSplashScreen from '@/components/auth/splash-screen';
import VQRLoginScreen from '@/components/auth/login-screen';
import VQRRegisterScreen from '@/components/auth/register-screen';
import VQRTwoFactorScreen from '@/components/auth/two-factor-screen';
import AppTabs from '@/components/app-tabs';

SplashScreen.preventAutoHideAsync();

function RootLayoutContent() {
  const { authState, setAuthState, isInitialized, loginSession, resolvedTheme } = useThemeAndAuth();

  // Hide the native splash screen as soon as state hydration completes
  useEffect(() => {
    if (isInitialized) {
      SplashScreen.hideAsync().catch(() => { });
    }
  }, [isInitialized]);

  if (!isInitialized) {
    return null;
  }

  const handleSplashFinish = () => {
    setAuthState('login');
  };

  const handleLoginSuccess = () => {
    setAuthState('two-factor');
  };

  const handleRegisterSuccess = (msg: string) => {
    setAuthState('login');
  };

  const handleVerifySuccess = () => {
    // Save persistent user session on successful token/passkey verification
    loginSession({
      name: 'Officer Davis',
      email: 'davis@vqr-response.gov',
      phone: '+91 88xxx xx921',
      role: 'Primary First Responder',
    });
  };

  return (
    <ThemeProvider value={resolvedTheme === 'dark' ? DarkTheme : DefaultTheme}>
      {authState === 'splash' && (
        <VQRSplashScreen onFinish={handleSplashFinish} />
      )}

      {authState === 'login' && (
        <VQRLoginScreen
          onLoginSuccess={handleLoginSuccess}
          onGoToRegister={() => setAuthState('register')}
          registrationSuccessMsg=""
          clearSuccessMsg={() => {}}
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

export default function TabLayout() {
  return (
    <ThemeAndAuthPropsProvider>
      <RootLayoutContent />
    </ThemeAndAuthPropsProvider>
  );
}
