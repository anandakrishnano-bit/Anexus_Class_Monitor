import React, { useState, useEffect, useRef } from 'react';
import { useTheme } from '../../context/ThemeContext';
import { triggerHaptic } from '../../utils/haptics';

interface SplashScreenProps {
  onFinish: () => void;
  onExitStart?: () => void;
}

export const SplashScreen: React.FC<SplashScreenProps> = ({ onFinish, onExitStart }) => {
  const { isDark } = useTheme();
  // Stages:
  // 1. 'enter'    - Initial entrance
  // 2. 'assemble' - Logo tiers spring together (0ms -> 650ms)
  // 3. 'text'     - Brand name expands (650ms -> 1550ms)
  // 4. 'exit'     - Smooth 500ms optical dissolve (1550ms -> 2050ms)
  // 5. 'done'     - Teardown & DOM unmount at 2.05s
  const [stage, setStage] = useState<'enter' | 'assemble' | 'text' | 'exit' | 'done'>('enter');
  const finishedRef = useRef(false);

  useEffect(() => {
    // Stage 1: Assemble tiers (40ms)
    const assembleTimer = setTimeout(() => {
      if (!finishedRef.current) {
        setStage('assemble');
        triggerHaptic('light');
      }
    }, 40);

    // Stage 2: Reveal typography with tracking expansion (650ms)
    const textTimer = setTimeout(() => {
      if (!finishedRef.current) {
        setStage('text');
        triggerHaptic('medium');
      }
    }, 650);

    // Stage 3: Begin smooth fade out and notify app to fade in (1550ms)
    const exitTimer = setTimeout(() => {
      if (!finishedRef.current) {
        onExitStart?.();
        setStage('exit');
      }
    }, 1550);

    // Stage 4: Teardown at 2050ms (after full 500ms exit fade completes)
    const doneTimer = setTimeout(() => {
      if (!finishedRef.current) {
        finishedRef.current = true;
        setStage('done');
        onFinish();
      }
    }, 2050);

    return () => {
      clearTimeout(assembleTimer);
      clearTimeout(textTimer);
      clearTimeout(exitTimer);
      clearTimeout(doneTimer);
    };
  }, [onFinish, onExitStart]);

  if (stage === 'done') return null;

  const isAssembling = stage !== 'enter';
  const isTextStage = stage === 'text';
  const isExiting = stage === 'exit';

  // Palette adaptation based on Dark vs Light Mode
  const bgColor = isDark ? '#000000' : '#FFFFFF';
  const textColor = isDark ? '#FFFFFF' : '#09090B';
  const subtextColor = isDark ? '#A1A1AA' : '#71717A';

  // Logo tier colors inverted gracefully for Light Mode contrast
  const topDiamondFill = isDark ? 'url(#topFacetDarkGrad)' : 'url(#topFacetLightGrad)';
  const topDiamondStroke = isDark ? '#FFFFFF' : '#18181B';
  const innerRidgeStroke = isDark ? '#FFFFFF' : '#000000';

  const midTierFill = isDark ? 'url(#midTierDarkGrad)' : 'url(#midTierLightGrad)';
  const midTierStroke = isDark ? '#A1A1AA' : '#52525B';

  const botTierFill = isDark ? 'url(#botTierDarkGrad)' : 'url(#botTierLightGrad)';
  const botTierStroke = isDark ? '#52525B' : '#A1A1AA';

  const handleDismiss = () => {
    if (finishedRef.current || isExiting) return;
    onExitStart?.();
    setStage('exit');
    setTimeout(() => {
      if (!finishedRef.current) {
        finishedRef.current = true;
        setStage('done');
        onFinish();
      }
    }, 450);
  };

  return (
    <div
      onClick={handleDismiss}
      role="button"
      tabIndex={0}
      title="Tap to skip"
      className={`fixed inset-0 z-[999999] flex flex-col items-center justify-center select-none overflow-hidden cursor-pointer ${
        isExiting ? 'opacity-0 scale-[1.03] pointer-events-none' : 'opacity-100 scale-100'
      }`}
      style={{
        backgroundColor: bgColor,
        transition: 'opacity 500ms cubic-bezier(0.16, 1, 0.3, 1), transform 500ms cubic-bezier(0.16, 1, 0.3, 1)',
        willChange: 'opacity, transform',
      }}
    >
      {/* Dynamic Ambient Volumetric Radial Glow */}
      <div
        className={`absolute w-[440px] h-[440px] rounded-full pointer-events-none transition-all duration-1000 ${
          isDark
            ? 'bg-gradient-to-tr from-white/10 via-neutral-500/10 to-transparent blur-[110px]'
            : 'bg-gradient-to-tr from-neutral-300/40 via-neutral-200/25 to-transparent blur-[90px]'
        } ${isExiting ? 'scale-[2] opacity-0' : 'scale-100 opacity-90'}`}
      />

      {/* Main Kinetic Assembly Container */}
      <div
        className={`relative z-10 flex flex-col items-center text-center px-6 pointer-events-none transition-all duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] ${
          isExiting ? 'opacity-0 scale-95 translate-y-1' : 'opacity-100 scale-100 translate-y-0'
        }`}
      >
        {/* Emblem Badge Container */}
        <div className="relative mb-5">
          {/* Subtle Ambient Halo */}
          <div
            className={`absolute -inset-8 rounded-full blur-xl transition-all duration-500 ${
              isDark ? 'bg-white/5' : 'bg-black/5'
            } ${isTextStage ? 'scale-110 opacity-70' : 'scale-90 opacity-0'}`}
          />

          {/* EXACT OFFICIAL APP LOGO (public/favicon.svg & ic_launcher_foreground.xml) */}
          <div className="relative w-32 h-32 sm:w-36 sm:h-36 flex items-center justify-center">
            <svg
              viewBox="0 0 300 330"
              className={`w-full h-full overflow-visible ${
                isDark
                  ? 'drop-shadow-[0_15px_30px_rgba(0,0,0,0.95)]'
                  : 'drop-shadow-[0_12px_24px_rgba(0,0,0,0.12)]'
              }`}
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <defs>
                {/* DARK MODE GRADIENTS */}
                <linearGradient id="topFacetDarkGrad" x1="30" y1="20" x2="270" y2="160" gradientUnits="userSpaceOnUse">
                  <stop offset="0%" stopColor="#FFFFFF" />
                  <stop offset="50%" stopColor="#F4F4F5" />
                  <stop offset="100%" stopColor="#E4E4E7" />
                </linearGradient>
                <linearGradient id="midTierDarkGrad" x1="30" y1="135" x2="270" y2="240" gradientUnits="userSpaceOnUse">
                  <stop offset="0%" stopColor="#E4E4E7" />
                  <stop offset="100%" stopColor="#A1A1AA" />
                </linearGradient>
                <linearGradient id="botTierDarkGrad" x1="30" y1="205" x2="270" y2="310" gradientUnits="userSpaceOnUse">
                  <stop offset="0%" stopColor="#71717A" />
                  <stop offset="100%" stopColor="#3F3F46" />
                </linearGradient>

                {/* LIGHT MODE GRADIENTS */}
                <linearGradient id="topFacetLightGrad" x1="30" y1="20" x2="270" y2="160" gradientUnits="userSpaceOnUse">
                  <stop offset="0%" stopColor="#27272A" />
                  <stop offset="60%" stopColor="#18181B" />
                  <stop offset="100%" stopColor="#09090B" />
                </linearGradient>
                <linearGradient id="midTierLightGrad" x1="30" y1="135" x2="270" y2="240" gradientUnits="userSpaceOnUse">
                  <stop offset="0%" stopColor="#71717A" />
                  <stop offset="100%" stopColor="#52525B" />
                </linearGradient>
                <linearGradient id="botTierLightGrad" x1="30" y1="205" x2="270" y2="310" gradientUnits="userSpaceOnUse">
                  <stop offset="0%" stopColor="#D4D4D8" />
                  <stop offset="100%" stopColor="#A1A1AA" />
                </linearGradient>
              </defs>

              {/* ----------------------------------------------------
                  1. BOTTOM TIER: Floats up smoothly
                  ---------------------------------------------------- */}
              <g
                style={{
                  transform: isAssembling ? 'translateY(0px)' : 'translateY(35px)',
                  opacity: isAssembling ? 1 : 0,
                  transition: 'transform 550ms cubic-bezier(0.16, 1, 0.3, 1), opacity 500ms ease-out',
                }}
              >
                <path
                  d="M30 205 L150 275 L270 205 L270 240 L150 310 L30 240 Z"
                  fill={botTierFill}
                  stroke={botTierStroke}
                  strokeWidth="1.5"
                  strokeLinejoin="round"
                />
              </g>

              {/* ----------------------------------------------------
                  2. MIDDLE TIER: Glides in and snaps down
                  ---------------------------------------------------- */}
              <g
                style={{
                  transform: isAssembling ? 'translateY(0px)' : 'translateY(20px)',
                  opacity: isAssembling ? 1 : 0,
                  transition: 'transform 600ms cubic-bezier(0.16, 1, 0.3, 1) 70ms, opacity 500ms ease-out 70ms',
                }}
              >
                <path
                  d="M30 135 L150 205 L270 135 L270 170 L150 240 L30 170 Z"
                  fill={midTierFill}
                  stroke={midTierStroke}
                  strokeWidth="1.5"
                  strokeLinejoin="round"
                />
              </g>

              {/* ----------------------------------------------------
                  3. TOP DIAMOND: Springs down with elastic snap
                  ---------------------------------------------------- */}
              <g
                style={{
                  transform: isAssembling
                    ? 'translateY(0px) scale(1)'
                    : 'translateY(-40px) scale(0.85)',
                  opacity: isAssembling ? 1 : 0,
                  transformOrigin: '150px 90px',
                  transition: 'transform 650ms cubic-bezier(0.34, 1.56, 0.64, 1) 130ms, opacity 550ms ease-out 130ms',
                }}
              >
                <path
                  d="M150 20 L270 90 L150 160 L30 90 Z"
                  fill={topDiamondFill}
                  stroke={topDiamondStroke}
                  strokeWidth="2"
                  strokeLinejoin="round"
                />

                {/* Subtle Inner Diamond Ridge Highlight */}
                <path
                  d="M150 35 L250 90 L150 145 L50 90 Z"
                  fill="none"
                  stroke={innerRidgeStroke}
                  strokeWidth="0.75"
                  strokeOpacity={isDark ? 0.5 : 0.25}
                />
              </g>
            </svg>
          </div>
        </div>

        {/* Brand Name Typography with Kinetic Letter Spacing Expansion */}
        <div className="overflow-hidden mb-1.5">
          <h1
            className={`text-2xl sm:text-3xl font-black flex items-center justify-center transition-all duration-600 ease-[cubic-bezier(0.16,1,0.3,1)] ${
              isTextStage
                ? 'tracking-[0.28em] opacity-100 translate-y-0'
                : 'tracking-[0.05em] opacity-0 translate-y-3'
            }`}
            style={{ color: textColor }}
          >
            <span className="font-extrabold">ANEXUS</span>
          </h1>
        </div>

        {/* Clean Subtitle with Staggered Upward Reveal */}
        <p
          className={`text-[11px] font-bold tracking-[0.22em] uppercase transition-all duration-500 delay-70 ease-[cubic-bezier(0.16,1,0.3,1)] ${
            isTextStage
              ? 'opacity-100 translate-y-0'
              : 'opacity-0 translate-y-2'
          }`}
          style={{ color: subtextColor }}
        >
          Class Management Platform
        </p>
      </div>
    </div>
  );
};
