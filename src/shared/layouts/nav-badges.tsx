/*
* Funcionalidad: Navigation badge counts
* Descripción: Small registry of the numeric badges shown next to AppShell navigation items, keyed by a NavBadgeKey (for example "gradingPending"). NavBadgeProvider (mounted once in pages/_app.js) holds the counts; features feed them through useSetNavBadgeCount without the shared layer importing any feature, and the AppShell reads them with useNavBadgeCounts. Without a provider the counts are empty and setters are no-ops, so layouts and tests work unchanged. Depends on React.
* Versión: 1.0
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

import { createContext, useCallback, useContext, useMemo, useState } from "react";
import type { ReactNode } from "react";

export const NAV_BADGE_KEYS = ["gradingPending"] as const;

export type NavBadgeKey = (typeof NAV_BADGE_KEYS)[number];

export type NavBadgeCounts = Partial<Record<NavBadgeKey, number>>;

type NavBadgeContextValue = {
  counts: NavBadgeCounts
  setCount: (key: NavBadgeKey, count: number | null) => void
};

export const NavBadgeContext = createContext<NavBadgeContextValue | null>(null);

const EMPTY_COUNTS: NavBadgeCounts = {};

function noop() {}

export type NavBadgeProviderProps = {
  children: ReactNode
};

export function NavBadgeProvider({ children }: NavBadgeProviderProps) {
  const [counts, setCounts] = useState<NavBadgeCounts>(EMPTY_COUNTS);

  const setCount = useCallback((key: NavBadgeKey, count: number | null) => {
    setCounts((current) => {
      const next = count !== null && count > 0 ? count : undefined;

      if (current[key] === next) {
        return current;
      }

      const updated = { ...current };

      if (next === undefined) {
        delete updated[key];
      } else {
        updated[key] = next;
      }

      return updated;
    });
  }, []);

  const value = useMemo(() => ({ counts, setCount }), [counts, setCount]);

  return <NavBadgeContext.Provider value={value}>{children}</NavBadgeContext.Provider>;
}

export function useNavBadgeCounts(): NavBadgeCounts {
  return useContext(NavBadgeContext)?.counts ?? EMPTY_COUNTS;
}

// A null or zero count clears the badge.
export function useSetNavBadgeCount(key: NavBadgeKey): (count: number | null) => void {
  const setCount = useContext(NavBadgeContext)?.setCount;

  return useCallback((count: number | null) => (setCount ?? noop)(key, count), [setCount, key]);
}
