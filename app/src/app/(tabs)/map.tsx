import { EmptyState, Screen } from '@/components/ui';

export default function MapScreen() {
  return (
    <Screen>
      <EmptyState icon="map" title="Map" message="Sightings will be shown on a map." />
    </Screen>
  );
}
