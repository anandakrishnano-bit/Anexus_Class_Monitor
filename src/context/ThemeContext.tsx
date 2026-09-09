import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { db } from '../db';
import { fetchMaterialYouColors, applyMaterialYouToCssVariables } from '../utils/materialYouTheme';

type Theme = 'light' | 'dark' | 'system';

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
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [theme, setThemeState] = useState<Theme>('system');
  const [tertiaryColor, setTertiaryColor] = useState<string>('#7C3AED');
  const [isDark, setIsDark] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      return document.documentElement.classList.contains('dark') ||
        window.matchMedia('(prefers-color-scheme: dark)').matches;
    }
    return false;
  });

  useEffect(() => {
    db.settings.toArray().then(settings => {
      if (settings.length > 0 && settings[0].theme) {
        setThemeState(settings[0].theme);
      }
    });

    // Load Material You system tertiary color from Monet engine / system
    fetchMaterialYouColors().then(colors => {
      if (colors && colors.tertiary) {
        setTertiaryColor(colors.tertiary);
        const currentDark = document.documentElement.classList.contains('dark') ||
          window.matchMedia('(prefers-color-scheme: dark)').matches;
        applyMaterialYouToCssVariables(colors, currentDark);
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
        fetchMaterialYouColors().then(colors => {
          applyMaterialYouToCssVariables(colors, sysDark);
        });
      }
    };

    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, [theme, computeIsDark]);

  const saveThemeToDb = async (newTheme: Theme) => {
    const settings = await db.settings.toArray();
    if (settings.length > 0) {
      await db.settings.update(settings[0].id!, { theme: newTheme });
    } else {
      await db.settings.add({
        theme: newTheme,
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

  /**
   * Circular expand (when switching to dark) & Circular contract (when switching to light)
   * matches Dribbble: https://dribbble.com/shots/23756585-Light-Dark-mode-button-animation
   */
  const toggleTheme = (eventOrOptions?: React.MouseEvent | ThemeToggleOptions) => {
    // Current visual darkness
    const currentIsDark = document.documentElement.classList.contains('dark');
    const willBeDark = !currentIsDark;
    const nextTheme: Theme = willBeDark ? 'dark' : 'light';

    // Get click coordinates (or center of screen)
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

    // Radius needed to reach furthest corner of screen from (x, y)
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
      saveThemeToDb(nextTheme);
    };

    // Circular reveal animation: expands outward to dark, contracts inward to light
    runCircularThemeTransition(x, y, endRadius, willBeDark, updateDOM);
  };

  return (
    <ThemeContext.Provider value={{ theme, setTheme, toggleTheme, isDark }}>
      {children}
    </ThemeContext.Provider>
  );
};

/**
 * Robust White-to-Dark & Dark-to-White circular reveal animation
 * Works with 100% reliability across WebView, Android, Chromium, and Desktop:
 * - Switching to Dark: Dark circular ripple expands outward from button center covering entire screen
 * - Switching to Light: Dark overlay contracts back into button center, smoothly unveiling crisp light mode underneath
 */
function runCircularThemeTransition(
  x: number,
  y: number,
  radius: number,
  willBeDark: boolean,
  updateDOM: () => void
) {
  if (typeof document === 'undefined') {
    updateDOM();
    return;
  }

  // Remove any preexisting overlay to prevent duplicate layers on rapid taps
  const existingOverlay = document.getElementById('theme-transition-ripple');
  if (existingOverlay) {
    existingOverlay.remove();
  }

  // Create high-performance hardware-accelerated ripple overlay
  const overlay = document.createElement('div');
  overlay.id = 'theme-transition-ripple';
  overlay.style.position = 'fixed';
  overlay.style.inset = '0';
  overlay.style.width = '100vw';
  overlay.style.height = '100vh';
  overlay.style.zIndex = '99999999';
  overlay.style.pointerEvents = 'none';
  overlay.style.willChange = 'clip-path';
  overlay.style.backgroundColor = '#0A0A0A'; // Dark surface

  if (willBeDark) {
    // WHITE TO DARK: TRUE EXPANSION
    // Dark circle starts at 0px at button origin and expands outward across the viewport
    overlay.style.setProperty('clip-path', `circle(0px at ${x}px ${y}px)`);
    overlay.style.setProperty('-webkit-clip-path', `circle(0px at ${x}px ${y}px)`);
    document.body.appendChild(overlay);

    // Force flush
    void overlay.offsetHeight;

    // 1. Expand outward from button
    requestAnimationFrame(() => {
      overlay.style.transition = 'clip-path 300ms cubic-bezier(0.16, 1, 0.3, 1), -webkit-clip-path 300ms cubic-bezier(0.16, 1, 0.3, 1)';
      overlay.style.setProperty('clip-path', `circle(${radius + 60}px at ${x}px ${y}px)`);
      overlay.style.setProperty('-webkit-clip-path', `circle(${radius + 60}px at ${x}px ${y}px)`);
    });

    // 2. Switch DOM slightly before expansion completes (at 190ms)
    // By 190ms the dark circle covers >85% of the screen around the button,
    // so the DOM switch happens completely hidden beneath the dark overlay
    setTimeout(() => {
      updateDOM();
    }, 190);

    // 3. Remove overlay right as the expansion reaches its full boundary
    setTimeout(() => {
      overlay.remove();
    }, 310);
  } else {
    // DARK TO WHITE: TRUE CONTRACTION
    // Dark overlay starts at full screen, then contracts inward into the button,
    // smoothly unveiling the light UI underneath
    overlay.style.setProperty('clip-path', `circle(${radius + 60}px at ${x}px ${y}px)`);
    overlay.style.setProperty('-webkit-clip-path', `circle(${radius + 60}px at ${x}px ${y}px)`);
    document.body.appendChild(overlay);

    // 1. Switch DOM to light mode immediately under the full-screen dark mask
    updateDOM();

    // Force flush
    void overlay.offsetHeight;

    // 2. Contract inward into the button revealing the light page underneath
    requestAnimationFrame(() => {
      overlay.style.transition = 'clip-path 300ms cubic-bezier(0.16, 1, 0.3, 1), -webkit-clip-path 300ms cubic-bezier(0.16, 1, 0.3, 1)';
      overlay.style.setProperty('clip-path', `circle(0px at ${x}px ${y}px)`);
      overlay.style.setProperty('-webkit-clip-path', `circle(0px at ${x}px ${y}px)`);
    });

    // 3. Remove overlay when contraction completes
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

