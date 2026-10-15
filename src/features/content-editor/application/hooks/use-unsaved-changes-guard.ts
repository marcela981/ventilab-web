/*
* Funcionalidad: useUnsavedChangesGuard
* Descripción: While `active` (the page editor has unsaved changes) warns before leaving: `beforeunload` asks the browser to confirm closing or reloading the tab, and the Next router `routeChangeStart` asks with window.confirm before an in-app navigation; when the user stays, the navigation is cancelled the way the Pages Router supports (emit routeChangeError and throw). Navigations to the current URL are let through. Depends on React and next/router.
* Versión: 1.0 (C4)
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

import { useRouter } from "next/router";
import { useEffect } from "react";

export const NAVIGATION_CANCELLED = "Navegación cancelada: hay cambios sin guardar.";

export function useUnsavedChangesGuard(active: boolean, message: string): void {
  const router = useRouter();

  useEffect(() => {
    if (!active) {
      return undefined;
    }

    const onBeforeUnload = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      // Legacy browsers only show the prompt when returnValue is set.
      event.returnValue = "";
    };

    const onRouteChangeStart = (url: string) => {
      if (url === router.asPath || window.confirm(message)) {
        return;
      }

      router.events.emit("routeChangeError", new Error(NAVIGATION_CANCELLED), url, { shallow: false });
      // The Pages Router has no cancel API: throwing here is the supported way to abort the navigation.
      throw new Error(NAVIGATION_CANCELLED);
    };

    window.addEventListener("beforeunload", onBeforeUnload);
    router.events.on("routeChangeStart", onRouteChangeStart);

    return () => {
      window.removeEventListener("beforeunload", onBeforeUnload);
      router.events.off("routeChangeStart", onRouteChangeStart);
    };
  }, [active, message, router]);
}
