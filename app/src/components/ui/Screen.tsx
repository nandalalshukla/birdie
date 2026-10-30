import type { PropsWithChildren } from 'react';
import { ScrollView, StyleSheet, View, type ViewStyle } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { spacing, useThemeColors } from '@/theme';

type Props = PropsWithChildren<{
  scroll?: boolean;
  style?: ViewStyle;
}>;

export function Screen({ children, scroll = false, style }: Props) {
  const colors = useThemeColors();
  const content = scroll ? (
    <ScrollView contentContainerStyle={[styles.content, style]}>{children}</ScrollView>
  ) : (
    <View style={[styles.content, styles.fill, style]}>{children}</View>
  );

  return (
    <SafeAreaView edges={['left', 'right']} style={[styles.fill, { backgroundColor: colors.background }]}>
      {content}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  content: { padding: spacing.lg, gap: spacing.lg },
});
