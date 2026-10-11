import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { db } from '../db';
import {
  fetchMaterialYouColors,
  applyMaterialYouToCssVariables,
  buildDynamicMaterialYouPalette,
  MaterialYouColors
} from '../utils/materialYouTheme';

export type Theme = 'light' | 'dark' | 'system';

export interface PaletteTokens {
  bg: string;
  surface: string;
  primary: string;
  primaryText: string;
  secondary: string;
  secondaryBg: string;
  border: string;
  muted: string;
  accent: string;
}

export interface ThemePalette {
  id: string;
  name: string;
  previewColor: string;
  baseColor: string; // alias for compatibility
  bg: string;        // alias for compatibility
  surface: string;   // alias for compatibility
  secondary: string; // alias for compatibility
  border: string;    // alias for compatibility
  mutedText: string; // alias for compatibility
  light: PaletteTokens;
  dark: PaletteTokens;
}

export const THEME_PALETTES: ThemePalette[] = [
  {
    id: 'material_you',
    name: 'Material Dynamic',
    previewColor: '#6366F1',
    baseColor: 'material_you',
    bg: '#EEF2FF',
    surface: '#FFFFFF',
    secondary: '#D97706',
    border: '#C7D2FE',
    mutedText: '#4F46E5',
    light: {
      bg: '#EEF2FF',
      surface: '#FFFFFF',
      primary: '#312E81',
      primaryText: '#FFFFFF',
      secondary: '#B45309',
      secondaryBg: '#FEF3C7',
      border: '#C7D2FE',
      muted: '#4F46E5',
      accent: '#D97706',
    },
    dark: {
      bg: '#000000',
      surface: '#121212',
      primary: '#A5B4FC',
      primaryText: '#1E1B4B',
      secondary: '#FDE68A',
      secondaryBg: '#1A1828',
      border: '#2C2746',
      muted: '#9CA3AF',
      accent: '#FBBF24',
    }
  },
  {
    id: 'pink',
    name: 'Blush Rose',
    previewColor: '#F9CAD2',
    baseColor: '#F9CAD2',
    bg: '#FFF0F3',
    surface: '#FFFFFF',
    secondary: '#FDE2E7',
    border: '#FBCFE8',
    mutedText: '#835360',
    light: {
      bg: '#FFF0F3',
      surface: '#FFFFFF',
      primary: '#9F1239', // deep rich rose replacing black
      primaryText: '#FFFFFF',
      secondary: '#BE185D',
      secondaryBg: '#FDE2E7',
      border: '#FBCFE8',
      muted: '#835360',
      accent: '#E11D48',
    },
    dark: {
      bg: '#000000',
      surface: '#121212',
      primary: '#F9CAD2', // luminous blush pink replacing white
      primaryText: '#881337',
      secondary: '#FDA4AF',
      secondaryBg: '#1E1418',
      border: '#331D26',
      muted: '#D4A5B3',
      accent: '#FB7185',
    }
  },
  {
    id: 'yellow',
    name: 'Sunshine Gold',
    previewColor: '#F9DA41',
    baseColor: '#F9DA41',
    bg: '#FFFBEB',
    surface: '#FFFFFF',
    secondary: '#FEF3C7',
    border: '#FDE68A',
    mutedText: '#856E38',
    light: {
      bg: '#FFFBEB',
      surface: '#FFFFFF',
      primary: '#78350F', // deep warm amber replacing black
      primaryText: '#FFFFFF',
      secondary: '#92400E',
      secondaryBg: '#FEF3C7',
      border: '#FDE68A',
      muted: '#856E38',
      accent: '#D97706',
    },
    dark: {
      bg: '#000000',
      surface: '#121212',
      primary: '#F9DA41', // luminous sunshine gold replacing white
      primaryText: '#78350F',
      secondary: '#FDE047',
      secondaryBg: '#1E1A10',
      border: '#332C15',
      muted: '#D6C782',
      accent: '#FACC15',
    }
  },
  {
    id: 'lavender',
    name: 'Soft Lilac',
    previewColor: '#DED2F9',
    baseColor: '#DED2F9',
    bg: '#F5F3FF',
    surface: '#FFFFFF',
    secondary: '#EDE9FE',
    border: '#DDD6FE',
    mutedText: '#6B5B95',
    light: {
      bg: '#F5F3FF',
      surface: '#FFFFFF',
      primary: '#4C1D95', // deep violet replacing black
      primaryText: '#FFFFFF',
      secondary: '#6D28D9',
      secondaryBg: '#EDE9FE',
      border: '#DDD6FE',
      muted: '#6B5B95',
      accent: '#7C3AED',
    },
    dark: {
      bg: '#000000',
      surface: '#121212',
      primary: '#DED2F9', // luminous lilac replacing white
      primaryText: '#4C1D95',
      secondary: '#C4B5FD',
      secondaryBg: '#1B1524',
      border: '#2E2240',
      muted: '#B8A9D9',
      accent: '#A78BFA',
    }
  },
  {
    id: 'mint',
    name: 'Fresh Mint',
    previewColor: '#A7F3D0',
    baseColor: '#A7F3D0',
    bg: '#F0FDF4',
    surface: '#FFFFFF',
    secondary: '#DCFCE7',
    border: '#BBF7D0',
    mutedText: '#477A65',
    light: {
      bg: '#F0FDF4',
      surface: '#FFFFFF',
      primary: '#064E3B', // deep pine replacing black
      primaryText: '#FFFFFF',
      secondary: '#047857',
      secondaryBg: '#DCFCE7',
      border: '#BBF7D0',
      muted: '#477A65',
      accent: '#059669',
    },
    dark: {
      bg: '#000000',
      surface: '#121212',
      primary: '#A7F3D0', // luminous mint replacing white
      primaryText: '#064E3B',
      secondary: '#6EE7B7',
      secondaryBg: '#121F17',
      border: '#1F3628',
      muted: '#88C4A9',
      accent: '#34D399',
    }
  },
  {
    id: 'sky',
    name: 'Sky Azure',
    previewColor: '#BAE6FD',
    baseColor: '#BAE6FD',
    bg: '#F0F9FF',
    surface: '#FFFFFF',
    secondary: '#E0F2FE',
    border: '#BAE6FD',
    mutedText: '#446E87',
    light: {
      bg: '#F0F9FF',
      surface: '#FFFFFF',
      primary: '#0C4A6E', // deep oceanic navy replacing black
      primaryText: '#FFFFFF',
      secondary: '#0284C7',
      secondaryBg: '#E0F2FE',
      border: '#BAE6FD',
      muted: '#446E87',
      accent: '#0284C7',
    },
    dark: {
      bg: '#000000',
      surface: '#121212',
      primary: '#BAE6FD', // luminous sky blue replacing white
      primaryText: '#0C4A6E',
      secondary: '#7DD3FC',
      secondaryBg: '#121B24',
      border: '#1E2F40',
      muted: '#89B9D8',
      accent: '#38BDF8',
    }
  },
  {
    id: 'coral',
    name: 'Warm Coral',
    previewColor: '#FED7AA',
    baseColor: '#FED7AA',
    bg: '#FFF7ED',
    surface: '#FFFFFF',
    secondary: '#FFEDD5',
    border: '#FED7AA',
    mutedText: '#8C5E47',
    light: {
      bg: '#FFF7ED',
      surface: '#FFFFFF',
      primary: '#7C2D12', // deep burnt terracotta replacing black
      primaryText: '#FFFFFF',
      secondary: '#C2410C',
      secondaryBg: '#FFEDD5',
      border: '#FED7AA',
      muted: '#8C5E47',
      accent: '#EA580C',
    },
    dark: {
      bg: '#000000',
      surface: '#121212',
      primary: '#FED7AA', // luminous warm peach replacing white
      primaryText: '#7C2D12',
      secondary: '#FDBA74',
      secondaryBg: '#211612',
      border: '#38251E',
      muted: '#D4A286',
      accent: '#FB923C',
    }
  },
  {
    id: 'mono',
    name: 'Classic Mono',
    previewColor: '#0A0A0A',
    baseColor: '#0A0A0A',
    bg: '#FAFAFA',
    surface: '#FFFFFF',
    secondary: '#F4F4F5',
    border: '#E5E5E5',
    mutedText: '#737373',
    light: {
      bg: '#FAFAFA',
      surface: '#FFFFFF',
      primary: '#0A0A0A',
      primaryText: '#FFFFFF',
      secondary: '#525252',
      secondaryBg: '#F4F4F5',
      border: '#E5E5E5',
      muted: '#737373',
      accent: '#7C3AED',
    },
    dark: {
      bg: '#000000',
      surface: '#121212',
      primary: '#EDEDED',
      primaryText: '#0A0A0A',
      secondary: '#A1A1A1',
      secondaryBg: '#1C1C1E',
      border: '#282828',
      muted: '#737373',
      accent: '#A78BFA',
    }
  }
];

// Alias for backwards compatibility
export const TINT_PRESETS = THEME_PALETTES;

export function resolveThemePalette(colorOrId: string, systemColors?: MaterialYouColors | null): ThemePalette {
  if (!colorOrId) return THEME_PALETTES[0];
  const query = colorOrId.toLowerCase();

  if (query === 'material_you' || query === 'system' || query === 'material') {
    if (systemColors) {
      return buildDynamicMaterialYouPalette(systemColors);
    }
    const match = THEME_PALETTES.find(p => p.id === 'material_you');
    if (match) return match;
  }

  const match = THEME_PALETTES.find(
    p => p.id.toLowerCase() === query ||
         p.previewColor.toLowerCase() === query ||
         p.baseColor.toLowerCase() === query
  );
  if (match) return match;

  // Custom fallback
  return {
    id: 'custom',
    name: 'Custom Palette',
    previewColor: colorOrId,
    baseColor: colorOrId,
    bg: `${colorOrId}1A`,
    surface: '#FFFFFF',
    secondary: `${colorOrId}26`,
    border: `${colorOrId}4D`,
    mutedText: '#666666',
    light: {
      bg: `${colorOrId}14`,
      surface: '#FFFFFF',
      primary: colorOrId,
      primaryText: '#FFFFFF',
      secondary: `${colorOrId}99`,
      secondaryBg: `${colorOrId}1F`,
      border: `${colorOrId}33`,
      muted: '#666666',
      accent: colorOrId,
    },
    dark: {
      bg: '#000000',
      surface: '#121212',
      primary: colorOrId,
      primaryText: '#0A0A0A',
      secondary: `${colorOrId}CC`,
      secondaryBg: '#1A1A1A',
      border: '#282828',
      muted: '#A1A1A1',
      accent: colorOrId,
    }
  };
}

// Alias for backward compatibility
export const resolveTintPreset = resolveThemePalette;

export interface ThemeToggleOptions {
  clientX?: number;
  clientY?: number;
}

interface ThemeContextType {
  theme: Theme;
  setTheme: (theme: Theme) => void;
  toggleTheme: (eventOrOptions?: React.MouseEvent | ThemeToggleOptions) => void;
  isDark: boolean;
  tertiaryColor?: string;
  tintColor: string;
  setTintColor: (color: string) => void;
  palette: ThemePalette;
  tintPreset: ThemePalette; // alias
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [theme, setThemeState] = useState<Theme>('system');
  const [tintColor, setTintColorState] = useState<string>('#F9CAD2');
  const [tertiaryColor, setTertiaryColor] = useState<string>('#7C3AED');
  const [systemColors, setSystemColors] = useState<MaterialYouColors | null>(null);
  const [isDark, setIsDark] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      return document.documentElement.classList.contains('dark') ||
        window.matchMedia('(prefers-color-scheme: dark)').matches;
    }
    return false;
  });

  const activePalette = resolveThemePalette(tintColor, systemColors);

  const applyPaletteToDOM = useCallback((palette: ThemePalette, darkActive: boolean) => {
    if (typeof document === 'undefined') return;
    const root = document.documentElement;
    const tokens = darkActive ? palette.dark : palette.light;

    root.style.setProperty('--theme-bg', tokens.bg);
    root.style.setProperty('--theme-surface', tokens.surface);
    root.style.setProperty('--theme-primary', tokens.primary);
    root.style.setProperty('--theme-primary-text', tokens.primaryText);
    root.style.setProperty('--theme-secondary', tokens.secondary);
    root.style.setProperty('--theme-secondary-bg', tokens.secondaryBg);
    root.style.setProperty('--theme-border', tokens.border);
    root.style.setProperty('--theme-muted', tokens.muted);
    root.style.setProperty('--theme-accent', tokens.accent);

    // Accent variables for Material You / Monet theme integration
    root.style.setProperty('--accent-tertiary', tokens.accent);
    root.style.setProperty('--accent-tertiary-subtle', `${tokens.accent}22`);
    root.style.setProperty('--accent-tertiary-glow', `${tokens.accent}33`);

    // Legacy variables
    root.style.setProperty('--tint-bg', tokens.bg);
    root.style.setProperty('--tint-surface', tokens.surface);
    root.style.setProperty('--tint-secondary', tokens.secondaryBg);
    root.style.setProperty('--tint-border', tokens.border);
    root.style.setProperty('--tint-muted', tokens.muted);
    root.style.setProperty('--tint-base', palette.previewColor);
  }, []);

  useEffect(() => {
    db.settings.toArray().then(settings => {
      if (settings.length > 0) {
        if (settings[0].theme) {
          const loadedTheme = settings[0].theme === ('tinted' as any) ? 'light' : (settings[0].theme as Theme);
          setThemeState(loadedTheme);
        }
        if (settings[0].tintColor) {
          setTintColorState(settings[0].tintColor);
        }
      }
    });

    try {
      const storedTint = localStorage.getItem('__user_tint_color');
      if (storedTint) setTintColorState(storedTint);
    } catch {}

    // Load Material You system colors
    fetchMaterialYouColors().then(colors => {
      if (colors) {
        setSystemColors(colors);
        if (colors.tertiary) {
          setTertiaryColor(colors.tertiary);
          const currentDark = document.documentElement.classList.contains('dark') ||
            window.matchMedia('(prefers-color-scheme: dark)').matches;
          applyMaterialYouToCssVariables(colors, currentDark);
        }
      }
    });
  }, []);

  const computeIsDark = useCallback((t: Theme): boolean => {
    if (t === 'dark') return true;
    if (t === 'light') return false;
    return typeof window !== 'undefined' && window.matchMedia('(prefers-color-scheme: dark)').matches;
  }, []);

  useEffect(() => {
    const root = document.documentElement;
    const activeDark = computeIsDark(theme);
    setIsDark(activeDark);
    if (activeDark) {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }

    const currentPalette = resolveThemePalette(tintColor, systemColors);
    applyPaletteToDOM(currentPalette, activeDark);

    // Refresh dynamic tertiary color tokens when theme changes
    fetchMaterialYouColors().then(colors => {
      applyMaterialYouToCssVariables(colors, activeDark);
    });

    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handleChange = () => {
      if (theme === 'system') {
        const sysDark = mediaQuery.matches;
        setIsDark(sysDark);
        if (sysDark) root.classList.add('dark');
        else root.classList.remove('dark');
        applyPaletteToDOM(currentPalette, sysDark);
        fetchMaterialYouColors().then(colors => {
          applyMaterialYouToCssVariables(colors, sysDark);
        });
      }
    };

    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, [theme, tintColor, systemColors, computeIsDark, applyPaletteToDOM]);

  const saveThemeToDb = async (newTheme: Theme, newTintColor?: string) => {
    const settings = await db.settings.toArray();
    const updatePayload: any = { theme: newTheme };
    if (newTintColor) updatePayload.tintColor = newTintColor;

    if (settings.length > 0) {
      await db.settings.update(settings[0].id!, updatePayload);
    } else {
      await db.settings.add({
        theme: newTheme,
        tintColor: newTintColor || tintColor,
        className: 'My Class',
        section: 'Section A',
        academicYear: '2026 - 2027',
        semester: 'Semester 1',
        department: 'General',
        classRepName: 'Class Representative',
        disableSaturday: true,
        classReminderOffset: 10,
        examReminderOffset: 1440,
        holidays: [],
        notificationsEnabled: true
      });
    }
  };

  const setTheme = async (newTheme: Theme) => {
    setThemeState(newTheme);
    await saveThemeToDb(newTheme);
  };

  const setTintColor = async (color: string) => {
    setTintColorState(color);
    try {
      localStorage.setItem('__user_tint_color', color);
    } catch {}
    await saveThemeToDb(theme, color);
    const palette = resolveThemePalette(color, systemColors);
    applyPaletteToDOM(palette, isDark);
  };

  const toggleTheme = (eventOrOptions?: React.MouseEvent | ThemeToggleOptions) => {
    const currentIsDark = document.documentElement.classList.contains('dark');
    const willBeDark = !currentIsDark;
    const nextTheme: Theme = willBeDark ? 'dark' : 'light';

    let x = window.innerWidth / 2;
    let y = window.innerHeight / 2;

    if (eventOrOptions) {
      if ('currentTarget' in eventOrOptions && eventOrOptions.currentTarget instanceof HTMLElement) {
        const rect = eventOrOptions.currentTarget.getBoundingClientRect();
        x = rect.left + rect.width / 2;
        y = rect.top + rect.height / 2;
      } else if (typeof eventOrOptions.clientX === 'number' && typeof eventOrOptions.clientY === 'number') {
        x = eventOrOptions.clientX;
        y = eventOrOptions.clientY;
      }
    }

    const endRadius = Math.hypot(
      Math.max(x, window.innerWidth - x),
      Math.max(y, window.innerHeight - y)
    );

    const updateDOM = () => {
      setThemeState(nextTheme);
      setIsDark(willBeDark);
      if (willBeDark) {
        document.documentElement.classList.add('dark');
      } else {
        document.documentElement.classList.remove('dark');
      }
      const palette = resolveThemePalette(tintColor, systemColors);
      applyPaletteToDOM(palette, willBeDark);
      saveThemeToDb(nextTheme);
    };

    runCircularThemeTransition(x, y, endRadius, willBeDark, updateDOM, activePalette);
  };

  return (
    <ThemeContext.Provider value={{
      theme,
      setTheme,
      toggleTheme,
      isDark,
      tertiaryColor,
      tintColor,
      setTintColor,
      palette: activePalette,
      tintPreset: activePalette
    }}>
      {children}
    </ThemeContext.Provider>
  );
};

/**
 * Circular expand & contract animation with palette support
 */
function runCircularThemeTransition(
  x: number,
  y: number,
  radius: number,
  willBeDark: boolean,
  updateDOM: () => void,
  palette: ThemePalette
) {
  if (typeof document === 'undefined') {
    updateDOM();
    return;
  }

  const existingOverlay = document.getElementById('theme-transition-ripple');
  if (existingOverlay) {
    existingOverlay.remove();
  }

  const overlay = document.createElement('div');
  overlay.id = 'theme-transition-ripple';
  overlay.style.position = 'fixed';
  overlay.style.inset = '0';
  overlay.style.width = '100vw';
  overlay.style.height = '100vh';
  overlay.style.zIndex = '99999999';
  overlay.style.pointerEvents = 'none';
  overlay.style.willChange = 'clip-path';
  overlay.style.backgroundColor = willBeDark ? (palette?.dark?.bg || '#0A0A0A') : (palette?.light?.bg || '#FFF0F3');

  if (willBeDark) {
    overlay.style.setProperty('clip-path', `circle(0px at ${x}px ${y}px)`);
    overlay.style.setProperty('-webkit-clip-path', `circle(0px at ${x}px ${y}px)`);
    document.body.appendChild(overlay);

    void overlay.offsetHeight;

    requestAnimationFrame(() => {
      overlay.style.transition = 'clip-path 300ms cubic-bezier(0.16, 1, 0.3, 1), -webkit-clip-path 300ms cubic-bezier(0.16, 1, 0.3, 1)';
      overlay.style.setProperty('clip-path', `circle(${radius + 60}px at ${x}px ${y}px)`);
      overlay.style.setProperty('-webkit-clip-path', `circle(${radius + 60}px at ${x}px ${y}px)`);
    });

    setTimeout(() => {
      updateDOM();
    }, 190);

    setTimeout(() => {
      overlay.remove();
    }, 310);
  } else {
    overlay.style.setProperty('clip-path', `circle(${radius + 60}px at ${x}px ${y}px)`);
    overlay.style.setProperty('-webkit-clip-path', `circle(${radius + 60}px at ${x}px ${y}px)`);
    document.body.appendChild(overlay);

    updateDOM();

    void overlay.offsetHeight;

    requestAnimationFrame(() => {
      overlay.style.transition = 'clip-path 300ms cubic-bezier(0.16, 1, 0.3, 1), -webkit-clip-path 300ms cubic-bezier(0.16, 1, 0.3, 1)';
      overlay.style.setProperty('clip-path', `circle(0px at ${x}px ${y}px)`);
      overlay.style.setProperty('-webkit-clip-path', `circle(0px at ${x}px ${y}px)`);
    });

    setTimeout(() => {
      overlay.remove();
    }, 310);
  }
}

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) throw new Error('useTheme must be used within a ThemeProvider');
  return context;
};
