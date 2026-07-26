import { DarkTheme, DefaultTheme, ThemeProvider } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import React, { useEffect } from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
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
    setRegSuccessMsg('');
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
    setRegSuccessMsg('');
    setAuthState('verify-email');
  };

  const handleVerifySuccess = (user: any) => {
    loginSession(user);
  };

  const handleEmailVerifySuccess = () => {
    setRegSuccessMsg('Account registered and verified successfully! You can now log in.');
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
          onGoToRegister={() => {
            setRegSuccessMsg('');
            setAuthState('register');
          }}
          onGoToVerifyEmail={(email) => {
            setEmailAddress(email);
            setRegSuccessMsg('');
            setAuthState('verify-email');
          }}
          registrationSuccessMsg={regSuccessMsg}
          clearSuccessMsg={() => setRegSuccessMsg('')}
        />
      )}

      {authState === 'register' && (
        <VQRRegisterScreen
          onRegisterSuccess={handleRegisterSuccess}
          onGoToLogin={() => {
            setRegSuccessMsg('');
            setAuthState('login');
          }}
        />
      )}

      {authState === 'verify-email' && (
        <VQRVerifyEmailScreen
          email={emailAddress}
          onVerifySuccess={handleEmailVerifySuccess}
          onGoBack={() => {
            setRegSuccessMsg('');
            setAuthState('login');
          }}
        />
      )}

      {authState === 'two-factor' && (
        <VQRTwoFactorScreen
          email={emailAddress}
          tempToken={tempToken}
          onVerifySuccess={handleVerifySuccess}
          onGoBack={() => {
            setRegSuccessMsg('');
            setAuthState('login');
          }}
        />
      )}

      {authState === 'authenticated' && (
        <AppTabs />
      )}
    </ThemeProvider>
  );
}

class UIErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { hasError: boolean; error: Error | null }
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: any) {
    console.error("UI Error caught by boundary:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#0f172a', padding: 24 }}>
          <Text style={{ fontSize: 48, marginBottom: 16 }}>⚠️</Text>
          <Text style={{ fontSize: 20, fontWeight: 'bold', color: '#fff', textAlign: 'center', marginBottom: 8 }}>
            Application Error Caught
          </Text>
          <Text style={{ fontSize: 13, color: '#94a3b8', textAlign: 'center', marginBottom: 24, paddingHorizontal: 16 }}>
            {this.state.error?.message || 'An unexpected rendering error occurred.'}
          </Text>
          <TouchableOpacity
            onPress={() => this.setState({ hasError: false, error: null })}
            style={{ backgroundColor: '#2563eb', paddingHorizontal: 24, paddingVertical: 12, borderRadius: 12 }}
          >
            <Text style={{ color: '#fff', fontWeight: 'bold', fontSize: 14 }}>Reload Application</Text>
          </TouchableOpacity>
        </View>
      );
    }
    return this.props.children;
  }
}

export default function TabLayout() {
  return (
    <ThemeAndAuthPropsProvider>
      <UIErrorBoundary>
        <RootLayoutContent />
      </UIErrorBoundary>
    </ThemeAndAuthPropsProvider>
  );
}
