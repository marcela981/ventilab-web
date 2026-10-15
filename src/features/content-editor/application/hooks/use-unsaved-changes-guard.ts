/*
* Funcionalidad: useUnsavedChangesGuard
* Descripción: While `active` (the page editor has unsaved changes) warns before leaving: `beforeunload` asks the browser to confirm closing or reloading the tab, and in-app navigations ask with window.confirm. Pages Router pattern (it has no cancel API): (1) back/forward go through router.beforePopState, which runs before Next routes the popped entry; when the user stays it returns false (Next does not route) and pushes the current entry back with its Next history state, so the URL and the screen never diverge; when the user leaves, the following routeChangeStart is not asked again. (2) Link/router.push go through routeChangeStart; when the user stays it emits routeChangeError and throws the NAVIGATION_CANCELLED string sentinel, which aborts router.change before any route is loaded; the resulting router.push rejection is unhandled by next/link, so an `unhandledrejection` listener calls preventDefault for that exact sentinel (no "Uncaught (in promise)" report; any other rejection is untouched). Navigations to the current URL are let through. On cleanup beforePopState is reset to always allow. Depends on React and next/router. v1.1 (C4 review): beforePopState for back/forward (URL restored when the user stays) and a string sentinel throw with a handled unhandledrejection instead of an Error surfacing as an unhandled rejection.
* Versión: 1.1 (C4)
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

import { useRouter } from "next/router";
import { useEffect } from "react";

// Thrown as a plain string (the conventional Pages Router abort) and matched by identity in the rejection handler.
export const NAVIGATION_CANCELLED = "Navegación cancelada: hay cambios sin guardar.";

export function useUnsavedChangesGuard(active: boolean, message: string): void {
  const router = useRouter();

  useEffect(() => {
    if (!active) {
      return undefined;
    }

    // Next history state of the entry being edited, to restore it when a back/forward is declined.
    const currentState: unknown = window.history.state;
    let confirmedPop = false;

    const onBeforeUnload = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      // Legacy browsers only show the prompt when returnValue is set.
      event.returnValue = "";
    };

    const onBeforePopState = (): boolean => {
      if (window.confirm(message)) {
        confirmedPop = true;

        return true;
      }

      // The browser already moved: put the edited entry back on top so the URL matches the screen.
      window.history.pushState(currentState, "", router.asPath);

      return false;
    };

    const onRouteChangeStart = (url: string) => {
      if (confirmedPop) {
        confirmedPop = false;

        return;
      }

      if (url === router.asPath || window.confirm(message)) {
        return;
      }

      router.events.emit("routeChangeError", new Error(NAVIGATION_CANCELLED), url, { shallow: false });
      throw NAVIGATION_CANCELLED;
    };

    const onUnhandledRejection = (event: PromiseRejectionEvent) => {
      if (event.reason === NAVIGATION_CANCELLED) {
        event.preventDefault();
      }
    };

    window.addEventListener("beforeunload", onBeforeUnload);
    window.addEventListener("unhandledrejection", onUnhandledRejection);
    router.beforePopState(onBeforePopState);
    router.events.on("routeChangeStart", onRouteChangeStart);

    return () => {
      window.removeEventListener("beforeunload", onBeforeUnload);
      window.removeEventListener("unhandledrejection", onUnhandledRejection);
      router.beforePopState(() => true);
      router.events.off("routeChangeStart", onRouteChangeStart);
    };
  }, [active, message, router]);
}
