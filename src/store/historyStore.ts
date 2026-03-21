import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { SessionRecord } from '@/types';
import { useUserStore } from './userStore';

interface HistoryState {
  sessions: SessionRecord[];
  saveSession: (record: SessionRecord) => void;
  deleteSession: (id: string) => void;
  clearHistory: () => void;
}

export const useHistoryStore = create<HistoryState>()(
  persist(
    (set) => ({
      sessions: [],

      saveSession: (record) => {
        const userId = useUserStore.getState().currentUserId ?? '';
        set((state) => ({
          sessions: [{ ...record, userId }, ...state.sessions],
        }));
      },

      deleteSession: (id) =>
        set((state) => ({
          sessions: state.sessions.filter((s) => s.id !== id),
        })),

      clearHistory: () => {
        const userId = useUserStore.getState().currentUserId;
        set((state) => ({
          sessions: userId
            ? state.sessions.filter((s) => s.userId !== userId)
            : [],
        }));
      },
    }),
    {
      name: 'mfa_sessions',
      version: 1,
      migrate: (state: unknown) => {
        const s = state as { sessions?: unknown[] };
        return {
          ...s,
          sessions: (s.sessions ?? []).map((r: unknown) => {
            const rec = r as Record<string, unknown>;
            if (!Array.isArray(rec.focusNumbers)) {
              rec.focusNumbers = rec.focusNumber != null ? [rec.focusNumber] : [1];
              delete rec.focusNumber;
            }
            return rec;
          }),
        };
      },
    }
  )
);

/** Returns only the current user's sessions. */
export function useCurrentUserSessions() {
  const sessions = useHistoryStore((s) => s.sessions);
  const userId = useUserStore((s) => s.currentUserId);
  return sessions.filter((s) => s.userId === userId);
}
