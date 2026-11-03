/*
* Funcionalidad: GradingAttemptResolver
* Descripción: The old grading screen of one attempt (/grading/attempts/[attemptId]) became the review pane of the unified grading screen of its evaluation (DISENO_BLOQUE3 §2.6). This resolver reads the attempt (`GET /api/evaluation-grading/attempts/{attemptId}`, the same SWR key the review pane reads next) only to learn its evaluation and replaces the route with /grading/evaluations/<evaluationId>?attempt=<attemptId>. Loading state while it resolves; error with retry and a link back to the Calificar tab when the attempt cannot be read. Depends on next/router, next/link, MUI, the design-system states, the grading attempt hook, URLs and error messages.
* Versión: 1.0
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

import Button from "@mui/material/Button";
import Link from "next/link";
import { useRouter } from "next/router";
import { useEffect, useRef } from "react";
import { ErrorState } from "@shared/design-system/components/error-state";
import { LoadingState } from "@shared/design-system/components/loading-state";
import { getGradingErrorMessage } from "../entities/grading-error-messages";
import { buildGradingReviewUrl, GRADING_URL } from "../entities/grading-urls";
import { useGradingAttempt } from "../hooks/use-grading-attempt";

// TODO(i18n): move to a grading namespace in src/i18n.
export const RESOLVER_COPY = {
  loading: "Abriendo el intento…",
  errorTitle: "No se pudo abrir el intento",
  back: "Volver a Calificar",
} as const;

export function GradingAttemptResolver({ attemptId }: { attemptId: string }) {
  const router = useRouter();
  const { attempt, error, reload } = useGradingAttempt(attemptId);
  const leavingRef = useRef(false);
  const target = attempt ? buildGradingReviewUrl(attempt.evaluationId, attemptId) : null;

  useEffect(() => {
    if (target && !leavingRef.current) {
      leavingRef.current = true;
      void router.replace(target);
    }
  }, [router, target]);

  if (!attempt && error) {
    return (
      <>
        <ErrorState title={RESOLVER_COPY.errorTitle} description={getGradingErrorMessage(error)} onRetry={() => void reload()} />
        <Button component={Link} href={GRADING_URL}>{RESOLVER_COPY.back}</Button>
      </>
    );
  }

  return <LoadingState label={RESOLVER_COPY.loading} />;
}
