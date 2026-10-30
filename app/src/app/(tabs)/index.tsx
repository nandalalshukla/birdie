import { EmptyState, Screen } from '@/components/ui';

export default function IndexScreen() {
  return (
    <Screen>
      <EmptyState icon="mic" title="Listen" message="Record 10–15 seconds of birdsong to identify it." />
    </Screen>
  );
}
