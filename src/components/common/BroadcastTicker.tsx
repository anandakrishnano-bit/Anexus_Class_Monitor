import React, { useState, useEffect } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../../db';
import { fetchActiveBroadcasts, BroadcastNotice } from '../../utils/broadcastService';
import { Megaphone, X, Clock, ChevronRight, Sparkles } from 'lucide-react';
import { Modal } from './Modal';

export const BroadcastTicker: React.FC = () => {
  const settingsList = useLiveQuery(() => db.settings.toArray());
  const currentSettings = settingsList?.[0];
  const classCode = currentSettings?.firebaseClassCode || '';

  const [notices, setNotices] = useState<BroadcastNotice[]>([]);
  const [dismissedIds, setDismissedIds] = useState<string[]>(() => {
    try {
      return JSON.parse(sessionStorage.getItem('dismissed_broadcasts') || '[]');
    } catch {
      return [];
    }
  });
  const [selectedNotice, setSelectedNotice] = useState<BroadcastNotice | null>(null);

  // Poll broadcasts every 20 seconds
  useEffect(() => {
    let isMounted = true;

    const checkBroadcasts = async () => {
      const active = await fetchActiveBroadcasts(classCode);
      if (isMounted) {
        setNotices(active);
      }
    };

    checkBroadcasts();
    const interval = setInterval(checkBroadcasts, 20000);

    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, [classCode]);

  // Filter out dismissed notices
  const visibleNotices = notices.filter(n => !dismissedIds.includes(n.id));

  if (visibleNotices.length === 0) {
    return null;
  }

  const currentNotice = visibleNotices[0];

  const handleDismiss = (e: React.MouseEvent) => {
    e.stopPropagation();
    const updated = [...dismissedIds, currentNotice.id];
    setDismissedIds(updated);
    sessionStorage.setItem('dismissed_broadcasts', JSON.stringify(updated));
  };

  // Calculate remaining hours and minutes
  const expiresAtMs = new Date(currentNotice.expiresAt).getTime();
  const diffMs = Math.max(0, expiresAtMs - Date.now());
  const remainingHours = Math.floor(diffMs / (1000 * 60 * 60));
  const remainingMins = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
  const timeRemainingStr = remainingHours > 0 ? `${remainingHours}h ${remainingMins}m` : `${remainingMins}m`;

  return (
    <>
      {/* DASHBOARD INTEGRATED BROADCAST CARD */}
      <div className="rounded-3xl bg-white dark:bg-[#171717] border border-amber-500/30 dark:border-amber-500/30 shadow-sm p-4 space-y-3 backdrop-blur-sm card-interactive animate-scale-in relative overflow-hidden group">
        {/* Subtle ambient gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-r from-amber-500/5 via-transparent to-amber-500/5 dark:from-amber-500/10 dark:via-transparent dark:to-amber-500/5 pointer-events-none rounded-3xl" />

        {/* Top Meta Bar */}
        <div className="relative z-10 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 flex-wrap">
            {/* Pulsing Beacon */}
            <span className="flex h-2.5 w-2.5 relative">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-amber-500"></span>
            </span>

            {/* Badge */}
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-amber-500/15 border border-amber-500/30 text-amber-600 dark:text-amber-400 text-[11px] font-black uppercase tracking-wider">
              <Megaphone className="w-3 h-3" />
              <span>Official 24h Notice</span>
            </span>

            {/* Target Audience */}
            <span className="px-2 py-0.5 rounded-full bg-neutral-100 dark:bg-[#262626] text-neutral-600 dark:text-neutral-300 text-[10px] font-bold font-mono">
              Target: {currentNotice.target}
            </span>

            {/* Expiry Pill */}
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-neutral-100 dark:bg-[#262626] text-neutral-500 dark:text-neutral-400 text-[10px] font-mono">
              <Clock className="w-3 h-3 text-amber-500" />
              <span>{timeRemainingStr} left</span>
            </span>
          </div>

          {/* Right Action buttons */}
          <div className="flex items-center gap-1.5 shrink-0">
            <button
              type="button"
              onClick={() => setSelectedNotice(currentNotice)}
              className="px-2.5 py-1 rounded-full bg-neutral-100 dark:bg-[#262626] hover:bg-neutral-200 dark:hover:bg-[#333] text-neutral-700 dark:text-neutral-200 text-[11px] font-bold flex items-center gap-1 transition-all"
            >
              <span>Read</span>
              <ChevronRight className="w-3 h-3" />
            </button>
            <button
              type="button"
              onClick={handleDismiss}
              className="p-1.5 rounded-full text-neutral-400 hover:text-neutral-700 dark:hover:text-white hover:bg-neutral-100 dark:hover:bg-[#262626] transition-colors"
              title="Dismiss notice for this session"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Sliding Marquee Window */}
        <div
          onClick={() => setSelectedNotice(currentNotice)}
          className="relative z-10 w-full overflow-hidden h-7 flex items-center cursor-pointer select-none rounded-xl bg-amber-500/5 dark:bg-black/30 border border-amber-500/15 px-2 [mask-image:linear-gradient(to_right,transparent,black_3%,black_97%,transparent)]"
        >
          <div className="animate-marquee-smooth flex items-center gap-12 font-medium text-xs sm:text-sm">
            {/* Copy 1 */}
            <div className="flex items-center gap-3 shrink-0">
              <span className="font-extrabold text-neutral-900 dark:text-white">
                {currentNotice.title}:
              </span>
              <span className="text-neutral-700 dark:text-neutral-300 font-normal">
                {currentNotice.message}
              </span>
              <span className="text-neutral-400 dark:text-neutral-500 font-mono text-[11px]">
                ({timeRemainingStr} remaining • by {currentNotice.publishedBy})
              </span>
            </div>

            <span className="text-amber-500 font-bold shrink-0 text-xs">•</span>

            {/* Copy 2 (Identical for seamless infinite sliding with zero gaps) */}
            <div className="flex items-center gap-3 shrink-0">
              <span className="font-extrabold text-neutral-900 dark:text-white">
                {currentNotice.title}:
              </span>
              <span className="text-neutral-700 dark:text-neutral-300 font-normal">
                {currentNotice.message}
              </span>
              <span className="text-neutral-400 dark:text-neutral-500 font-mono text-[11px]">
                ({timeRemainingStr} remaining • by {currentNotice.publishedBy})
              </span>
            </div>

            <span className="text-amber-500 font-bold shrink-0 text-xs">•</span>
          </div>
        </div>
      </div>

      {/* FULL NOTICE DETAIL MODAL */}
      {selectedNotice && (
        <Modal
          isOpen={true}
          onClose={() => setSelectedNotice(null)}
          title="Administrative Broadcast"
          subtitle="Official notice pushed by system administrator"
          maxWidth="sm"
        >
          <div className="space-y-4 text-xs">
            <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/20 space-y-2.5">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black bg-amber-500/20 text-amber-500 dark:text-amber-400 border border-amber-500/30">
                  Target: {selectedNotice.target}
                </span>
                <span className="flex items-center gap-1 text-[11px] text-neutral-500 dark:text-neutral-400 font-mono">
                  <Clock className="w-3.5 h-3.5 text-amber-500" />
                  <span>Valid for strictly 24 hours</span>
                </span>
              </div>
              <h3 className="text-sm sm:text-base font-black text-neutral-900 dark:text-white pt-1">
                {selectedNotice.title}
              </h3>
              <p className="text-xs text-neutral-700 dark:text-neutral-200 leading-relaxed whitespace-pre-wrap">
                {selectedNotice.message}
              </p>
            </div>

            <div className="text-[11px] text-neutral-500 dark:text-neutral-400 flex items-center justify-between px-1">
              <span>Published by: <strong className="text-neutral-800 dark:text-neutral-200">{selectedNotice.publishedBy}</strong></span>
              <span>Expires: <strong className="font-mono text-neutral-800 dark:text-neutral-200">{new Date(selectedNotice.expiresAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</strong></span>
            </div>

            <div className="flex items-center justify-end pt-2 border-t border-neutral-200 dark:border-neutral-800">
              <button
                type="button"
                onClick={() => setSelectedNotice(null)}
                className="px-5 py-2 rounded-full bg-neutral-900 dark:bg-white text-white dark:text-neutral-900 font-bold text-xs shadow-md hover:scale-105 active:scale-95 transition-all"
              >
                Dismiss &amp; Close
              </button>
            </div>
          </div>
        </Modal>
      )}
    </>
  );
};
