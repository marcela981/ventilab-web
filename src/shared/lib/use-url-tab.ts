/*
* Funcionalidad: useUrlTab + parseUrlTab
* Descripción: Generic URL-owned tab state for tabbed workspaces (/simulador, /learn; DISENO_BLOQUE2 §2.1), extracted
*   from the Bloque 1 useWorkspaceTab. parseUrlTab is pure: a missing, repeated or unknown `?tab=` value gives the
*   default tab. useUrlTab reads the query only once the router is ready (null before, so the default tab never
*   flashes); selecting a tab is a shallow `router.replace` that keeps the rest of the query, so the page and its
*   panels never remount. With `ignoreUrl` (e.g. staff on /learn, who only see one tab) the URL is neither read nor
*   written: the tab is always the default one. Depends on next/router and React.
* Versión: 0.1
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

import { useRouter } from "next/router";
import { useCallback } from "react";

/** Tab of a Next query value (`router.query.tab`); anything but one known key gives the default tab. */
export function parseUrlTab<T extends string>(
  tabs: readonly T[],
  defaultTab: T,
  value: string | string[] | undefined,
): T {
  return typeof value === "string" && (tabs as readonly string[]).includes(value) ? (value as T) : defaultTab;
}

export type UseUrlTabOptions = {
  /** Never read nor write `?tab=`: the tab is always the default one (it is still null until the router is ready). */
  ignoreUrl?: boolean
};

export type UseUrlTabResult<T extends string> = {
  /** null until the router is ready. */
  tab: T | null
  selectTab: (tab: T) => void
};

export function useUrlTab<T extends string>(
  tabs: readonly T[],
  defaultTab: T,
  { ignoreUrl = false }: UseUrlTabOptions = {},
): UseUrlTabResult<T> {
  const router = useRouter();
  let tab: T | null = null;

  if (router.isReady) {
    tab = ignoreUrl ? defaultTab : parseUrlTab(tabs, defaultTab, router.query.tab);
  }

  const selectTab = useCallback((next: T) => {
    if (ignoreUrl) {
      return;
    }

    void router.replace({ pathname: router.pathname, query: { ...router.query, tab: next } }, undefined, { shallow: true });
  }, [router, ignoreUrl]);

  return { tab, selectTab };
}
