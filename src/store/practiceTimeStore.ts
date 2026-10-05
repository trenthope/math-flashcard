import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { useUserStore } from './userStore';

/** Local calendar date as YYYY-MM-DD (not UTC, so days roll over at local midnight). */
export function localDateKey(date: Date = new Date()): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

interface PracticeTimeState {
  /** userId -> local date (YYYY-MM-DD) -> milliseconds spent doing math */
  byUser: Record<string, Record<string, number>>;
  addTime: (ms: number, at?: Date) => void;
}

export const usePracticeTimeStore = create<PracticeTimeState>()(
  persist(
    (set) => ({
      byUser: {},

      addTime: (ms, at = new Date()) => {
        if (ms <= 0) return;
        const userId = useUserStore.getState().currentUserId ?? '';
        const day = localDateKey(at);
        set((state) => {
          const days = state.byUser[userId] ?? {};
          return {
            byUser: {
              ...state.byUser,
              [userId]: { ...days, [day]: (days[day] ?? 0) + ms },
            },
          };
        });
      },
    }),
    { name: 'mfa_practice_time' },
  ),
);

/** Returns the current user's daily math time (date -> ms). */
export function useCurrentUserPracticeTime(): Record<string, number> {
  const byUser = usePracticeTimeStore((s) => s.byUser);
  const userId = useUserStore((s) => s.currentUserId) ?? '';
  return byUser[userId] ?? {};
}
