import React, { useEffect, useRef, useState } from 'react';
import lottie, { AnimationItem } from 'lottie-web';
import { useTheme } from '../../context/ThemeContext';
import { triggerHaptic } from '../../utils/haptics';
import animationData from '../../assets/DarkModeButtonAnimation.json';

interface ThemeToggleButtonProps {
  className?: string;
  width?: number;
  height?: number;
}

export const ThemeToggleButton: React.FC<ThemeToggleButtonProps> = ({
  className = '',
  width = 58,
  height = 28
}) => {
  const { toggleTheme, isDark } = useTheme();
  const containerRef = useRef<HTMLDivElement>(null);
  const animRef = useRef<AnimationItem | null>(null);
  const isFirstRender = useRef(true);
  const [isTransitioning, setIsTransitioning] = useState<boolean>(false);
  const fallbackTimerRef = useRef<number | null>(null);

  useEffect(() => {
    const handleTransitionEnd = () => {
      if (fallbackTimerRef.current) clearTimeout(fallbackTimerRef.current);
      setIsTransitioning(false);
    };
    window.addEventListener('theme-transition-end', handleTransitionEnd);
    return () => {
      window.removeEventListener('theme-transition-end', handleTransitionEnd);
      if (fallbackTimerRef.current) clearTimeout(fallbackTimerRef.current);
    };
  }, []);

  useEffect(() => {
    if (!containerRef.current) return;

    if (animRef.current) {
      animRef.current.destroy();
    }

    const anim = lottie.loadAnimation({
      container: containerRef.current,
      renderer: 'svg',
      loop: false,
      autoplay: false,
      animationData
    });

    animRef.current = anim;

    // Zoom into the actual switch pill by adjusting the SVG viewBox to pill bounds
    const zoomSvg = () => {
      const svg = containerRef.current?.querySelector('svg');
      if (svg) {
        svg.setAttribute('viewBox', '140 160 1640 760');
        svg.style.width = '100%';
        svg.style.height = '100%';
        svg.style.overflow = 'visible';
      }
    };

    anim.addEventListener('DOMLoaded', zoomSvg);
    zoomSvg();

    // Initial frame:
    // Frame 0 = Night / Moon state (Dark Mode)
    // Frame 80 = Day / Sun state (Light Mode)
    if (isDark) {
      anim.goToAndStop(0, true);
    } else {
      anim.goToAndStop(80, true);
    }

    return () => {
      anim.destroy();
      animRef.current = null;
    };
  }, []);

  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }

    if (!animRef.current) return;

    animRef.current.setSpeed(1.8);
    if (isDark) {
      // Light -> Dark: Day to Night switch
      animRef.current.playSegments([80, 120], true);
    } else {
      // Dark -> Light: Night to Day switch
      animRef.current.playSegments([0, 40], true);
    }
  }, [isDark]);

  const handleClick = (e: React.MouseEvent) => {
    setIsTransitioning(true);
    triggerHaptic('medium');
    if (fallbackTimerRef.current) clearTimeout(fallbackTimerRef.current);
    fallbackTimerRef.current = window.setTimeout(() => {
      setIsTransitioning(false);
    }, 600);
    toggleTheme(e);
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      title={isDark ? 'Switch to Light mode' : 'Switch to Dark mode'}
      aria-label="Toggle dark and light theme"
      style={{ width: `${width}px`, height: `${height}px` }}
      className={`rounded-full border border-neutral-300 dark:border-neutral-700 bg-neutral-100 dark:bg-neutral-900 flex items-center justify-center shadow-sm transition-all duration-200 active:scale-95 relative overflow-hidden group cursor-pointer p-0 shrink-0 ${
        isTransitioning ? 'ring-2 ring-neutral-400 dark:ring-neutral-600' : ''
      } ${className}`}
    >
      <div
        ref={containerRef}
        className="w-full h-full flex items-center justify-center pointer-events-none overflow-visible"
      />
    </button>
  );
};
