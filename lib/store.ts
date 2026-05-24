'use client';

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import type { Blueprint, DailyReport, NarrativeReading, PolarityReading } from './types';

interface StoreState {
  blueprint: Blueprint | null;
  daily: DailyReport | null;
  /** rolling history of the last 30 daily reports, newest first */
  history: DailyReport[];
  polarity: PolarityReading | null;
  narrative: NarrativeReading | null;
  setBlueprint: (b: Blueprint | null) => void;
  setDaily: (d: DailyReport | null) => void;
  setPolarity: (p: PolarityReading | null) => void;
  setNarrative: (n: NarrativeReading | null) => void;
  reset: () => void;
}

export const useStore = create<StoreState>()(
  persist(
    (set) => ({
      blueprint: null,
      daily: null,
      history: [],
      polarity: null,
      narrative: null,
      setBlueprint: (blueprint) => set({ blueprint, narrative: null }),
      setDaily: (daily) =>
        set((s) => {
          if (!daily) return { daily: null };
          const filtered = s.history.filter((d) => d.date !== daily.date);
          return {
            daily,
            history: [daily, ...filtered].slice(0, 30),
          };
        }),
      setPolarity: (polarity) => set({ polarity }),
      setNarrative: (narrative) => set({ narrative }),
      reset: () => set({ blueprint: null, daily: null, polarity: null, history: [], narrative: null }),
    }),
    {
      name: 'liraydhas.v1',
      storage: createJSONStorage(() => localStorage),
      version: 2,
      migrate: (persistedState, version) => {
        const s = persistedState as Partial<StoreState>;
        if (version < 2 && !s.history) {
          return { ...s, history: [] } as StoreState;
        }
        return s as StoreState;
      },
    },
  ),
);
