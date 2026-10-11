import { registerPlugin } from '@capacitor/core';
import type { ThemePalette } from '../context/ThemeContext';

export interface MaterialYouColors {
  tertiary: string;
  tertiaryLight: string;
  primary: string;
}

interface ThemePluginInterface {
  getMaterialYouColors(): Promise<MaterialYouColors>;
  getSystemAccentColor(): Promise<{ color: string; tertiary?: string; tertiaryLight?: string }>;
}

const ThemePlugin = registerPlugin<ThemePluginInterface>('Theme');

export async function fetchMaterialYouColors(): Promise<MaterialYouColors> {
  try {
    const res = await ThemePlugin.getMaterialYouColors();
    if (res && res.primary) {
      return {
        tertiary: res.tertiary || res.primary,
        tertiaryLight: res.tertiaryLight || res.tertiary || res.primary,
        primary: res.primary
      };
    }
  } catch {
    // Native plugin not available on browser
  }

  // Graceful system fallback (Material 3 Dynamic Theme)
  return {
    primary: '#6366F1',
    tertiary: '#7C3AED',
    tertiaryLight: '#A78BFA'
  };
}

/**
 * Converts a hex color string to HSL [0-360, 0-100, 0-100]
 */
export function hexToHsl(hex: string): [number, number, number] {
  let clean = hex.replace('#', '');
  if (clean.length === 3) {
    clean = clean.split('').map(c => c + c).join('');
  }
  const num = parseInt(clean, 16);
  if (isNaN(num)) return [240, 70, 50];

  const r = ((num >> 16) & 255) / 255;
  const g = ((num >> 8) & 255) / 255;
  const b = (num & 255) / 255;

  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const delta = max - min;

  let h = 0;
  let s = 0;
  const l = (max + min) / 2;

  if (delta !== 0) {
    s = l > 0.5 ? delta / (2 - max - min) : delta / (max + min);
    switch (max) {
      case r:
        h = ((g - b) / delta + (g < b ? 6 : 0)) * 60;
        break;
      case g:
        h = ((b - r) / delta + 2) * 60;
        break;
      case b:
        h = ((r - g) / delta + 4) * 60;
        break;
    }
  }

  return [Math.round(h), Math.round(s * 100), Math.round(l * 100)];
}

/**
 * Converts HSL [0-360, 0-100, 0-100] to a hex color string
 */
export function hslToHex(h: number, s: number, l: number): string {
  const normH = ((h % 360) + 360) % 360;
  const normS = Math.min(100, Math.max(0, s)) / 100;
  const normL = Math.min(100, Math.max(0, l)) / 100;

  const c = (1 - Math.abs(2 * normL - 1)) * normS;
  const x = c * (1 - Math.abs(((normH / 60) % 2) - 1));
  const m = normL - c / 2;

  let r = 0, g = 0, b = 0;
  if (normH < 60) {
    r = c; g = x; b = 0;
  } else if (normH < 120) {
    r = x; g = c; b = 0;
  } else if (normH < 180) {
    r = 0; g = c; b = x;
  } else if (normH < 240) {
    r = 0; g = x; b = c;
  } else if (normH < 300) {
    r = x; g = 0; b = c;
  } else {
    r = c; g = 0; b = x;
  }

  const toHex = (val: number) => {
    const hex = Math.round((val + m) * 255).toString(16);
    return hex.length === 1 ? '0' + hex : hex;
  };

  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

/**
 * Computes exact complementary color (rotating hue 180 degrees)
 */
export function getComplementaryColor(hex: string): string {
  const [h, s, l] = hexToHsl(hex);
  const compH = (h + 180) % 360;
  return hslToHex(compH, s, l);
}

/**
 * Builds a dual-mode ThemePalette dynamically derived from system Material You / UI colors.
 * - Light Mode: Muted background, white foreground, deep primary (replacing black), complementary accent
 * - Dark Mode: Solid black (#000000), elevated dark surfaces, luminous primary (replacing white), complementary accent
 */
export function buildDynamicMaterialYouPalette(colors: MaterialYouColors): ThemePalette {
  const primaryBase = colors.primary || '#6366F1';
  const [h, s] = hexToHsl(primaryBase);
  const compH = (h + 180) % 360; // 180-deg complementary hue

  // Light Mode Tokens
  const lightBg = hslToHex(h, 45, 96);           // soft muted tint background
  const lightPrimary = hslToHex(h, 80, 22);      // deep primary replacing black (WCAG AAA)
  const lightCompAccent = hslToHex(compH, 75, 45);// complementary accent
  const lightCompSecondary = hslToHex(compH, 65, 38);
  const lightSecondaryBg = hslToHex(compH, 40, 93);
  const lightBorder = hslToHex(h, 40, 88);
  const lightMuted = hslToHex(h, 25, 45);

  // Dark Mode Tokens
  const darkBg = hslToHex(h, 25, 7);           // rich tinted dark background
  const darkSurface = hslToHex(h, 20, 11);      // tinted elevated dark card surface
  const darkSecondaryBg = hslToHex(h, 22, 16);  // secondary surface
  const darkBorder = hslToHex(h, 25, 22);       // subtle tinted border
  const darkPrimary = hslToHex(h, 80, 78);       // luminous primary replacing white
  const darkCompAccent = hslToHex(compH, 85, 70); // luminous complementary accent
  const darkCompSecondary = hslToHex(compH, 75, 75);
  const darkMuted = hslToHex(h, 20, 70);
  const darkPrimaryText = hslToHex(h, 85, 15);

  return {
    id: 'material_you',
    name: 'System UI (Material)',
    previewColor: primaryBase,
    baseColor: primaryBase,
    bg: lightBg,
    surface: '#FFFFFF',
    secondary: lightCompSecondary,
    border: lightBorder,
    mutedText: lightMuted,
    light: {
      bg: lightBg,
      surface: '#FFFFFF',
      primary: lightPrimary,
      primaryText: '#FFFFFF',
      secondary: lightCompSecondary,
      secondaryBg: lightSecondaryBg,
      border: lightBorder,
      muted: lightMuted,
      accent: lightCompAccent,
    },
    dark: {
      bg: darkBg,
      surface: darkSurface,
      primary: darkPrimary,
      primaryText: darkPrimaryText,
      secondary: darkCompSecondary,
      secondaryBg: darkSecondaryBg,
      border: darkBorder,
      muted: darkMuted,
      accent: darkCompAccent,
    }
  };
}

export function applyMaterialYouToCssVariables(colors: MaterialYouColors, isDark: boolean) {
  if (typeof document === 'undefined') return;
  const root = document.documentElement;
  const activeTertiary = isDark ? (colors.tertiaryLight || colors.tertiary) : colors.tertiary;

  root.style.setProperty('--accent-tertiary', activeTertiary);
  root.style.setProperty('--accent-tertiary-subtle', `${activeTertiary}1F`);
  root.style.setProperty('--accent-tertiary-glow', `${activeTertiary}33`);
}
