/*
* Funcionalidad: Legacy evaluation redirect
* Descripción: R1: renders nothing and, once mounted, replaces the current legacy /evaluation/** URL (history replace, no query string) with the new route resolved for its Next pathname pattern. The destination page applies its own session and role guards. Depends on next/router and legacy-redirects.
* Versión: 1.0
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

import { useEffect, useRef } from "react";
import { useRouter } from "next/router";
import { type LegacyEvaluationRoute, resolveLegacyEvaluationRedirect } from "../entities/legacy-redirects";

export type LegacyEvaluationRedirectProps = {
  from: LegacyEvaluationRoute
};

export function LegacyEvaluationRedirect({ from }: LegacyEvaluationRedirectProps) {
  const router = useRouter();
  // The router object changes on every navigation; replace only once per mount.
  const redirectedRef = useRef(false);

  useEffect(() => {
    if (redirectedRef.current) {
      return;
    }

    redirectedRef.current = true;
    void router.replace(resolveLegacyEvaluationRedirect(from));
  }, [from, router]);

  return null;
}
