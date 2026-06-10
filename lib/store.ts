'use client';

import { useEffect, useState } from 'react';
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

/**
 * Hook that returns true once the persisted store has finished hydrating
 * from localStorage. Use this on routes that need to wait for the
 * blueprint to load before redirecting — otherwise a cold start can
 * see `blueprint: null` for one render and bounce a returning user to
 * /onboarding, which feels like "you logged me out."
 */
export function useStoreHydrated(): boolean {
  const [hydrated, setHydrated] = useState(false);
  useEffect(() => {
    // If hydration already happened (it usually has by the time React
    // gets here), flip immediately.
    if (useStore.persist.hasHydrated()) {
      setHydrated(true);
      return;
    }
    const unsub = useStore.persist.onFinishHydration(() => setHydrated(true));
    return () => unsub();
  }, []);
  return hydrated;
}

export const useStore = create<StoreState>()(
  persist(
    (set) => ({
      blueprint: null,
      daily: null,
      history: [],
      polarity: null,
      narrative: null,
      // Any LLM-derived reading is tied to a specific blueprint. When the
      // blueprint changes (edit or first set), wipe the caches so the next
      // tab visit regenerates them from the new chart.
      setBlueprint: (blueprint) => set({ blueprint, narrative: null, daily: null, polarity: null, history: [] }),
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
