import { useColorScheme } from 'react-native';

import { darkColors, lightColors, type ColorScheme } from './colors';

export * from './colors';
export * from './spacing';

export function useThemeColors(): ColorScheme {
  return useColorScheme() === 'dark' ? darkColors : lightColors;
}
