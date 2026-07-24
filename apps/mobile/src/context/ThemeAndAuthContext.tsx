import React, { createContext, useContext, useState, useEffect } from 'react';
import { useColorScheme as useRNColorScheme, Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { DEFAULT_API_URL } from '../constants/config';


export type ThemePreference = 'system' | 'light' | 'dark';
export type AuthState = 'splash' | 'login' | 'register' | 'verify-email' | 'two-factor' | 'authenticated';

export interface UserInfo {
  name: string;
  email: string;
  phone: string;
  role: string;
  emergencyContactName?: string;
  emergencyContactPhone?: string;
  emergencyContactRelation?: string;
  bloodGroup?: string;
}

interface ThemeAndAuthContextType {
  authState: AuthState;
  setAuthState: (state: AuthState) => void;
  userInfo: UserInfo | null;
  setUserInfo: (user: UserInfo | null) => void;
  themePreference: ThemePreference;
  setThemePreference: (pref: ThemePreference) => Promise<void>;
  resolvedTheme: 'light' | 'dark';
  logout: () => Promise<void>;
  loginSession: (user: UserInfo) => Promise<void>;
  isInitialized: boolean;
}

const ThemeAndAuthContext = createContext<ThemeAndAuthContextType | undefined>(undefined);

// Memory fallback store
const memoryStore: Record<string, string> = {};

// Safe wrapper resolving 'Native module is null cannot access legacy Storage' errors on simulators / Web
const safeStorage = {
  getItem: async (key: string): Promise<string | null> => {
    try {
      if (Platform.OS === 'web') {
        if (typeof window !== 'undefined' && window.localStorage) {
          return window.localStorage.getItem(key);
        }
        return memoryStore[key] || null;
      }
      return await AsyncStorage.getItem(key);
    } catch (e) {
      console.warn('AsyncStorage safeStorage warning: falling back to memory store', e);
      return memoryStore[key] || null;
    }
  },
  setItem: async (key: string, value: string): Promise<void> => {
    try {
      if (Platform.OS === 'web') {
        if (typeof window !== 'undefined' && window.localStorage) {
          window.localStorage.setItem(key, value);
          return;
        }
        memoryStore[key] = value;
        return;
      }
      await AsyncStorage.setItem(key, value);
    } catch (e) {
      console.warn('AsyncStorage safeStorage warning: falling back to memory store', e);
      memoryStore[key] = value;
    }
  },
  removeItem: async (key: string): Promise<void> => {
    try {
      if (Platform.OS === 'web') {
        if (typeof window !== 'undefined' && window.localStorage) {
          window.localStorage.removeItem(key);
          return;
        }
        delete memoryStore[key];
        return;
      }
      await AsyncStorage.removeItem(key);
    } catch (e) {
      console.warn('AsyncStorage safeStorage warning: falling back to memory store', e);
      delete memoryStore[key];
    }
  }
};

export const ThemeAndAuthPropsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const systemScheme = useRNColorScheme();
  const [authState, setAuthState] = useState<AuthState>('splash');
  const [userInfo, setUserInfo] = useState<UserInfo | null>(null);
  const [themePreference, setThemePreferenceState] = useState<ThemePreference>('system');
  const [isInitialized, setIsInitialized] = useState(false);

  useEffect(() => {
    const loadState = async () => {
      try {
        const storedAuth = await safeStorage.getItem('@vqr_auth_state');
        const storedUser = await safeStorage.getItem('@vqr_user_info');
        const storedTheme = await safeStorage.getItem('@vqr_theme_pref');

        // Always write the freshly auto-detected URL on startup
        // This ensures IP changes (e.g. switching networks) are picked up automatically
        console.log(`[ThemeAndAuthContext] API URL auto-detected: "${DEFAULT_API_URL}"`);
        await safeStorage.setItem('vqr_api_url', DEFAULT_API_URL);

        if (storedTheme) {
          setThemePreferenceState(storedTheme as ThemePreference);
        }

        if (storedAuth === 'authenticated' && storedUser) {
          setUserInfo(JSON.parse(storedUser));
          setAuthState('authenticated');
        } else {
          setAuthState('splash');
        }
      } catch (e) {
        console.error('Failed to load persisted state', e);
      } finally {
        setIsInitialized(true);
      }
    };
    loadState();
  }, []);

  const setThemePreference = async (pref: ThemePreference) => {
    try {
      setThemePreferenceState(pref);
      await safeStorage.setItem('@vqr_theme_pref', pref);
    } catch (e) {
      console.error('Failed to save theme preference', e);
    }
  };

  const loginSession = async (user: UserInfo) => {
    try {
      setUserInfo(user);
      await safeStorage.setItem('@vqr_auth_state', 'authenticated');
      await safeStorage.setItem('@vqr_user_info', JSON.stringify(user));
      setAuthState('authenticated');
    } catch (e) {
      console.error('Failed to save login session', e);
    }
  };

  const logout = async () => {
    try {
      setUserInfo(null);
      setAuthState('login');
      await safeStorage.removeItem('@vqr_auth_state');
      await safeStorage.removeItem('@vqr_user_info');
    } catch (e) {
      console.error('Failed to logout session', e);
    }
  };

  const resolvedTheme =
    themePreference === 'system'
      ? (systemScheme === 'dark' ? 'dark' : 'light')
      : themePreference;

  return (
    <ThemeAndAuthContext.Provider
      value={{
        authState,
        setAuthState,
        userInfo,
        setUserInfo,
        themePreference,
        setThemePreference,
        resolvedTheme,
        logout,
        loginSession,
        isInitialized,
      }}
    >
      {children}
    </ThemeAndAuthContext.Provider>
  );
};

export const useThemeAndAuth = () => {
  const context = useContext(ThemeAndAuthContext);
  if (!context) {
    throw new Error('useThemeAndAuth must be used within ThemeAndAuthPropsProvider');
  }
  return context;
};
