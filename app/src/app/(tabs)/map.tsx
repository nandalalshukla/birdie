import { Ionicons } from '@expo/vector-icons';
import { router, useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, View } from 'react-native';

import { Segmented, Text } from '@/components/ui';
import { useCurrentLocation } from '@/features/location/useCurrentLocation';
import { LeafletMap, type LeafletMapHandle, type MapOutbound } from '@/features/map';
import { getSightingsGeoJSON, type BBox, type SightingCollection } from '@/features/sightings';
import { radius, spacing, useThemeColors } from '@/theme';

type Scope = 'all' | 'mine';
const WORLD = { lat: 20, lon: 0 };

export default function MapScreen() {
  const colors = useThemeColors();
  const map = useRef<LeafletMapHandle>(null);
  const location = useCurrentLocation();
  const [scope, setScope] = useState<Scope>('all');
  const [bbox, setBbox] = useState<BBox | null>(null);
  const [data, setData] = useState<SightingCollection | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [ready, setReady] = useState(false);
  const centeredOnUser = useRef(false);

  // Center on the user once their location is known.
  useEffect(() => {
    if (!ready || !location.coords) return;
    map.current?.post({ type: 'setUser', lat: location.coords.lat, lon: location.coords.lon });
    if (!centeredOnUser.current) {
      centeredOnUser.current = true;
      map.current?.post({ type: 'setView', lat: location.coords.lat, lon: location.coords.lon, zoom: 12 });
    }
  }, [ready, location.coords]);

  const load = useCallback(async () => {
    if (!bbox) return;
    setLoading(true);
    try {
      const fc = await getSightingsGeoJSON({ bbox, mine: scope === 'mine' });
      setData(fc);
      setError(null);
      map.current?.post({ type: 'setData', geojson: fc });
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }, [bbox, scope]);

  // Debounce map movement.
  useEffect(() => {
    const t = setTimeout(load, 350);
    return () => clearTimeout(t);
  }, [load]);

  // Pick up sightings saved on other screens.
  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load]),
  );

  const onMessage = useCallback(
    (msg: MapOutbound) => {
      if (msg.type === 'ready') setReady(true);
      else if (msg.type === 'bounds') setBbox(msg.bbox);
      else if (msg.type === 'select') {
        const f = data?.features.find((x) => x.id === msg.id);
        if (f?.properties.job_id) router.push({ pathname: '/analysis/[id]', params: { id: f.properties.job_id } });
      }
    },
    [data],
  );

  const recenter = async () => {
    const coords = location.coords ?? (await location.refresh());
    if (coords) map.current?.post({ type: 'setView', lat: coords.lat, lon: coords.lon, zoom: 13 });
  };

  const count = data?.features.length ?? 0;

  return (
    <View style={styles.fill}>
      <LeafletMap
        ref={map}
        initialCenter={location.coords ?? WORLD}
        initialZoom={location.coords ? 12 : 2}
        onMessage={onMessage}
      />
      <View style={styles.topBar} pointerEvents="box-none">
        <Segmented
          value={scope}
          onChange={setScope}
          options={[
            { value: 'all', label: 'Everyone' },
            { value: 'mine', label: 'Mine' },
          ]}
        />
      </View>
      <View style={[styles.status, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        {loading ? <ActivityIndicator size="small" color={colors.primary} /> : null}
        <Text variant="caption" style={error ? { color: colors.danger } : undefined}>
          {error ?? `${count} sighting${count === 1 ? '' : 's'} in view`}
        </Text>
      </View>
      <Pressable
        accessibilityLabel="Center on my location"
        onPress={recenter}
        style={[styles.locate, { backgroundColor: colors.surface, borderColor: colors.border }]}
      >
        <Ionicons name="locate" size={22} color={colors.primary} />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  topBar: { position: 'absolute', top: spacing.md, left: 0, right: 0, alignItems: 'center' },
  status: {
    position: 'absolute',
    bottom: spacing.lg,
    left: spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.xs + 2,
    paddingHorizontal: spacing.md,
    borderRadius: radius.pill,
    borderWidth: StyleSheet.hairlineWidth,
  },
  locate: {
    position: 'absolute',
    bottom: 96,
    right: 10,
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: StyleSheet.hairlineWidth,
  },
});
