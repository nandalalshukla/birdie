import AsyncStorage from '@react-native-async-storage/async-storage';

const KEY = 'birdear.deviceId';
let cached: string | null = null;

function randomId(): string {
  return Array.from({ length: 32 }, () => Math.floor(Math.random() * 16).toString(16)).join('');
}

/** Anonymous, install-scoped id used to group a user's own recordings and sightings. */
export async function getDeviceId(): Promise<string> {
  if (cached) return cached;
  let id = await AsyncStorage.getItem(KEY);
  if (!id) {
    id = randomId();
    await AsyncStorage.setItem(KEY, id);
  }
  cached = id;
  return id;
}
