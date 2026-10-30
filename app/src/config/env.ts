import Constants from 'expo-constants';

/**
 * Base URL of the BirdEar backend. Resolution order:
 * 1. EXPO_PUBLIC_API_URL (set in .env or the shell)
 * 2. `expo.extra.apiUrl` from app.json
 * 3. The Metro host machine on port 8000 (handy for Expo Go on a LAN)
 */
function resolveApiUrl(): string {
  const fromEnv = process.env.EXPO_PUBLIC_API_URL;
  if (fromEnv) return fromEnv.replace(/\/$/, '');

  const fromExtra = Constants.expoConfig?.extra?.apiUrl as string | undefined;
  const hostUri = Constants.expoConfig?.hostUri;
  if (fromExtra && !fromExtra.includes('localhost')) return fromExtra.replace(/\/$/, '');
  if (hostUri) return `http://${hostUri.split(':')[0]}:8000`;
  return (fromExtra ?? 'http://localhost:8000').replace(/\/$/, '');
}

export const env = {
  apiUrl: resolveApiUrl(),
};
