'use client';

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import type { Blueprint, DailyReport } from './types';

interface StoreState {
  blueprint: Blueprint | null;
  daily: DailyReport | null;
  setBlueprint: (b: Blueprint | null) => void;
  setDaily: (d: DailyReport | null) => void;
  reset: () => void;
}

export const useStore = create<StoreState>()(
  persist(
    (set) => ({
      blueprint: null,
      daily: null,
      setBlueprint: (blueprint) => set({ blueprint }),
      setDaily: (daily) => set({ daily }),
      reset: () => set({ blueprint: null, daily: null }),
    }),
    {
      name: 'liraydhas.v1',
      storage: createJSONStorage(() => localStorage),
      version: 1,
    },
  ),
);
