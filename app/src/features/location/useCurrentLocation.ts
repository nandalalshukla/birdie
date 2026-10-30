import * as Location from 'expo-location';
import { useCallback, useEffect, useState } from 'react';

export type Coords = { lat: number; lon: number; accuracy: number | null };

type State = {
  coords: Coords | null;
  status: 'idle' | 'locating' | 'ready' | 'denied' | 'error';
  error: string | null;
};

/**
 * Requests foreground location permission and a high-accuracy fix. BirdNET uses
 * lat/lon + week of year to restrict candidates to species expected in the area,
 * so a precise location noticeably improves results.
 */
export function useCurrentLocation(autoRequest = true) {
  const [state, setState] = useState<State>({ coords: null, status: 'idle', error: null });

  const refresh = useCallback(async (): Promise<Coords | null> => {
    setState((s) => ({ ...s, status: 'locating', error: null }));
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        setState({ coords: null, status: 'denied', error: 'Location permission denied' });
        return null;
      }
      const pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Highest });
      const coords = { lat: pos.coords.latitude, lon: pos.coords.longitude, accuracy: pos.coords.accuracy };
      setState({ coords, status: 'ready', error: null });
      return coords;
    } catch (e) {
      setState({ coords: null, status: 'error', error: e instanceof Error ? e.message : String(e) });
      return null;
    }
  }, []);

  useEffect(() => {
    if (autoRequest) void refresh();
  }, [autoRequest, refresh]);

  return { ...state, refresh };
}
