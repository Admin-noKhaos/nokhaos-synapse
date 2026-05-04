// Accent palette + theme helpers shared by ThemeProvider and the accent picker.

export type AccentKey =
  | 'green' | 'aqua' | 'violet' | 'orange'
  | 'pink' | 'blue' | 'yellow' | 'graphite';

export type ThemeMode = 'dark' | 'light';

type AccentDef = {
  label: string;
  a1: string;
  a2: string;
  light: string;
  rgb: string;
  grad: string;
};

export const ACCENTS: Record<AccentKey, AccentDef> = {
  green:    { label: 'Green',    a1: '#34E08A', a2: '#00C26B', light: '#5DEFA5', rgb: '52, 224, 138',
              grad: 'linear-gradient(135deg, #5DEFA5 0%, #00C26B 55%, #00875A 100%)' },
  aqua:     { label: 'Aqua',     a1: '#00E5D1', a2: '#00B5A8', light: '#5DEFE0', rgb: '0, 229, 209',
              grad: 'linear-gradient(135deg, #4DFFEC 0%, #00C2B5 55%, #008078 100%)' },
  violet:   { label: 'Violet',   a1: '#BF5AF2', a2: '#8E3FBF', light: '#DDA0FF', rgb: '191, 90, 242',
              grad: 'linear-gradient(135deg, #DDA0FF 0%, #9B4BDC 55%, #5C2A9C 100%)' },
  orange:   { label: 'Sunset',   a1: '#FF9F0A', a2: '#E07B00', light: '#FFC152', rgb: '255, 159, 10',
              grad: 'linear-gradient(135deg, #FFD37A 0%, #FF9F0A 55%, #C46300 100%)' },
  pink:     { label: 'Magenta',  a1: '#FF375F', a2: '#D11A45', light: '#FF7E9C', rgb: '255, 55, 95',
              grad: 'linear-gradient(135deg, #FF93AB 0%, #FF375F 55%, #B5163E 100%)' },
  blue:     { label: 'Sky',      a1: '#0A84FF', a2: '#0066CC', light: '#5AB0FF', rgb: '10, 132, 255',
              grad: 'linear-gradient(135deg, #5AB0FF 0%, #0A84FF 55%, #0050B0 100%)' },
  yellow:   { label: 'Citron',   a1: '#FFD60A', a2: '#D4AC00', light: '#FFE85A', rgb: '255, 214, 10',
              grad: 'linear-gradient(135deg, #FFEC85 0%, #FFD60A 55%, #B59100 100%)' },
  graphite: { label: 'Graphite', a1: '#C5CCD6', a2: '#8A8E97', light: '#DCE0E6', rgb: '197, 204, 214',
              grad: 'linear-gradient(135deg, #E8ECF1 0%, #B5BBC5 55%, #6E727A 100%)' },
};

export const DEFAULT_ACCENT: AccentKey = 'green';
export const DEFAULT_THEME: ThemeMode = 'dark';

export function applyAccent(key: AccentKey) {
  const a = ACCENTS[key] ?? ACCENTS[DEFAULT_ACCENT];
  const root = document.documentElement;
  root.style.setProperty('--accent-1', a.a1);
  root.style.setProperty('--accent-2', a.a2);
  root.style.setProperty('--accent-light', a.light);
  root.style.setProperty('--accent-rgb', a.rgb);
  root.style.setProperty('--accent-glow', a.rgb);
  root.style.setProperty('--grad-accent', a.grad);
  const amb = document.querySelector<HTMLElement>('.ambient');
  if (amb) {
    amb.style.background =
      `radial-gradient(60vw 60vw at 12% 8%, rgba(${a.rgb}, 0.10), transparent 60%),` +
      `radial-gradient(50vw 50vw at 90% 92%, rgba(${a.rgb}, 0.06), transparent 60%)`;
  }
}

export function applyTheme(mode: ThemeMode) {
  document.documentElement.setAttribute('data-theme', mode);
}
