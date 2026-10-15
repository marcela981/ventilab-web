/*
* Funcionalidad: useUnsavedChangesGuard
* Descripción: Warns before leaving a page with unsaved changes: while dirty, the browser beforeunload prompt is armed and every Next.js client navigation (router.events routeChangeStart) asks window.confirm with the given message; a cancel emits routeChangeError and aborts the navigation by throwing, the documented Pages Router pattern. Returns allowNextNavigation, used right before a navigation the page starts itself after saving (for example the redirect to the editor after creating). Depends on React and next/router. v1.1 (A2 review): the browser Back/Forward buttons are guarded with router.beforePopState (a cancel puts the current URL back in the history and stops Next.js; an accepted one is not asked again on routeChangeStart); the bypass of allowNextNavigation ends when the navigation completes or fails, or after ALLOW_NAVIGATION_TIMEOUT_MS when no navigation started, so it never skips the guard of a later navigation. v1.2 (A3 review W1/S3): a cancelled Back/Forward pushes a Next-compatible history state for the current page (url = route pathname with its query, as = router.asPath) instead of the destination state, so a later Forward routes correctly; the bypass of an accepted Back/Forward also ends after ALLOW_NAVIGATION_TIMEOUT_MS, and every bypass ends on hashChangeComplete too.
* Versión: 1.2
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

import { useRouter } from "next/router";
import { useCallback, useEffect, useRef } from "react";

export const ROUTE_CHANGE_ABORTED = "Route change aborted: unsaved changes";
export const ALLOW_NAVIGATION_TIMEOUT_MS = 5000;

type RouterQuery = Readonly<Record<string, string | string[] | undefined>>;

// The Next.js `url` of a history entry: the route pathname with its query ("/x/[id]/edit?id=e1").
export function routeHref(pathname: string, query: RouterQuery): string {
  const params = new URLSearchParams();

  for (const [key, value] of Object.entries(query)) {
    for (const item of Array.isArray(value) ? value : value === undefined ? [] : [value]) {
      params.append(key, item);
    }
  }

  const search = params.toString();

  return search ? `${pathname}?${search}` : pathname;
}

// window.history.state belongs to the destination during popstate: rebuild one for the current page.
export function currentPageHistoryState(state: unknown, pathname: string, query: RouterQuery, asPath: string): Record<string, unknown> {
  const base = typeof state === "object" && state !== null ? state as Record<string, unknown> : {};

  return { ...base, __N: true, url: routeHref(pathname, query), as: asPath };
}

export function useUnsavedChangesGuard(dirty: boolean, message: string): { allowNextNavigation: () => void } {
  const router = useRouter();
  const bypassRef = useRef(false);
  const bypassTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const endBypass = useCallback(() => {
    bypassRef.current = false;

    if (bypassTimerRef.current !== null) {
      clearTimeout(bypassTimerRef.current);
      bypassTimerRef.current = null;
    }
  }, []);

  // A navigation that never starts must not leave the guard open for a later one.
  const startBypass = useCallback(() => {
    endBypass();
    bypassRef.current = true;
    bypassTimerRef.current = setTimeout(endBypass, ALLOW_NAVIGATION_TIMEOUT_MS);
  }, [endBypass]);

  // The bypass covers exactly one navigation: it ends when that navigation settles.
  useEffect(() => {
    router.events.on("routeChangeComplete", endBypass);
    router.events.on("routeChangeError", endBypass);
    router.events.on("hashChangeComplete", endBypass);

    return () => {
      router.events.off("routeChangeComplete", endBypass);
      router.events.off("routeChangeError", endBypass);
      router.events.off("hashChangeComplete", endBypass);
      endBypass();
    };
  }, [endBypass, router.events]);

  useEffect(() => {
    if (!dirty) {
      return undefined;
    }

    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      // Legacy browsers only show the prompt when returnValue is set.
      event.returnValue = "";
    };

    const handleRouteChange = (url: string) => {
      if (bypassRef.current) {
        bypassRef.current = false;

        return;
      }

      if (!window.confirm(message)) {
        router.events.emit("routeChangeError", new Error(ROUTE_CHANGE_ABORTED), url, { shallow: false });
        // Next.js aborts a navigation when a routeChangeStart handler throws.
        throw ROUTE_CHANGE_ABORTED;
      }
    };

    // Back/Forward: the browser already moved the URL, so a cancel must put it back and stop Next.js.
    const handlePopState = (): boolean => {
      if (bypassRef.current || window.confirm(message)) {
        // Already confirmed: routeChangeStart must not ask again.
        startBypass();

        return true;
      }

      window.history.pushState(
        currentPageHistoryState(window.history.state, router.pathname, router.query, router.asPath),
        "",
        router.asPath,
      );

      return false;
    };

    window.addEventListener("beforeunload", handleBeforeUnload);
    router.events.on("routeChangeStart", handleRouteChange);
    router.beforePopState(handlePopState);

    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
      router.events.off("routeChangeStart", handleRouteChange);
      router.beforePopState(() => true);
    };
  }, [dirty, message, router, startBypass]);

  return { allowNextNavigation: startBypass };
}
