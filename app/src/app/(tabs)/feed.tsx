import { router } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, FlatList, RefreshControl, StyleSheet, View } from 'react-native';

import { EmptyState, Segmented, Text } from '@/components/ui';
import { ProfileBanner, TrendingStrip, useFeed } from '@/features/feed';
import { useCurrentLocation } from '@/features/location/useCurrentLocation';
import { SightingRow } from '@/features/sightings';
import { spacing, useThemeColors } from '@/theme';

type Scope = 'nearby' | 'everywhere';
const RADIUS_KM = 50;

export default function FeedScreen() {
  const colors = useThemeColors();
  const location = useCurrentLocation();
  const [scope, setScope] = useState<Scope>('nearby');
  const [species, setSpecies] = useState<string | null>(null);
  const near = scope === 'nearby' && location.coords ? { lat: location.coords.lat, lon: location.coords.lon } : null;
  const feed = useFeed({ near, radiusKm: RADIUS_KM, species });

  const waitingForLocation = scope === 'nearby' && location.status === 'locating';

  return (
    <FlatList
      style={{ backgroundColor: colors.background }}
      contentContainerStyle={styles.list}
      data={feed.items}
      keyExtractor={(s) => s.id}
      onEndReached={feed.loadMore}
      onEndReachedThreshold={0.4}
      refreshControl={<RefreshControl refreshing={feed.refreshing} onRefresh={feed.refresh} tintColor={colors.primary} />}
      ListHeaderComponent={
        <View style={styles.header}>
          <ProfileBanner />
          <View style={styles.center}>
            <Segmented
              value={scope}
              onChange={setScope}
              options={[
                { value: 'nearby', label: `Within ${RADIUS_KM} km` },
                { value: 'everywhere', label: 'Everywhere' },
              ]}
            />
          </View>
          {scope === 'nearby' && (location.status === 'denied' || location.status === 'error') ? (
            <Text variant="caption" muted style={styles.centerText}>
              Location is off, so you're seeing sightings from everywhere.
            </Text>
          ) : null}
          {feed.stats ? <TrendingStrip stats={feed.stats} selected={species} onSelect={setSpecies} /> : null}
          {feed.error ? <Text style={{ color: colors.danger }}>{feed.error}</Text> : null}
        </View>
      }
      ListEmptyComponent={
        feed.refreshing || waitingForLocation ? undefined : (
          <EmptyState
            icon="people-outline"
            title="Quiet out there"
            message={
              species
                ? 'No recent sightings of this species here.'
                : 'No one has shared a sighting here yet. Be the first — identify a bird and share it!'
            }
          />
        )
      }
      ListFooterComponent={feed.loadingMore ? <ActivityIndicator color={colors.primary} /> : undefined}
      renderItem={({ item }) => (
        <View>
          <SightingRow
            sighting={item}
            showObserver
            onPress={() => item.job_id && router.push({ pathname: '/analysis/[id]', params: { id: item.job_id } })}
          />
          {item.distance_km != null ? (
            <Text variant="caption" muted style={styles.distance}>
              {item.distance_km < 1 ? '< 1' : Math.round(item.distance_km)} km away
            </Text>
          ) : null}
        </View>
      )}
    />
  );
}

const styles = StyleSheet.create({
  list: { padding: spacing.lg, gap: spacing.sm, flexGrow: 1 },
  header: { gap: spacing.md, marginBottom: spacing.sm },
  center: { alignItems: 'center' },
  centerText: { textAlign: 'center' },
  distance: { position: 'absolute', right: spacing.md, top: spacing.sm },
});
