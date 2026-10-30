import { EmptyState, Screen } from '@/components/ui';

export default function HistoryScreen() {
  return (
    <Screen>
      <EmptyState icon="list" title="My birds" message="Your identifications will appear here." />
    </Screen>
  );
}
