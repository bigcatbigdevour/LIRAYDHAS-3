'use client';

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import type { Blueprint, DailyReport, PolarityReading } from './types';

interface StoreState {
  blueprint: Blueprint | null;
  daily: DailyReport | null;
  polarity: PolarityReading | null;
  setBlueprint: (b: Blueprint | null) => void;
  setDaily: (d: DailyReport | null) => void;
  setPolarity: (p: PolarityReading | null) => void;
  reset: () => void;
}

export const useStore = create<StoreState>()(
  persist(
    (set) => ({
      blueprint: null,
      daily: null,
      polarity: null,
      setBlueprint: (blueprint) => set({ blueprint }),
      setDaily: (daily) => set({ daily }),
      setPolarity: (polarity) => set({ polarity }),
      reset: () => set({ blueprint: null, daily: null, polarity: null }),
    }),
    {
      name: 'liraydhas.v1',
      storage: createJSONStorage(() => localStorage),
      version: 1,
    },
  ),
);
