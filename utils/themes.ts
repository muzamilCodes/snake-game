export interface ThemeColors {
  name: string;
  id: 'neon' | 'matrix' | 'sunset';
  bg: string;
  headerBg: string;
  boardBg: string;
  gridLine: string;
  snakeHead: string;
  snakeHeadBorder: string;
  snakeBody: string;
  snakeBodyBorder: string;
  snakeTail: string;
  foodColor: string;
  foodGlow: string;
  goldenFood: string;
  accent: string;
  accentSecondary: string;
  cardBg: string;
  textPrimary: string;
  textSecondary: string;
  border: string;
}

export const THEMES: Record<'neon' | 'matrix' | 'sunset', ThemeColors> = {
  neon: {
    name: 'Cyber Neon',
    id: 'neon',
    bg: '#080a1a',
    headerBg: '#0f1430',
    boardBg: '#050714',
    gridLine: 'rgba(0, 240, 255, 0.08)',
    snakeHead: '#00f0ff',
    snakeHeadBorder: '#00b4cc',
    snakeBody: '#00ccdd',
    snakeBodyBorder: '#0099aa',
    snakeTail: '#008899',
    foodColor: '#ff007f',
    foodGlow: 'rgba(255, 0, 127, 0.4)',
    goldenFood: '#ffd700',
    accent: '#00f0ff',
    accentSecondary: '#ff007f',
    cardBg: '#121838',
    textPrimary: '#ffffff',
    textSecondary: '#8a99c7',
    border: '#00f0ff',
  },
  matrix: {
    name: 'Matrix Core',
    id: 'matrix',
    bg: '#040b06',
    headerBg: '#09180c',
    boardBg: '#020603',
    gridLine: 'rgba(0, 255, 102, 0.08)',
    snakeHead: '#00ff66',
    snakeHeadBorder: '#00cc52',
    snakeBody: '#00dd55',
    snakeBodyBorder: '#00aa44',
    snakeTail: '#007733',
    foodColor: '#ffb700',
    foodGlow: 'rgba(255, 183, 0, 0.4)',
    goldenFood: '#00f0ff',
    accent: '#00ff66',
    accentSecondary: '#ffb700',
    cardBg: '#0b1f10',
    textPrimary: '#d4ffd9',
    textSecondary: '#66aa77',
    border: '#00ff66',
  },
  sunset: {
    name: 'Synth Sunset',
    id: 'sunset',
    bg: '#120726',
    headerBg: '#210d42',
    boardBg: '#0a0317',
    gridLine: 'rgba(255, 42, 133, 0.08)',
    snakeHead: '#ff2a85',
    snakeHeadBorder: '#cc1e68',
    snakeBody: '#e62475',
    snakeBodyBorder: '#b31858',
    snakeTail: '#800d3b',
    foodColor: '#ffd700',
    foodGlow: 'rgba(255, 215, 0, 0.4)',
    goldenFood: '#00f0ff',
    accent: '#ff2a85',
    accentSecondary: '#ffd700',
    cardBg: '#28114f',
    textPrimary: '#ffffff',
    textSecondary: '#bb9cdb',
    border: '#ff2a85',
  },
};
