import { EmptyState, Screen } from '@/components/ui';

export default function FeedScreen() {
  return (
    <Screen>
      <EmptyState icon="people" title="Community" message="See what birders nearby are hearing." />
    </Screen>
  );
}
