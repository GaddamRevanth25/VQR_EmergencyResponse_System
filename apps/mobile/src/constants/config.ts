import Constants from 'expo-constants';
import { Platform } from 'react-native';

/**
 * Dynamically resolves the backend API URL.
 *
 * In Expo Go development:
 *   - Constants.expoConfig.hostUri gives us "IP:PORT" of the Metro bundler
 *   - We extract the IP and swap the port to 8000 (our FastAPI server)
 *
 * This means you NEVER need to hardcode an IP address.
 * The app automatically finds your dev machine on the network.
 */
function getDefaultApiUrl(): string {
  // 1. Try to extract the dev machine IP from Expo's bundler connection
  const hostUri = Constants.expoConfig?.hostUri; // e.g. "192.168.29.190:8081"
  if (hostUri) {
    const host = hostUri.split(':')[0]; // extract just the IP
    if (host && host !== 'localhost' && host !== '127.0.0.1') {
      return `http://${host}:8000`;
    }
  }

  // 2. Platform-specific fallbacks for local development
  if (Platform.OS === 'android') {
    // Android emulator routes 10.0.2.2 to the host machine's localhost
    return 'http://10.0.2.2:8000';
  }

  // 3. iOS simulator / web can use localhost directly
  return 'http://localhost:8000';
}

export const DEFAULT_API_URL = getDefaultApiUrl();
