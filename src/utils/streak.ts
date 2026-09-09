import { format, differenceInCalendarDays } from 'date-fns';

export interface StreakData {
  currentStreak: number;
  bestStreak: number;
  lastLoggedDate: string;
}

const STREAK_KEY = 'anexus_streak_data_v1';

export function getStreakData(): StreakData {
  try {
    const raw = localStorage.getItem(STREAK_KEY);
    if (raw) {
      return JSON.parse(raw);
    }
  } catch (e) {
    // fallback
  }

  return {
    currentStreak: 1,
    bestStreak: 1,
    lastLoggedDate: format(new Date(), 'yyyy-MM-dd')
  };
}

export function recordActivity(): StreakData {
  const data = getStreakData();
  const todayStr = format(new Date(), 'yyyy-MM-dd');

  if (data.lastLoggedDate === todayStr) {
    return data; // Already logged today
  }

  const diff = differenceInCalendarDays(new Date(todayStr), new Date(data.lastLoggedDate));

  let newCurrent = data.currentStreak;
  if (diff === 1) {
    // Consecutive day
    newCurrent += 1;
  } else if (diff > 1) {
    // Streak broken
    newCurrent = 1;
  }

  const newBest = Math.max(newCurrent, data.bestStreak);
  const updated: StreakData = {
    currentStreak: newCurrent,
    bestStreak: newBest,
    lastLoggedDate: todayStr
  };

  try {
    localStorage.setItem(STREAK_KEY, JSON.stringify(updated));
  } catch (e) {
    // ignore
  }

  return updated;
}
