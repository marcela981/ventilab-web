/*
* Funcionalidad: useUnsavedGradesGuard
* Descripción: Minimal unsaved-changes guard of the grade-attempt page (grading cannot import the evaluation-authoring guard, and no shared move is part of this task): while there are unsaved grade drafts the browser beforeunload prompt is armed and every Next.js client navigation (router.events routeChangeStart) asks window.confirm; a cancel emits routeChangeError and aborts the navigation by throwing, the documented Pages Router pattern. Depends on React and next/router. v1.1 (Bloque 3): a query-only change of the same page is not guarded (the grading screen keeps its drafts mounted across tabs and filters and asks itself before switching attempts).
* Versión: 1.1
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

import { useRouter } from "next/router";
import { useEffect } from "react";

export const GRADES_ROUTE_CHANGE_ABORTED = "Route change aborted: unsaved grades";

const pathOf = (url: string): string => url.split(/[?#]/)[0] ?? url;

export function samePath(url: string, current: string | undefined): boolean {
  return current !== undefined && pathOf(url) === pathOf(current);
}

export function useUnsavedGradesGuard(dirty: boolean, message: string): void {
  const router = useRouter();

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
      // A query-only change of the same page (tabs, filters of the grading screen) keeps the drafts mounted;
      // the screen itself asks before a change that would drop them (another attempt).
      if (samePath(url, router.asPath)) {
        return;
      }

      if (!window.confirm(message)) {
        router.events.emit("routeChangeError", new Error(GRADES_ROUTE_CHANGE_ABORTED), url, { shallow: false });
        // Next.js aborts a navigation when a routeChangeStart handler throws.
        throw GRADES_ROUTE_CHANGE_ABORTED;
      }
    };

    window.addEventListener("beforeunload", handleBeforeUnload);
    router.events.on("routeChangeStart", handleRouteChange);

    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
      router.events.off("routeChangeStart", handleRouteChange);
    };
  }, [dirty, message, router]);
}
