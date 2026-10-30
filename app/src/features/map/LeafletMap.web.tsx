import { createElement, forwardRef, useEffect, useImperativeHandle, useRef, useState } from 'react';
import { useColorScheme } from 'react-native';

import { useThemeColors } from '@/theme';

import { buildLeafletHtml, type MapOutbound } from './leafletHtml';
import type { LeafletMapHandle, LeafletMapProps } from './LeafletMap.types';

/** Web implementation: the same Leaflet page in an iframe. */
export const LeafletMap = forwardRef<LeafletMapHandle, LeafletMapProps>(function LeafletMap(
  { initialCenter, initialZoom = 12, onMessage },
  ref,
) {
  const iframe = useRef<HTMLIFrameElement | null>(null);
  const colors = useThemeColors();
  const dark = useColorScheme() === 'dark';
  const onMessageRef = useRef(onMessage);
  onMessageRef.current = onMessage;

  // Built once; later updates go through post() so the map keeps its state.
  const [html] = useState(
    () =>
      buildLeafletHtml({
        lat: initialCenter.lat,
        lon: initialCenter.lon,
        zoom: initialZoom,
        primary: colors.primary,
        accent: colors.accent,
        dark,
      }),
  );

  useEffect(() => {
    const listener = (e: MessageEvent) => {
      if (e.source !== iframe.current?.contentWindow || !e.data?.__birdear) return;
      try {
        onMessageRef.current(JSON.parse(e.data.payload) as MapOutbound);
      } catch {
        // ignore
      }
    };
    window.addEventListener('message', listener);
    return () => window.removeEventListener('message', listener);
  }, []);

  useImperativeHandle(ref, () => ({
    post: (msg) => iframe.current?.contentWindow?.postMessage({ __birdear: true, payload: JSON.stringify(msg) }, '*'),
  }));

  return createElement('iframe', {
    ref: iframe,
    srcDoc: html,
    title: 'Sightings map',
    style: { border: 0, width: '100%', height: '100%', flex: 1 },
  });
});
