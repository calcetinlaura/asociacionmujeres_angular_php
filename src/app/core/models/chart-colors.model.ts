export type ChartColors = readonly string[];

// Paleta pastel (20 colores)
export const PALETTE_PASTEL: ChartColors = [
  '#dba4f1',
  '#b7d3ff',
  '#b7f0d8',
  '#ffe3a3',
  '#f6b7d2',
  '#ffb8c1',
  '#d6c5ff',
  '#c7f5c8',
  '#ffd8a8',
  '#b8ecf2',
  '#c8e6c9',
  '#ffccbc',
  '#e1bee7',
  '#bbdefb',
  '#fff9c4',
  '#b2ebf2',
  '#f8bbd0',
  '#dcedc8',
  '#ffe0b2',
  '#cfd8dc',
] as const;

// (Opcional) otra paleta más viva
export const PALETTE_VIVID: ChartColors = [
  '#7e57c2',
  '#42a5f5',
  '#26a69a',
  '#ffca28',
  '#ef5350',
  '#ab47bc',
  '#29b6f6',
  '#66bb6a',
  '#ffa726',
  '#ec407a',
  '#5c6bc0',
  '#26c6da',
  '#9ccc65',
  '#ff7043',
  '#8d6e63',
  '#ef6c00',
  '#7cb342',
  '#26a69a',
  '#d4e157',
  '#00897b',
] as const;

// (Opcional) helper para ciclar colores
export const cycleColor = (palette: ChartColors, i: number) =>
  palette[i % palette.length];
