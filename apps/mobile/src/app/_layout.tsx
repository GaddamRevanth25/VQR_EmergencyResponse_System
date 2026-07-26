import { DarkTheme, DefaultTheme, ThemeProvider } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import React, { useEffect } from 'react';
import { ThemeAndAuthPropsProvider, useThemeAndAuth } from '../context/ThemeAndAuthContext';
import AsyncStorage from '@react-native-async-storage/async-storage';

import VQRSplashScreen from '@/components/auth/splash-screen';
import VQRLoginScreen from '@/components/auth/login-screen';
import VQRRegisterScreen from '@/components/auth/register-screen';
import VQRTwoFactorScreen from '@/components/auth/two-factor-screen';
import VQRVerifyEmailScreen from '@/components/auth/verify-email-screen';
import AppTabs from '@/components/app-tabs';

SplashScreen.preventAutoHideAsync();

function RootLayoutContent() {
  const { authState, setAuthState, isInitialized, loginSession, resolvedTheme } = useThemeAndAuth();
  const [regSuccessMsg, setRegSuccessMsg] = React.useState('');

  const [tempToken, setTempToken] = React.useState('');
  const [emailAddress, setEmailAddress] = React.useState('');

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

  const handleLoginSuccess = (requires2fa: boolean, token?: string, email?: string, user?: any) => {
    if (requires2fa && token) {
      setTempToken(token);
      if (email) setEmailAddress(email);
      setAuthState('two-factor');
    } else if (user) {
      loginSession(user);
    }
  };

  const handleRegisterSuccess = (email: string) => {
    setEmailAddress(email);
    setRegSuccessMsg('Registration successful! Please confirm your email address.');
    setAuthState('verify-email');
  };

  const handleVerifySuccess = (user: any) => {
    loginSession(user);
  };

  const handleEmailVerifySuccess = () => {
    setRegSuccessMsg('Email confirmed! You can now log in.');
    setAuthState('login');
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
          onGoToVerifyEmail={(email) => {
            setEmailAddress(email);
            setAuthState('verify-email');
          }}
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

      {authState === 'verify-email' && (
        <VQRVerifyEmailScreen
          email={emailAddress}
          onVerifySuccess={handleEmailVerifySuccess}
          onGoBack={() => setAuthState('register')}
        />
      )}

      {authState === 'two-factor' && (
        <VQRTwoFactorScreen
          email={emailAddress}
          tempToken={tempToken}
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
