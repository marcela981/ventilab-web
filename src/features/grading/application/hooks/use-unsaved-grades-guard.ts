/*
* Funcionalidad: useUnsavedGradesGuard
* Descripción: Minimal unsaved-changes guard of the grade-attempt page (grading cannot import the evaluation-authoring guard, and no shared move is part of this task): while there are unsaved grade drafts the browser beforeunload prompt is armed and every Next.js client navigation (router.events routeChangeStart) asks window.confirm; a cancel emits routeChangeError and aborts the navigation by throwing, the documented Pages Router pattern. Depends on React and next/router.
* Versión: 1.0
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

import { useRouter } from "next/router";
import { useEffect } from "react";

export const GRADES_ROUTE_CHANGE_ABORTED = "Route change aborted: unsaved grades";

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
