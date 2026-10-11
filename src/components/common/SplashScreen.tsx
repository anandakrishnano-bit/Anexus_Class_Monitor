import React, { useState, useEffect } from 'react';

interface SplashScreenProps {
  onFinish: () => void;
}

export const SplashScreen: React.FC<SplashScreenProps> = ({ onFinish }) => {
  const [stage, setStage] = useState<'enter' | 'animate' | 'exit' | 'done'>('enter');
  const [progress, setProgress] = useState<number>(0);

  useEffect(() => {
    // 1. Initial entrance trigger
    const startTimer = setTimeout(() => {
      setStage('animate');
    }, 40);

    // 2. Smooth progress counter (0 -> 100%)
    const progressInterval = setInterval(() => {
      setProgress(prev => {
        if (prev >= 100) {
          clearInterval(progressInterval);
          return 100;
        }
        return Math.min(prev + Math.floor(Math.random() * 15 + 10), 100);
      });
    }, 90);

    // 3. Exit transition trigger
    const exitTimer = setTimeout(() => {
      setStage('exit');
    }, 1250);

    // 4. Teardown splash
    const finishTimer = setTimeout(() => {
      setStage('done');
      onFinish();
    }, 1600);

    return () => {
      clearTimeout(startTimer);
      clearInterval(progressInterval);
      clearTimeout(exitTimer);
      clearTimeout(finishTimer);
    };
  }, [onFinish]);

  if (stage === 'done') return null;

  const isExiting = stage === 'exit';

  return (
    <div
      className={`fixed inset-0 z-[99999] flex flex-col items-center justify-center bg-[#09090B] text-white select-none transition-all duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] ${
        isExiting ? 'opacity-0 scale-105 pointer-events-none' : 'opacity-100'
      }`}
    >
      {/* Dynamic ambient volumetric gradient backdrop */}
      <div
        className={`absolute w-[450px] h-[450px] rounded-full bg-gradient-to-tr from-amber-500/15 via-rose-500/10 to-indigo-500/15 blur-[120px] pointer-events-none transition-all duration-1000 ${
          isExiting ? 'scale-[2.5] opacity-0' : 'scale-100 opacity-100'
        }`}
      />

      {/* Main Content Container with Dribbble-style Lottie Spring Motion */}
      <div className="relative z-10 flex flex-col items-center text-center px-6">
        {/* Animated Layered Diamond Emblem */}
        <div className="relative mb-7">
          {/* Ambient Glow Aura */}
          <div
            className={`absolute -inset-6 rounded-full bg-white/10 blur-2xl transition-all duration-700 ${
              stage === 'animate' ? 'scale-110 opacity-70' : 'scale-75 opacity-0'
            }`}
          />

          {/* Icon Badge Container with Spring Scale */}
          <div
            className={`relative w-28 h-28 sm:w-32 sm:h-32 rounded-[2.5rem] bg-gradient-to-b from-[#18181B] to-[#09090B] p-6 shadow-2xl flex items-center justify-center border border-white/15 ring-1 ring-white/10 transition-all duration-700 ease-[cubic-bezier(0.34,1.56,0.64,1)] ${
              stage === 'enter'
                ? 'scale-50 rotate-[-12deg] opacity-0'
                : stage === 'animate'
                ? 'scale-100 rotate-0 opacity-100'
                : 'scale-110 opacity-0'
            }`}
          >
            {/* Vector Animated Layered Diamond Logo */}
            <svg
              viewBox="0 0 512 512"
              className="w-full h-full drop-shadow-xl"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              {/* Outer Stroke Outline with Path Drawing Animation */}
              <path
                d="M256 120 L380 192 L256 264 L132 192 Z"
                className={`transition-all duration-700 ease-out ${
                  stage === 'animate' ? 'opacity-100' : 'opacity-0'
                }`}
                fill="url(#topFacetGrad)"
                stroke="#FFFFFF"
                strokeWidth="6"
                strokeLinejoin="round"
              />

              {/* Middle Diamond Layer with Downward Cascade */}
              <path
                d="M132 238 L256 310 L380 238 L380 274 L256 346 L132 274 Z"
                className={`transition-all duration-700 delay-100 ease-out ${
                  stage === 'animate' ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-4'
                }`}
                fill="url(#midFacetGrad)"
                stroke="#E4E4E7"
                strokeWidth="4"
                strokeLinejoin="round"
              />

              {/* Bottom Diamond Foundation Layer */}
              <path
                d="M132 310 L256 382 L380 310 L380 346 L256 418 L132 346 Z"
                className={`transition-all duration-700 delay-200 ease-out ${
                  stage === 'animate' ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-6'
                }`}
                fill="url(#botFacetGrad)"
                stroke="#A1A1AA"
                strokeWidth="4"
                strokeLinejoin="round"
              />

              {/* Gradients */}
              <defs>
                <linearGradient id="topFacetGrad" x1="132" y1="120" x2="380" y2="264" gradientUnits="userSpaceOnUse">
                  <stop stopColor="#FFFFFF" />
                  <stop offset="1" stopColor="#E4E4E7" />
                </linearGradient>
                <linearGradient id="midFacetGrad" x1="132" y1="238" x2="380" y2="346" gradientUnits="userSpaceOnUse">
                  <stop stopColor="#D4D4D8" />
                  <stop offset="1" stopColor="#A1A1AA" />
                </linearGradient>
                <linearGradient id="botFacetGrad" x1="132" y1="310" x2="380" y2="418" gradientUnits="userSpaceOnUse">
                  <stop stopColor="#71717A" />
                  <stop offset="1" stopColor="#52525B" />
                </linearGradient>
              </defs>
            </svg>
          </div>
        </div>

        {/* Brand Name Typography with Kinetic Letter Spacing Expansion */}
        <div className="overflow-hidden">
          <h1
            className={`text-2xl sm:text-3xl font-black text-white flex items-center justify-center gap-2 mb-2 transition-all duration-700 ease-[cubic-bezier(0.16,1,0.3,1)] ${
              stage === 'animate'
                ? 'tracking-[0.3em] opacity-100 translate-y-0'
                : 'tracking-[0.05em] opacity-0 translate-y-4'
            }`}
          >
            <span>ANEXUS</span>
            <span className="text-[10px] tracking-normal px-2 py-0.5 rounded-full bg-white/10 text-neutral-200 border border-white/10 font-bold">
              PRO
            </span>
          </h1>
        </div>

        {/* Subtitle with Staggered Upward Reveal */}
        <p
          className={`text-[11px] font-bold tracking-widest uppercase text-neutral-400 mb-8 transition-all duration-700 delay-150 ease-[cubic-bezier(0.16,1,0.3,1)] ${
            stage === 'animate'
              ? 'opacity-100 translate-y-0'
              : 'opacity-0 translate-y-3'
          }`}
        >
          Class Representative Workspace
        </p>

        {/* Lottie-style Morphing Progress Capsule */}
        <div
          className={`w-44 h-1.5 rounded-full bg-neutral-800/80 overflow-hidden relative transition-all duration-500 delay-200 ${
            stage === 'animate' ? 'opacity-100 scale-100' : 'opacity-0 scale-95'
          }`}
        >
          <div
            className="h-full bg-gradient-to-r from-amber-400 via-rose-400 to-indigo-400 rounded-full transition-all duration-200 ease-out shadow-[0_0_12px_rgba(255,255,255,0.4)]"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>
    </div>
  );
};
