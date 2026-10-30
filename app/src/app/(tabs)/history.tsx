import { router } from 'expo-router';
import { Alert, FlatList, RefreshControl, StyleSheet } from 'react-native';

import { EmptyState, Text } from '@/components/ui';
import { deleteSighting, SightingRow, useSightings, type Sighting } from '@/features/sightings';
import { spacing, useThemeColors } from '@/theme';

export default function HistoryScreen() {
  const colors = useThemeColors();
  const { items, setItems, loading, error, reload } = useSightings({ mine: true, limit: 500 });
  const speciesCount = new Set(items.map((s) => s.scientific_name)).size;

  const confirmDelete = (s: Sighting) =>
    Alert.alert('Delete sighting?', `${s.common_name} will be removed from the map and feed.`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            await deleteSighting(s.id);
            setItems((prev) => prev.filter((x) => x.id !== s.id));
          } catch (e) {
            Alert.alert('Delete failed', e instanceof Error ? e.message : String(e));
          }
        },
      },
    ]);

  return (
    <FlatList
      style={{ backgroundColor: colors.background }}
      contentContainerStyle={styles.list}
      data={items}
      keyExtractor={(s) => s.id}
      refreshControl={<RefreshControl refreshing={loading} onRefresh={reload} tintColor={colors.primary} />}
      ListHeaderComponent={
        items.length ? (
          <Text muted>
            {items.length} sighting{items.length === 1 ? '' : 's'} · {speciesCount} species · long-press to delete
          </Text>
        ) : undefined
      }
      ListEmptyComponent={
        loading ? undefined : (
          <EmptyState
            icon={error ? 'cloud-offline-outline' : 'leaf-outline'}
            title={error ? "Couldn't load your birds" : 'No birds yet'}
            message={error ?? 'Identify a bird on the Listen tab and save it — it will show up here and on the map.'}
          />
        )
      }
      renderItem={({ item }) => (
        <SightingRow
          sighting={item}
          onPress={() => item.job_id && router.push({ pathname: '/analysis/[id]', params: { id: item.job_id } })}
          onLongPress={() => confirmDelete(item)}
        />
      )}
    />
  );
}

const styles = StyleSheet.create({
  list: { padding: spacing.lg, gap: spacing.sm, flexGrow: 1 },
});
