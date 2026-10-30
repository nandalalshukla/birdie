import * as Location from 'expo-location';
import { useCallback, useEffect, useState } from 'react';

export type Coords = { lat: number; lon: number; accuracy: number | null };

type Status = 'idle' | 'locating' | 'ready' | 'denied' | 'error';
type State = { coords: Coords | null; status: Status; error: string | null };

async function locate(): Promise<State> {
  try {
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== 'granted') return { coords: null, status: 'denied', error: 'Location permission denied' };
    const pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Highest });
    return {
      coords: { lat: pos.coords.latitude, lon: pos.coords.longitude, accuracy: pos.coords.accuracy },
      status: 'ready',
      error: null,
    };
  } catch (e) {
    return { coords: null, status: 'error', error: e instanceof Error ? e.message : String(e) };
  }
}

/**
 * Requests foreground location permission and a high-accuracy fix. BirdNET uses
 * lat/lon + week of year to restrict candidates to species expected in the area,
 * so a precise location noticeably improves results.
 */
export function useCurrentLocation(autoRequest = true) {
  const [state, setState] = useState<State>({ coords: null, status: 'idle', error: null });

  const refresh = useCallback(async (): Promise<Coords | null> => {
    setState((s) => ({ ...s, status: 'locating', error: null }));
    const next = await locate();
    setState(next);
    return next.coords;
  }, []);

  useEffect(() => {
    if (!autoRequest) return;
    let cancelled = false;
    void locate().then((next) => !cancelled && setState(next));
    return () => {
      cancelled = true;
    };
  }, [autoRequest]);

  // While the automatic request is in flight, report it as locating.
  const status: Status = autoRequest && state.status === 'idle' ? 'locating' : state.status;
  return { ...state, status, refresh };
}
