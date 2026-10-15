/*
* Funcionalidad: GradingPendingBadgeLoader
* Descripción: Renders nothing; feeds the "gradingPending" navigation badge (nav-badges registry of @shared/layouts) with the number of attempts waiting for review, read by usePendingGradingCount (refreshed every 60 s and on window focus). Clears the badge when it unmounts. Loaded lazily, and only for teachers and admins, by GradingPendingBadgeSync. Depends on React, @shared/layouts/nav-badges and the pending count hook.
* Versión: 1.0
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

import { useEffect } from "react";
import { useSetNavBadgeCount } from "@shared/layouts/nav-badges";
import { usePendingGradingCount } from "../hooks/use-pending-grading-count";

export function GradingPendingBadgeLoader() {
  const count = usePendingGradingCount(true);
  const setCount = useSetNavBadgeCount("gradingPending");

  useEffect(() => {
    // A failed or pending read keeps the last known count instead of flashing the badge away.
    if (count !== null) {
      setCount(count);
    }
  }, [count, setCount]);

  useEffect(() => () => setCount(null), [setCount]);

  return null;
}
