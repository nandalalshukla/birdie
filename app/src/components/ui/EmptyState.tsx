import { Ionicons } from '@expo/vector-icons';
import { StyleSheet, View } from 'react-native';

import { spacing, useThemeColors } from '@/theme';

import { Text } from './Text';

type Props = {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  message?: string;
};

export function EmptyState({ icon, title, message }: Props) {
  const colors = useThemeColors();
  return (
    <View style={styles.wrap}>
      <Ionicons name={icon} size={48} color={colors.textMuted} />
      <Text variant="heading">{title}</Text>
      {message ? (
        <Text muted style={styles.message}>
          {message}
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: spacing.sm, padding: spacing.xl },
  message: { textAlign: 'center' },
});
