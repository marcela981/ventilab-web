/*
* Funcionalidad: Navigation indicators
* Descripción: Small registry of the status indicators shown next to AppShell navigation items, keyed by a
*   NavIndicatorKey (same model as nav-badges). NavIndicatorProvider (mounted once in pages/_app.js) holds them; a
*   feature feeds its key through useSetNavIndicator with a generic tone and the text it wants shown, without the
*   shared layer importing any feature or knowing what the indicator means. The AppShell reads them with
*   useNavIndicators and declares, through useNavIndicatorHost, which keys its role-filtered navigation displays;
*   useNavIndicatorVisible tells a feeder whether its key is on screen, so it only reads or listens while it is.
*   Without a provider nothing is shown and setters are no-ops, so layouts and tests work unchanged. Depends on React.
*   v1.1 (T12 review fix W1): v1.0 held the physical ventilator state itself (two socket listeners, no initial state,
*   "sin datos" as the default); the state, its copy and its seed now belong to the ventilator-lab feature, and an
*   indicator nobody fed is simply not shown.
* Versión: 1.1
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

import { createContext, createElement, useCallback, useContext, useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";

export const NAV_INDICATOR_KEYS = ["ventilatorDevice"] as const;

export type NavIndicatorKey = (typeof NAV_INDICATOR_KEYS)[number];

/** Generic tone: the text always carries the meaning, the tone only colours the dot. */
export type NavIndicatorTone = "positive" | "negative" | "neutral";

export type NavIndicator = { tone: NavIndicatorTone, text: string };

export type NavIndicators = Partial<Record<NavIndicatorKey, NavIndicator>>;

type HostCounts = Partial<Record<NavIndicatorKey, number>>;

type NavIndicatorContextValue = {
  indicators: NavIndicators
  setIndicator: (key: NavIndicatorKey, indicator: NavIndicator | null) => void
  // Number of mounted hosts displaying each key.
  hosts: HostCounts
  registerHost: (keys: readonly NavIndicatorKey[]) => () => void
};

export const NavIndicatorContext = createContext<NavIndicatorContextValue | null>(null);

const EMPTY_INDICATORS: NavIndicators = {};

function noop() {}

function sameIndicator(left: NavIndicator | undefined, right: NavIndicator | undefined): boolean {
  return left === right || (left !== undefined && right !== undefined && left.tone === right.tone && left.text === right.text);
}

function addHosts(current: HostCounts, keys: readonly NavIndicatorKey[], delta: 1 | -1): HostCounts {
  const updated = { ...current };

  keys.forEach((key) => {
    const next = Math.max(0, (updated[key] ?? 0) + delta);

    if (next === 0) {
      delete updated[key];
    } else {
      updated[key] = next;
    }
  });

  return updated;
}

export type NavIndicatorProviderProps = {
  children: ReactNode
};

export function NavIndicatorProvider({ children }: NavIndicatorProviderProps) {
  const [indicators, setIndicators] = useState<NavIndicators>(EMPTY_INDICATORS);
  const [hosts, setHosts] = useState<HostCounts>({});

  const registerHost = useCallback((keys: readonly NavIndicatorKey[]) => {
    setHosts((current) => addHosts(current, keys, 1));

    return () => setHosts((current) => addHosts(current, keys, -1));
  }, []);

  const setIndicator = useCallback((key: NavIndicatorKey, indicator: NavIndicator | null) => {
    setIndicators((current) => {
      const next = indicator ?? undefined;

      if (sameIndicator(current[key], next)) {
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

  const value = useMemo(
    () => ({ indicators, setIndicator, hosts, registerHost }),
    [indicators, setIndicator, hosts, registerHost],
  );

  return createElement(NavIndicatorContext.Provider, { value }, children);
}

export function useNavIndicators(): NavIndicators {
  return useContext(NavIndicatorContext)?.indicators ?? EMPTY_INDICATORS;
}

// A null indicator clears it (nothing is shown for that key).
export function useSetNavIndicator(key: NavIndicatorKey): (indicator: NavIndicator | null) => void {
  const setIndicator = useContext(NavIndicatorContext)?.setIndicator;

  return useCallback(
    (indicator: NavIndicator | null) => (setIndicator ?? noop)(key, indicator),
    [setIndicator, key],
  );
}

// Called by the component that renders the indicators (AppShell) with the keys it displays, while it is mounted.
export function useNavIndicatorHost(keys: readonly NavIndicatorKey[]): void {
  const registerHost = useContext(NavIndicatorContext)?.registerHost;
  // A stable dependency for the same set of keys.
  const signature = [...new Set(keys)].sort().join(",");

  useEffect(() => {
    if (!registerHost || signature === "") {
      return undefined;
    }

    return registerHost(signature.split(",") as NavIndicatorKey[]);
  }, [registerHost, signature]);
}

// True while a host displays the key; feeders skip their reads and listeners otherwise.
export function useNavIndicatorVisible(key: NavIndicatorKey): boolean {
  return (useContext(NavIndicatorContext)?.hosts[key] ?? 0) > 0;
}
