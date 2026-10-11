import { Capacitor } from '@capacitor/core';

/**
 * Checks if running on a native Android device via Capacitor
 */
export const isAndroid = (): boolean => {
  return Capacitor.isNativePlatform() && Capacitor.getPlatform() === 'android';
};

/**
 * Checks if running as a native mobile app (Capacitor native shell)
 */
export const isNative = (): boolean => {
  return Capacitor.isNativePlatform();
};

/**
 * Checks if running on desktop (Electron app or desktop browser)
 */
export const isDesktop = (): boolean => {
  if (typeof window === 'undefined') return false;
  const ua = navigator.userAgent.toLowerCase();
  return ua.includes('electron') || !Capacitor.isNativePlatform();
};

/**
 * Checks if running specifically inside Electron desktop container
 */
export const isElectron = (): boolean => {
  if (typeof window === 'undefined') return false;
  return navigator.userAgent.toLowerCase().includes('electron');
};
