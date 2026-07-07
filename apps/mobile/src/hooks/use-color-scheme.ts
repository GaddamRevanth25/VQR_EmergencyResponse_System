import { useThemeAndAuth } from '../context/ThemeAndAuthContext';

export function useColorScheme() {
  try {
    const { resolvedTheme } = useThemeAndAuth();
    return resolvedTheme;
  } catch (e) {
    return 'light';
  }
}
