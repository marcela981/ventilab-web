/*
* Funcionalidad: useUnsavedChangesGuard
* Descripción: Warns before leaving a page with unsaved changes: while dirty, the browser beforeunload prompt is armed and every Next.js client navigation (router.events routeChangeStart) asks window.confirm with the given message; a cancel emits routeChangeError and aborts the navigation by throwing, the documented Pages Router pattern. Returns allowNextNavigation, used right before a navigation the page starts itself after saving (for example the redirect to the editor after creating). Depends on React and next/router.
* Versión: 1.0
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

import { useRouter } from "next/router";
import { useCallback, useEffect, useRef } from "react";

export const ROUTE_CHANGE_ABORTED = "Route change aborted: unsaved changes";

export function useUnsavedChangesGuard(dirty: boolean, message: string): { allowNextNavigation: () => void } {
  const router = useRouter();
  const bypassRef = useRef(false);

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

    window.addEventListener("beforeunload", handleBeforeUnload);
    router.events.on("routeChangeStart", handleRouteChange);

    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
      router.events.off("routeChangeStart", handleRouteChange);
    };
  }, [dirty, message, router.events]);

  const allowNextNavigation = useCallback(() => {
    bypassRef.current = true;
  }, []);

  return { allowNextNavigation };
}
