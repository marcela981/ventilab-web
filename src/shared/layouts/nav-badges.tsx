/*
* Funcionalidad: Navigation badge counts
* Descripción: Small registry of the numeric badges shown next to AppShell navigation items, keyed by a NavBadgeKey (for example "gradingPending"). NavBadgeProvider (mounted once in pages/_app.js) holds the counts; features feed them through useSetNavBadgeCount without the shared layer importing any feature, and the AppShell reads them with useNavBadgeCounts. Without a provider the counts are empty and setters are no-ops, so layouts and tests work unchanged. Depends on React. v1.1 (G1 review W2): badge visibility. The AppShell calls useNavBadgeHost while it is mounted, and useNavBadgesVisible reports whether any host is mounted, so feeders that poll the backend (the pending-grading count) run only while the badges are actually on screen (not on legacy pages without the AppShell). Without a provider nothing is visible.
* Versión: 1.1
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";

export const NAV_BADGE_KEYS = ["gradingPending"] as const;

export type NavBadgeKey = (typeof NAV_BADGE_KEYS)[number];

export type NavBadgeCounts = Partial<Record<NavBadgeKey, number>>;

type NavBadgeContextValue = {
  counts: NavBadgeCounts
  setCount: (key: NavBadgeKey, count: number | null) => void
  // Number of mounted badge hosts (AppShell instances).
  hosts: number
  registerHost: () => () => void
};

export const NavBadgeContext = createContext<NavBadgeContextValue | null>(null);

const EMPTY_COUNTS: NavBadgeCounts = {};

function noop() {}

export type NavBadgeProviderProps = {
  children: ReactNode
};

export function NavBadgeProvider({ children }: NavBadgeProviderProps) {
  const [counts, setCounts] = useState<NavBadgeCounts>(EMPTY_COUNTS);
  const [hosts, setHosts] = useState(0);

  const registerHost = useCallback(() => {
    setHosts((current) => current + 1);

    return () => setHosts((current) => Math.max(0, current - 1));
  }, []);

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

  const value = useMemo(() => ({ counts, setCount, hosts, registerHost }), [counts, setCount, hosts, registerHost]);

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

// Called by the component that renders the badges (AppShell) for as long as it is mounted.
export function useNavBadgeHost(): void {
  const registerHost = useContext(NavBadgeContext)?.registerHost;

  useEffect(() => (registerHost ? registerHost() : undefined), [registerHost]);
}

// True while a badge host is mounted; feeders skip their requests otherwise.
export function useNavBadgesVisible(): boolean {
  return (useContext(NavBadgeContext)?.hosts ?? 0) > 0;
}
