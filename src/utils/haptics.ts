import { Haptics, ImpactStyle, NotificationType } from '@capacitor/haptics';
import { Capacitor } from '@capacitor/core';

export type HapticType =
  | 'tick'
  | 'selection'
  | 'light'
  | 'medium'
  | 'heavy'
  | 'success'
  | 'warning'
  | 'error';

// AudioContext singleton for crisp acoustic transients
let audioCtx: AudioContext | null = null;

export function getAudioContext(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  try {
    const AudioContextClass =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!audioCtx && AudioContextClass) {
      audioCtx = new AudioContextClass();
    }
    if (audioCtx && audioCtx.state === 'suspended') {
      audioCtx.resume().catch(() => {});
    }
    return audioCtx;
  } catch {
    return null;
  }
}

// Automatically unlock AudioContext on user interaction
if (typeof window !== 'undefined') {
  const unlockAudio = () => {
    getAudioContext();
  };
  window.addEventListener('pointerdown', unlockAudio, { passive: true });
  window.addEventListener('touchstart', unlockAudio, { passive: true });
  window.addEventListener('click', unlockAudio, { passive: true });
}

/**
 * Synthesizes an ultra-crisp, high-frequency physical micro-click.
 * Inspired by Chandra Welim's "Haptic Feedback — The Secret to Apps that Feel Premium",
 * pairing tactile impulses with sharp acoustic transients mimics physical tactile micro-switches.
 */
export function playHapticSound(type: HapticType = 'light') {
  if (typeof window === 'undefined') return;

  // Check user preference (enabled by default)
  const soundEnabled = localStorage.getItem('anexus_haptic_sound') !== 'false';
  if (!soundEnabled) return;

  try {
    const ctx = getAudioContext();
    if (!ctx) return;

    // Force resume if browser suspended context
    if (ctx.state === 'suspended') {
      ctx.resume().catch(() => {});
    }

    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    const filter = ctx.createBiquadFilter();

    filter.type = 'highpass';
    filter.frequency.setValueAtTime(800, now);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(ctx.destination);

    switch (type) {
      case 'tick':
      case 'selection': {
        // Slider is silent (pure physical tactile vibration only)
        return;
      }
      case 'light': {
        // Subtle soft tactile click
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(1200, now);
        osc.frequency.exponentialRampToValueAtTime(300, now + 0.015);
        gain.gain.setValueAtTime(0.06, now);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.016);
        osc.start(now);
        osc.stop(now + 0.018);
        break;
      }
      case 'medium': {
        // Subtle switch snap
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(800, now);
        osc.frequency.exponentialRampToValueAtTime(200, now + 0.02);
        gain.gain.setValueAtTime(0.08, now);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.022);
        osc.start(now);
        osc.stop(now + 0.024);
        break;
      }
      case 'heavy': {
        // Gentle low thunk
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(450, now);
        osc.frequency.exponentialRampToValueAtTime(100, now + 0.025);
        gain.gain.setValueAtTime(0.10, now);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.028);
        osc.start(now);
        osc.stop(now + 0.03);
        break;
      }
      case 'success': {
        // Gentle soft ascending chime
        osc.type = 'sine';
        osc.frequency.setValueAtTime(1000, now);
        gain.gain.setValueAtTime(0.05, now);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.018);
        osc.start(now);
        osc.stop(now + 0.02);

        // 2nd soft tone
        const osc2 = ctx.createOscillator();
        const gain2 = ctx.createGain();
        osc2.type = 'sine';
        osc2.frequency.setValueAtTime(1500, now + 0.03);
        gain2.gain.setValueAtTime(0.06, now + 0.03);
        gain2.gain.exponentialRampToValueAtTime(0.0001, now + 0.055);
        osc2.connect(gain2);
        gain2.connect(ctx.destination);
        osc2.start(now + 0.03);
        osc2.stop(now + 0.06);
        break;
      }
      case 'warning': {
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(650, now);
        gain.gain.setValueAtTime(0.06, now);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.025);
        osc.start(now);
        osc.stop(now + 0.03);
        break;
      }
      case 'error': {
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(280, now);
        gain.gain.setValueAtTime(0.07, now);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.03);
        osc.start(now);
        osc.stop(now + 0.035);
        break;
      }
    }
  } catch {
    // Audio errors fail silently
  }
}

let lastTickTime = 0;

/**
 * Triggers a crisp, best-in-class haptic feedback.
 * Uses native Capacitor Haptics on Android & iOS devices for true physical actuator feel,
 * and calibrated micro-pulse vibrations + Web Audio clicks on web.
 */
export async function triggerHaptic(type: HapticType = 'light') {
  if (typeof window === 'undefined') return;

  // Master haptic preference
  const hapticsEnabled = localStorage.getItem('anexus_haptics_enabled') !== 'false';
  if (!hapticsEnabled) return;

  // Always produce crisp acoustic transient
  playHapticSound(type);

  // 1. Native Mobile Platform (Android/iOS via Capacitor)
  if (Capacitor.isNativePlatform()) {
    try {
      switch (type) {
        case 'tick':
        case 'selection':
          await Haptics.impact({ style: ImpactStyle.Light });
          return;
        case 'light':
          await Haptics.impact({ style: ImpactStyle.Light });
          return;
        case 'medium':
          await Haptics.impact({ style: ImpactStyle.Medium });
          return;
        case 'heavy':
          await Haptics.impact({ style: ImpactStyle.Heavy });
          return;
        case 'success':
          await Haptics.notification({ type: NotificationType.Success });
          return;
        case 'warning':
          await Haptics.notification({ type: NotificationType.Warning });
          return;
        case 'error':
          await Haptics.notification({ type: NotificationType.Error });
          return;
      }
    } catch {
      // ignore
    }
  }

  // 2. Web / Browser Vibration API (Mobile Chrome / Android Web)
  try {
    if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
      switch (type) {
        case 'tick':
        case 'selection':
          navigator.vibrate(10);
          break;
        case 'light':
          navigator.vibrate(15);
          break;
        case 'medium':
          navigator.vibrate(28);
          break;
        case 'heavy':
          navigator.vibrate(45);
          break;
        case 'success':
          navigator.vibrate([15, 45, 20]);
          break;
        case 'warning':
          navigator.vibrate([20, 45, 20]);
          break;
        case 'error':
          navigator.vibrate([20, 40, 20, 40, 30]);
          break;
      }
    }
  } catch {
    // ignore
  }
}

/**
 * Throttled tick for sliders, scrubbers, and dials.
 * Ensures rapid dragging produces a smooth mechanical ratchet feel without delay.
 */
export function triggerSliderTick(minIntervalMs = 16) {
  const now = performance.now();
  if (now - lastTickTime >= minIntervalMs) {
    lastTickTime = now;
    triggerHaptic('tick');
  }
}
