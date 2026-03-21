import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { User } from '@/types';
import { v4 as uuidv4 } from 'uuid';

interface UserState {
  users: User[];
  currentUserId: string | null;
  addUser: (name: string) => User;
  selectUser: (id: string) => void;
  renameUser: (id: string, name: string) => void;
  deleteUser: (id: string) => void;
}

export const useUserStore = create<UserState>()(
  persist(
    (set, get) => ({
      users: [],
      currentUserId: null,

      addUser: (name: string) => {
        const user: User = {
          id: uuidv4(),
          name,
          createdAt: new Date().toISOString(),
        };
        set((state) => ({ users: [...state.users, user] }));
        return user;
      },

      selectUser: (id: string) => set({ currentUserId: id }),

      renameUser: (id: string, name: string) =>
        set((state) => ({
          users: state.users.map((u) => (u.id === id ? { ...u, name } : u)),
        })),

      deleteUser: (id: string) =>
        set((state) => ({
          users: state.users.filter((u) => u.id !== id),
          currentUserId: state.currentUserId === id ? null : state.currentUserId,
        })),
    }),
    { name: 'mfa_users' },
  ),
);
