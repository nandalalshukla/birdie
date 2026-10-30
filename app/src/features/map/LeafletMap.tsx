import { forwardRef, useImperativeHandle, useMemo, useRef, type ComponentType, type Ref } from 'react';
import { StyleSheet, useColorScheme } from 'react-native';
import { WebView as RNWebView, type WebViewMessageEvent, type WebViewProps } from 'react-native-webview';

import { useThemeColors } from '@/theme';

import { buildLeafletHtml, type MapOutbound } from './leafletHtml';
import type { LeafletMapHandle, LeafletMapProps } from './LeafletMap.types';

type WebViewInstance = { injectJavaScript: (script: string) => void };
// react-native-webview's class typings default P to `undefined`, which collapses
// the props to `never` under recent TypeScript. Re-type it once here.
const WebView = RNWebView as unknown as ComponentType<WebViewProps & { ref?: Ref<WebViewInstance> }>;

/** Native implementation: Leaflet inside a WebView. */
export const LeafletMap = forwardRef<LeafletMapHandle, LeafletMapProps>(function LeafletMap(
  { initialCenter, initialZoom = 12, onMessage },
  ref,
) {
  const webview = useRef<WebViewInstance>(null);
  const colors = useThemeColors();
  const dark = useColorScheme() === 'dark';

  // Only build the page once; later updates go through post().
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const html = useMemo(
    () =>
      buildLeafletHtml({
        lat: initialCenter.lat,
        lon: initialCenter.lon,
        zoom: initialZoom,
        primary: colors.primary,
        accent: colors.accent,
        dark,
      }),
    [],
  );

  useImperativeHandle(ref, () => ({
    post: (msg) => {
      webview.current?.injectJavaScript(`window.birdear && window.birdear.handle(${JSON.stringify(msg)}); true;`);
    },
  }));

  return (
    <WebView
      ref={webview}
      style={styles.map}
      originWhitelist={['*']}
      source={{ html, baseUrl: 'https://birdear.local/' }}
      onMessage={(e: WebViewMessageEvent) => {
        try {
          onMessage(JSON.parse(e.nativeEvent.data) as MapOutbound);
        } catch {
          // ignore malformed messages
        }
      }}
      javaScriptEnabled
      domStorageEnabled
      setSupportMultipleWindows={false}
    />
  );
});

const styles = StyleSheet.create({ map: { flex: 1 } });
