import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { db } from '../db';
import {
  fetchMaterialYouColors,
  applyMaterialYouToCssVariables,
  buildDynamicMaterialYouPalette,
  MaterialYouColors
} from '../utils/materialYouTheme';
import lottie, { AnimationItem } from 'lottie-web';
import lightDarkModeAnimationData from '../assets/LightDarkMode.json';
import darkModeButtonAnimationData from '../assets/DarkModeButtonAnimation.json';

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
    bg: '#F6F7FF',
    surface: '#FFFFFF',
    secondary: '#94631D',
    border: '#D5DCF8',
    mutedText: '#4F46E5',
    light: {
      bg: '#F6F7FF',
      surface: '#FFFFFF',
      primary: '#373A85',
      primaryText: '#FFFFFF',
      secondary: '#94631D',
      secondaryBg: '#FEF6E8',
      border: '#D5DCF8',
      muted: '#5C6388',
      accent: '#D97706',
    },
    dark: {
      bg: '#0C0D18',
      surface: '#151726',
      primary: '#BAC4FA',
      primaryText: '#181A4A',
      secondary: '#F4D47C',
      secondaryBg: '#1D2035',
      border: '#2C3050',
      muted: '#9CA3AF',
      accent: '#818CF8',
    }
  },
  {
    id: 'pink',
    name: 'Blush Rose',
    previewColor: '#F9CAD2',
    baseColor: '#F9CAD2',
    bg: '#FFF5F7',
    surface: '#FFFFFF',
    secondary: '#FCE8ED',
    border: '#F7D2DC',
    mutedText: '#946773',
    light: {
      bg: '#FFF5F7',
      surface: '#FFFFFF',
      primary: '#882942', // softened, elegant dusty rose replacing black
      primaryText: '#FFFFFF',
      secondary: '#A2425E',
      secondaryBg: '#FCE8ED',
      border: '#F7D2DC',
      muted: '#946773',
      accent: '#DB2777',
    },
    dark: {
      bg: '#0F0A0D',
      surface: '#1A1216',
      primary: '#F9CAD2', // luminous soft blush replacing white
      primaryText: '#881337',
      secondary: '#FDA4AF',
      secondaryBg: '#2B151F',
      border: '#421D2C',
      muted: '#D4A5B3',
      accent: '#FB7185',
    }
  },
  {
    id: 'yellow',
    name: 'Sunshine Gold',
    previewColor: '#F9DA41',
    baseColor: '#F9DA41',
    bg: '#FFFDF5',
    surface: '#FFFFFF',
    secondary: '#FEF5D6',
    border: '#FCE8A4',
    mutedText: '#8E7648',
    light: {
      bg: '#FFFDF5',
      surface: '#FFFFFF',
      primary: '#744512', // softened warm caramel amber
      primaryText: '#FFFFFF',
      secondary: '#925A1E',
      secondaryBg: '#FEF5D6',
      border: '#FCE8A4',
      muted: '#8E7648',
      accent: '#D97706',
    },
    dark: {
      bg: '#0E0D08',
      surface: '#1A1810',
      primary: '#F9DA41', // soft buttercup gold
      primaryText: '#78350F',
      secondary: '#FDE047',
      secondaryBg: '#2D2611',
      border: '#443916',
      muted: '#D6C782',
      accent: '#FACC15',
    }
  },
  {
    id: 'lavender',
    name: 'Soft Lilac',
    previewColor: '#DED2F9',
    baseColor: '#DED2F9',
    bg: '#FAF8FF',
    surface: '#FFFFFF',
    secondary: '#F1ECFC',
    border: '#E1D6F7',
    mutedText: '#776993',
    light: {
      bg: '#FAF8FF',
      surface: '#FFFFFF',
      primary: '#4A3178', // softened deep iris
      primaryText: '#FFFFFF',
      secondary: '#684B9C',
      secondaryBg: '#F1ECFC',
      border: '#E1D6F7',
      muted: '#776993',
      accent: '#7C3AED',
    },
    dark: {
      bg: '#0D0A14',
      surface: '#171324',
      primary: '#DED2F9', // luminous soft lilac
      primaryText: '#4C1D95',
      secondary: '#C4B5FD',
      secondaryBg: '#271E40',
      border: '#3B2D62',
      muted: '#B8A9D9',
      accent: '#A78BFA',
    }
  },
  {
    id: 'mint',
    name: 'Fresh Mint',
    previewColor: '#A7F3D0',
    baseColor: '#A7F3D0',
    bg: '#F5FBF7',
    surface: '#FFFFFF',
    secondary: '#E3F7EC',
    border: '#C7EED8',
    mutedText: '#567D6C',
    light: {
      bg: '#F5FBF7',
      surface: '#FFFFFF',
      primary: '#185841', // softened forest sage
      primaryText: '#FFFFFF',
      secondary: '#287557',
      secondaryBg: '#E3F7EC',
      border: '#C7EED8',
      muted: '#567D6C',
      accent: '#059669',
    },
    dark: {
      bg: '#080F0C',
      surface: '#111C16',
      primary: '#A7F3D0', // soft pastel mint
      primaryText: '#064E3B',
      secondary: '#6EE7B7',
      secondaryBg: '#182E22',
      border: '#244835',
      muted: '#88BC9E',
      accent: '#34D399',
    }
  },
  {
    id: 'sky',
    name: 'Sky Azure',
    previewColor: '#BAE6FD',
    baseColor: '#BAE6FD',
    bg: '#F4FAFF',
    surface: '#FFFFFF',
    secondary: '#E2F1FD',
    border: '#C5E3FB',
    mutedText: '#567897',
    light: {
      bg: '#F4FAFF',
      surface: '#FFFFFF',
      primary: '#184870', // softened deep oceanic slate
      primaryText: '#FFFFFF',
      secondary: '#2D6392',
      secondaryBg: '#E2F1FD',
      border: '#C5E3FB',
      muted: '#567897',
      accent: '#0284C7',
    },
    dark: {
      bg: '#080D12',
      surface: '#101822',
      primary: '#BAE6FD', // soft luminous sky
      primaryText: '#0A3150',
      secondary: '#7DD3FC',
      secondaryBg: '#162537',
      border: '#203954',
      muted: '#84AECB',
      accent: '#38BDF8',
    }
  },
  {
    id: 'coral',
    name: 'Warm Coral',
    previewColor: '#FED7AA',
    baseColor: '#FED7AA',
    bg: '#FFF8F3',
    surface: '#FFFFFF',
    secondary: '#FDE8DC',
    border: '#FAD5C0',
    mutedText: '#936B5C',
    light: {
      bg: '#FFF8F3',
      surface: '#FFFFFF',
      primary: '#783621', // softened warm terracotta
      primaryText: '#FFFFFF',
      secondary: '#9B4B31',
      secondaryBg: '#FDE8DC',
      border: '#FAD5C0',
      muted: '#936B5C',
      accent: '#EA580C',
    },
    dark: {
      bg: '#0F0A08',
      surface: '#1C130E',
      primary: '#FED7AA', // soft luminous peach
      primaryText: '#532314',
      secondary: '#FDBA74',
      secondaryBg: '#2D1D16',
      border: '#482B20',
      muted: '#C99E8B',
      accent: '#FB923C',
    }
  },
  {
    id: 'mono',
    name: 'Classic Mono',
    previewColor: '#0A0A0A',
    baseColor: '#0A0A0A',
    bg: '#F7F7F8',
    surface: '#FFFFFF',
    secondary: '#F3F4F6',
    border: '#E5E7EB',
    mutedText: '#6B7280',
    light: {
      bg: '#F7F7F8',
      surface: '#FFFFFF',
      primary: '#111111',
      primaryText: '#FFFFFF',
      secondary: '#4B5563',
      secondaryBg: '#F3F4F6',
      border: '#E5E7EB',
      muted: '#6B7280',
      accent: '#4B5563',
    },
    dark: {
      bg: '#0A0A0A',
      surface: '#141414',
      primary: '#FFFFFF', // pure white in dark mono
      primaryText: '#000000',
      secondary: '#D1D5DB',
      secondaryBg: '#202020',
      border: '#2A2A2A',
      muted: '#9CA3AF',
      accent: '#E5E7EB',
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
    bg: `${colorOrId}14`,
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
      surface: '#111111',
      primary: colorOrId,
      primaryText: '#000000',
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
  skipTransition?: boolean;
}

interface ThemeContextType {
  theme: Theme;
  setTheme: (theme: Theme, eventOrOptions?: React.MouseEvent | ThemeToggleOptions) => void;
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
    } catch { }

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

  const setTheme = async (newTheme: Theme, eventOrOptions?: React.MouseEvent | ThemeToggleOptions) => {
    const currentIsDark = document.documentElement.classList.contains('dark');
    const willBeDark = computeIsDark(newTheme);
    const skipTransition = (eventOrOptions && 'skipTransition' in eventOrOptions && eventOrOptions.skipTransition) || false;

    if (willBeDark !== currentIsDark && !skipTransition && eventOrOptions && ('clientX' in eventOrOptions || 'currentTarget' in eventOrOptions)) {
      toggleTheme(eventOrOptions);
      return;
    }

    setThemeState(newTheme);
    setIsDark(willBeDark);
    if (willBeDark) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
    const palette = resolveThemePalette(tintColor, systemColors);
    applyPaletteToDOM(palette, willBeDark);
    await saveThemeToDb(newTheme);
  };

  const setTintColor = async (color: string) => {
    setTintColorState(color);
    try {
      localStorage.setItem('__user_tint_color', color);
    } catch { }
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
    let triggerEl: HTMLElement | null = null;

    if (eventOrOptions) {
      if ('currentTarget' in eventOrOptions && eventOrOptions.currentTarget instanceof HTMLElement) {
        triggerEl = eventOrOptions.currentTarget;
        const rect = triggerEl.getBoundingClientRect();
        x = rect.left + rect.width / 2;
        y = rect.top + rect.height / 2;
      } else if ('target' in eventOrOptions) {
        const candidate = (eventOrOptions as any).target;
        if (candidate instanceof HTMLElement) {
          triggerEl = candidate;
          const rect = candidate.getBoundingClientRect();
          x = rect.left + rect.width / 2;
          y = rect.top + rect.height / 2;
        }
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

    runCircularThemeTransition(x, y, endRadius, willBeDark, updateDOM, activePalette, triggerEl);
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

// Global transition tracking for robust user-interruption
let activeTransitionCleanup: (() => void) | null = null;
let activeTransitionTimers: number[] = [];

/**
 * Cinematic Circular Theme Curtain Transition
 * - Interruptible by user action: can be re-triggered or tapped at any moment without getting stuck.
 * - Sun and Moon morphing toggle placed on top (above text).
 * - Bold typography 'DARK' / 'WHITE' in the middle.
 * - Animated day/night toggle switch pill placed below text.
 * - Rapid ~0.5s total animation with clean hardware-accelerated curtain.
 */
function runCircularThemeTransition(
  x: number,
  y: number,
  radius: number,
  willBeDark: boolean,
  updateDOM: () => void,
  palette: ThemePalette,
  triggerEl?: HTMLElement | null
) {
  if (typeof document === 'undefined') {
    updateDOM();
    return;
  }

  // Interrupt and clean up any running transition immediately
  if (activeTransitionCleanup) {
    activeTransitionCleanup();
    activeTransitionCleanup = null;
  }
  activeTransitionTimers.forEach(id => clearTimeout(id));
  activeTransitionTimers = [];

  const existing = document.getElementById('theme-curtain-overlay');
  if (existing) existing.remove();
  const existingClone = document.getElementById('theme-trigger-toplayer');
  if (existingClone) existingClone.remove();

  const addTimer = (fn: () => void, delay: number) => {
    const id = window.setTimeout(fn, delay);
    activeTransitionTimers.push(id);
    return id;
  };

  // Elevate clicked button on topmost layer with synchronized live Lottie animation
  let topLayerClone: HTMLElement | null = null;
  let topLayerAnim: AnimationItem | null = null;
  if (triggerEl && typeof triggerEl.getBoundingClientRect === 'function') {
    const rect = triggerEl.getBoundingClientRect();
    if (rect.width > 0 && rect.height > 0) {
      topLayerClone = document.createElement('div');
      topLayerClone.id = 'theme-trigger-toplayer';
      topLayerClone.style.position = 'fixed';
      topLayerClone.style.left = `${rect.left}px`;
      topLayerClone.style.top = `${rect.top}px`;
      topLayerClone.style.width = `${rect.width}px`;
      topLayerClone.style.height = `${rect.height}px`;
      topLayerClone.style.borderRadius = '9999px';
      topLayerClone.style.backgroundColor = '#000000';
      topLayerClone.style.border = '1px solid #262626';
      topLayerClone.style.boxShadow = '0 2px 8px rgba(0,0,0,0.4)';
      topLayerClone.style.display = 'flex';
      topLayerClone.style.alignItems = 'center';
      topLayerClone.style.justifyContent = 'center';
      topLayerClone.style.zIndex = '1000000000';
      topLayerClone.style.pointerEvents = 'none';
      topLayerClone.style.margin = '0';
      topLayerClone.style.boxSizing = 'border-box';
      topLayerClone.style.overflow = 'hidden';
      topLayerClone.style.transition = 'opacity 200ms ease, transform 200ms ease';

      const innerDiv = document.createElement('div');
      innerDiv.style.width = '100%';
      innerDiv.style.height = '100%';
      innerDiv.style.display = 'flex';
      innerDiv.style.alignItems = 'center';
      innerDiv.style.justifyContent = 'center';
      innerDiv.style.overflow = 'visible';
      topLayerClone.appendChild(innerDiv);

      topLayerAnim = lottie.loadAnimation({
        container: innerDiv,
        renderer: 'svg',
        loop: false,
        autoplay: false,
        animationData: darkModeButtonAnimationData
      });

      const zoomClone = () => {
        const svg = innerDiv.querySelector('svg');
        if (svg) {
          svg.setAttribute('viewBox', '140 160 1640 760');
          svg.style.width = '100%';
          svg.style.height = '100%';
          svg.style.overflow = 'visible';
        }
      };
      topLayerAnim.addEventListener('DOMLoaded', zoomClone);
      zoomClone();

      if (willBeDark) {
        topLayerAnim.goToAndStop(80, true); // Day / Light mode state before transition
      } else {
        topLayerAnim.goToAndStop(0, true);  // Night / Dark mode state before transition
      }

      document.body.appendChild(topLayerClone);
    }
  }

  // Full-screen hardware-accelerated overlay curtain (click to dismiss/interrupt)
  const overlay = document.createElement('div');
  overlay.id = 'theme-curtain-overlay';
  overlay.style.position = 'fixed';
  overlay.style.inset = '0';
  overlay.style.width = '100vw';
  overlay.style.height = '100vh';
  overlay.style.zIndex = '999999998';
  overlay.style.pointerEvents = 'all';
  overlay.style.display = 'flex';
  overlay.style.flexDirection = 'column';
  overlay.style.alignItems = 'center';
  overlay.style.justifyContent = 'center';
  overlay.style.backgroundColor = '#000000';
  overlay.style.overflow = 'hidden';
  overlay.style.willChange = 'clip-path, -webkit-clip-path, opacity, transform';
  overlay.style.cursor = 'pointer';

  // Center: Prominent Sun & Moon Morphing Animation (LightDarkMode.json in circular animation)
  const centerIconBox = document.createElement('div');
  centerIconBox.style.width = '105px';
  centerIconBox.style.height = '105px';
  centerIconBox.style.display = 'flex';
  centerIconBox.style.alignItems = 'center';
  centerIconBox.style.justifyContent = 'center';
  centerIconBox.style.marginBottom = '6px';
  centerIconBox.style.opacity = '0';
  centerIconBox.style.transform = 'scale(0.85)';
  centerIconBox.style.transition = 'opacity 140ms cubic-bezier(0.16, 1, 0.3, 1), transform 160ms cubic-bezier(0.16, 1, 0.3, 1)';
  centerIconBox.style.pointerEvents = 'none';

  const centerIconAnim = lottie.loadAnimation({
    container: centerIconBox,
    renderer: 'svg',
    loop: false,
    autoplay: false,
    animationData: lightDarkModeAnimationData
  });

  const zoomCenterIcon = () => {
    const svg = centerIconBox.querySelector('svg');
    if (svg) {
      svg.setAttribute('viewBox', '175 175 250 250');
      svg.style.width = '100%';
      svg.style.height = '100%';
      svg.style.overflow = 'visible';
    }
  };
  centerIconAnim.addEventListener('DOMLoaded', zoomCenterIcon);
  zoomCenterIcon();

  if (willBeDark) {
    centerIconAnim.goToAndStop(0, true); // Sun before switch
  } else {
    centerIconAnim.goToAndStop(65, true); // Moon before switch
  }

  // Center: Huge bold typography label
  const label = document.createElement('div');
  label.innerText = willBeDark ? 'DARK' : 'WHITE';
  label.style.fontFamily = 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
  label.style.fontSize = 'clamp(4.2rem, 15vw, 8rem)';
  label.style.fontWeight = '900';
  label.style.letterSpacing = '-0.05em';
  label.style.lineHeight = '1';
  label.style.color = '#FFFFFF';
  label.style.textTransform = 'uppercase';
  label.style.opacity = '0';
  label.style.transform = 'scale(0.9) translateY(8px)';
  label.style.transition = 'opacity 140ms cubic-bezier(0.16, 1, 0.3, 1), transform 160ms cubic-bezier(0.16, 1, 0.3, 1)';
  label.style.pointerEvents = 'none';
  label.style.userSelect = 'none';

  // Subtitle
  const sub = document.createElement('div');
  sub.innerText = willBeDark ? 'OLED PURE BLACK' : 'LIGHT CANVAS';
  sub.style.fontFamily = 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
  sub.style.fontSize = 'clamp(0.68rem, 2.2vw, 0.88rem)';
  sub.style.fontWeight = '700';
  sub.style.letterSpacing = '0.35em';
  sub.style.textTransform = 'uppercase';
  sub.style.color = 'rgba(255, 255, 255, 0.6)';
  sub.style.marginTop = '14px';
  sub.style.opacity = '0';
  sub.style.transition = 'opacity 140ms ease-out';
  sub.style.pointerEvents = 'none';
  sub.style.userSelect = 'none';

  overlay.appendChild(centerIconBox);
  overlay.appendChild(label);
  overlay.appendChild(sub);

  let hasCleanedUp = false;
  const cleanup = () => {
    if (hasCleanedUp) return;
    hasCleanedUp = true;
    activeTransitionTimers.forEach(id => clearTimeout(id));
    activeTransitionTimers = [];
    centerIconAnim.destroy();
    if (topLayerAnim) topLayerAnim.destroy();
    overlay.remove();
    if (topLayerClone) topLayerClone.remove();
    activeTransitionCleanup = null;
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('theme-transition-end'));
    }
  };
  activeTransitionCleanup = cleanup;

  // Interruptible by user tap anywhere on overlay
  overlay.addEventListener('click', () => {
    updateDOM();
    cleanup();
  });

  if (willBeDark) {
    // ========================================================
    // EXPANSION FOR DARK (~0.5s total animation)
    // ========================================================
    overlay.style.backgroundColor = '#000000';
    overlay.style.setProperty('clip-path', `circle(0px at ${x}px ${y}px)`);
    overlay.style.setProperty('-webkit-clip-path', `circle(0px at ${x}px ${y}px)`);

    document.body.appendChild(overlay);
    void overlay.offsetHeight; // trigger reflow

    // Step 1: Rapidly expand dark circle outward from tap point (180ms)
    requestAnimationFrame(() => {
      overlay.style.transition = 'clip-path 180ms cubic-bezier(0.16, 1, 0.3, 1), -webkit-clip-path 180ms cubic-bezier(0.16, 1, 0.3, 1)';
      overlay.style.setProperty('clip-path', `circle(${radius + 80}px at ${x}px ${y}px)`);
      overlay.style.setProperty('-webkit-clip-path', `circle(${radius + 80}px at ${x}px ${y}px)`);

      // Spring in elements and trigger synchronized animations at this exact time!
      addTimer(() => {
        centerIconBox.style.opacity = '1';
        centerIconBox.style.transform = 'scale(1)';
        label.style.opacity = '1';
        label.style.transform = 'scale(1) translateY(0px)';
        sub.style.opacity = '1';

        centerIconAnim.setSpeed(1.8);
        centerIconAnim.playSegments([0, 65], true);
        if (topLayerAnim) {
          topLayerAnim.setSpeed(1.8);
          topLayerAnim.playSegments([80, 120], true);
        }

        // Circular animation remains active until inside animation of the Sun & Moon completes!
        let hasCompleted = false;
        const onAnimComplete = () => {
          if (hasCompleted) return;
          hasCompleted = true;

          overlay.style.transition = 'opacity 200ms ease-out, transform 200ms ease-out';
          overlay.style.opacity = '0';
          overlay.style.transform = 'scale(1.02)';

          if (topLayerClone) {
            topLayerClone.style.transition = 'opacity 200ms ease-out';
            topLayerClone.style.opacity = '0';
          }

          addTimer(() => {
            cleanup();
          }, 220);
        };

        centerIconAnim.addEventListener('complete', onAnimComplete);
        addTimer(onAnimComplete, 680); // Safety fallback
      }, 70);
    });

    // Step 2: Screen is 100% black; execute updateDOM() completely concealed
    addTimer(() => {
      updateDOM();
    }, 130);

  } else {
    // ========================================================
    // CONTRACTION FOR WHITE: Active until inside animation completes
    // ========================================================
    overlay.style.backgroundColor = '#000000';
    overlay.style.setProperty('clip-path', `circle(${radius + 80}px at ${x}px ${y}px)`);
    overlay.style.setProperty('-webkit-clip-path', `circle(${radius + 80}px at ${x}px ${y}px)`);

    document.body.appendChild(overlay);
    void overlay.offsetHeight; // trigger reflow

    // Show text and animations immediately while screen is 100% blacked out
    centerIconBox.style.opacity = '1';
    centerIconBox.style.transform = 'scale(1)';
    label.style.opacity = '1';
    label.style.transform = 'scale(1) translateY(0px)';
    sub.style.opacity = '1';

    centerIconAnim.setSpeed(1.8);
    centerIconAnim.playSegments([65, 154], true);
    if (topLayerAnim) {
      topLayerAnim.setSpeed(1.8);
      topLayerAnim.playSegments([0, 40], true);
    }

    // Step 1: Immediately flip DOM to light mode in the background while covered
    addTimer(() => {
      updateDOM();
    }, 40);

    // Circular animation remains active until inside animation of the Sun & Moon completes!
    let hasCompleted = false;
    const onAnimComplete = () => {
      if (hasCompleted) return;
      hasCompleted = true;

      centerIconBox.style.transition = 'opacity 150ms ease-in, transform 150ms ease-in';
      centerIconBox.style.opacity = '0';
      centerIconBox.style.transform = 'scale(0.85)';
      label.style.transition = 'opacity 150ms ease-in, transform 150ms ease-in';
      label.style.opacity = '0';
      label.style.transform = 'scale(0.9)';
      sub.style.transition = 'opacity 130ms ease-in';
      sub.style.opacity = '0';

      // Contract circle down to 0px at tap coordinates, unveiling crisp white app
      overlay.style.transition = 'clip-path 220ms cubic-bezier(0.4, 0, 0.2, 1), -webkit-clip-path 220ms cubic-bezier(0.4, 0, 0.2, 1)';
      overlay.style.setProperty('clip-path', `circle(0px at ${x}px ${y}px)`);
      overlay.style.setProperty('-webkit-clip-path', `circle(0px at ${x}px ${y}px)`);

      // Step 3: Clean up once fully contracted
      addTimer(() => {
        cleanup();
      }, 240);
    };

    centerIconAnim.addEventListener('complete', onAnimComplete);
    addTimer(onAnimComplete, 750); // Safety fallback
  }
}

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) throw new Error('useTheme must be used within a ThemeProvider');
  return context;
};
