import { registerPlugin } from '@capacitor/core';

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
    if (res && res.tertiary) {
      return {
        tertiary: res.tertiary,
        tertiaryLight: res.tertiaryLight || res.tertiary,
        primary: res.primary || res.tertiary
      };
    }
  } catch {
    // Native plugin not available on browser
  }

  // Graceful fallback: Material 3 Tertiary violet
  return {
    tertiary: '#7C3AED',
    tertiaryLight: '#A78BFA',
    primary: '#6366F1'
  };
}

export function applyMaterialYouToCssVariables(colors: MaterialYouColors, isDark: boolean) {
  if (typeof document === 'undefined') return;
  const root = document.documentElement;
  const activeTertiary = isDark ? (colors.tertiaryLight || colors.tertiary) : colors.tertiary;

  root.style.setProperty('--accent-tertiary', activeTertiary);
  root.style.setProperty('--accent-tertiary-subtle', `${activeTertiary}1F`); // ~12% opacity hex
  root.style.setProperty('--accent-tertiary-glow', `${activeTertiary}33`); // ~20% opacity hex
}

