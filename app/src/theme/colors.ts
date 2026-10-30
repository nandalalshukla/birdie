export const palette = {
  forest900: '#14301F',
  forest700: '#1F4D33',
  forest500: '#2F7A4F',
  forest300: '#7DB892',
  forest100: '#DCEFE2',
  amber500: '#E0A526',
  red500: '#C2412D',
  white: '#FFFFFF',
  gray50: '#F6F7F5',
  gray200: '#E2E5E0',
  gray500: '#7A817B',
  gray800: '#2B302C',
  black: '#0E110F',
};

export type ColorScheme = {
  background: string;
  surface: string;
  border: string;
  text: string;
  textMuted: string;
  primary: string;
  primaryMuted: string;
  onPrimary: string;
  accent: string;
  danger: string;
};

export const lightColors: ColorScheme = {
  background: palette.gray50,
  surface: palette.white,
  border: palette.gray200,
  text: palette.gray800,
  textMuted: palette.gray500,
  primary: palette.forest500,
  primaryMuted: palette.forest100,
  onPrimary: palette.white,
  accent: palette.amber500,
  danger: palette.red500,
};

export const darkColors: ColorScheme = {
  background: palette.black,
  surface: '#1A1F1B',
  border: '#2E3530',
  text: '#EEF1EE',
  textMuted: '#9AA39C',
  primary: palette.forest300,
  primaryMuted: palette.forest900,
  onPrimary: palette.black,
  accent: palette.amber500,
  danger: '#E66A55',
};
