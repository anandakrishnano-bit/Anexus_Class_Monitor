import React, { useState, useEffect } from 'react';

interface SplashScreenProps {
  onFinish: () => void;
}

const LOADING_WORDS = [
  'Timetable',
  'Attendance',
  'Student Rosters',
  'Class Schedules',
  'Smart Assistant',
];

export const SplashScreen: React.FC<SplashScreenProps> = ({ onFinish }) => {
  const [stage, setStage] = useState<'enter' | 'visible' | 'exit' | 'done'>('enter');
  const [wordIndex, setWordIndex] = useState<number>(0);

  useEffect(() => {
    // Stage 1: Initial entrance
    const enterTimer = setTimeout(() => {
      setStage('visible');
    }, 40);

    // Word cycling ticker: switch words smoothly every 280ms
    const wordInterval = setInterval(() => {
      setWordIndex((prev) => (prev + 1) % LOADING_WORDS.length);
    }, 280);

    // Stage 2: Smooth exit zoom & fade (fast opening)
    const exitTimer = setTimeout(() => {
      setStage('exit');
    }, 850);

    // Stage 3: Teardown splash overlay
    const doneTimer = setTimeout(() => {
      setStage('done');
      onFinish();
    }, 1200);

    return () => {
      clearTimeout(enterTimer);
      clearInterval(wordInterval);
      clearTimeout(exitTimer);
      clearTimeout(doneTimer);
    };
  }, [onFinish]);

  if (stage === 'done') return null;

  const isExiting = stage === 'exit';

  return (
    <div
      className={`fixed inset-0 z-[99999] flex flex-col items-center justify-center bg-[#0A0A0A] text-white select-none transition-all duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] ${
        isExiting ? 'opacity-0 pointer-events-none' : 'opacity-100'
      }`}
    >
      {/* Ambient background volumetric glow */}
      <div
        className={`absolute w-96 h-96 rounded-full bg-neutral-700/20 blur-[120px] pointer-events-none transition-all duration-700 ease-out ${
          isExiting ? 'scale-[2] opacity-0' : 'scale-100 opacity-100'
        }`}
      />

      {/* Main Content Container with Smooth Zoom Expansion on Exit */}
      <div
        className={`relative z-10 flex flex-col items-center text-center px-6 transition-all duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] ${
          isExiting
            ? 'scale-[1.15] opacity-0 blur-[3px]'
            : stage === 'enter'
            ? 'scale-[0.94] opacity-80'
            : 'scale-100 opacity-100'
        }`}
      >
        {/* Floating App Icon Emblem (Circular Safe Zone - Never Cuts Off) */}
        <div className="relative mb-6">
          {/* Pulsing Aura */}
          <div
            className={`absolute -inset-4 rounded-full bg-neutral-600/25 blur-2xl transition-all duration-700 ${
              isExiting ? 'scale-150 opacity-0' : 'animate-pulse'
            }`}
          />

          {/* Organic Rounded Emblem Capsule */}
          <div className="relative w-24 h-24 sm:w-28 sm:h-28 rounded-full bg-gradient-to-b from-[#222222] to-[#121212] p-5 shadow-2xl flex items-center justify-center border border-white/10 ring-1 ring-white/5 transition-transform duration-500">
            {/* Layered Geometric Diamond Emblem (Centered with ample safety margin) */}
            <svg
              viewBox="0 0 512 512"
              className="w-full h-full drop-shadow-lg"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              {/* Top Diamond Layer */}
              <path
                d="M256 120 L380 192 L256 264 L132 192 Z"
                fill="#FFFFFF"
              />
              {/* Middle Diamond Layer */}
              <path
                d="M132 238 L256 310 L380 238 L380 274 L256 346 L132 274 Z"
                fill="#D4D4D4"
              />
              {/* Bottom Diamond Layer */}
              <path
                d="M132 310 L256 382 L380 310 L380 346 L256 418 L132 346 Z"
                fill="#737373"
              />
            </svg>
          </div>
        </div>

        {/* Brand Name */}
        <h1 className="text-2xl sm:text-3xl font-black tracking-[0.25em] text-white flex items-center justify-center gap-2 mb-1.5 ml-1">
          <span>ANEXUS</span>
          <span className="text-[10px] tracking-wider px-2 py-0.5 rounded-full bg-neutral-800 text-neutral-200 border border-neutral-700/80 font-bold">
            PRO
          </span>
        </h1>

        <p className="text-[11px] font-bold tracking-widest uppercase text-neutral-400 mb-6">
          Class Representative Workspace
        </p>

        {/* Unconstrained, Bigger Scrolling Words Animation */}
        <div className="flex flex-col items-center justify-center mt-4 w-full">
          {/* Large Vertical Word Ticker (Completely open, bigger typography, smooth vertical rolling) */}
          <div className="relative h-12 sm:h-14 w-full max-w-md overflow-hidden flex flex-col items-center justify-center pointer-events-none">
            {LOADING_WORDS.map((word, idx) => {
              const offset = (idx - wordIndex + LOADING_WORDS.length) % LOADING_WORDS.length;
              // offset 0 is active, 1 is next coming from bottom, others hidden
              const isActive = offset === 0;
              const isExiting = offset === LOADING_WORDS.length - 1;
              return (
                <span
                  key={word}
                  className={`absolute text-xl sm:text-2xl md:text-3xl font-black tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-white via-neutral-100 to-neutral-400 transition-all duration-350 ease-[cubic-bezier(0.16,1,0.3,1)] whitespace-nowrap text-center ${
                    isActive
                      ? 'translate-y-0 opacity-100 scale-100 blur-0'
                      : isExiting
                      ? '-translate-y-9 sm:-translate-y-10 opacity-0 scale-95 blur-[3px]'
                      : 'translate-y-9 sm:translate-y-10 opacity-0 scale-95 blur-[3px]'
                  }`}
                >
                  {word}
                </span>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};
