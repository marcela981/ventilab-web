/*
* Funcionalidad: Evaluation assignments redirect
* Descripción: The assignment of an evaluation to groups lives in its builder (section "Asignación a grupos", Bloque 3, W6): this thin route replaces /evaluations/manage/[id]/assignments with /evaluations/manage/[id]/edit?section=asignacion on client navigations; full loads are redirected by next.config (config/legacy-redirects.mjs). Depends on the builder entry point and the teacher layout. v1.1 (Bloque 3, W5): redirect only.
* Versión: 1.0
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

import { useRouter } from "next/router";
import { useEffect } from "react";
import { buildEvaluationEditUrl } from "@features/evaluation-authoring/builder.entry";
import type { NextPageWithLayout } from "@shared/layouts/get-layout";
// Direct module import: the layouts index would pull every layout into this chunk.
import { withTeacherLayout } from "@shared/layouts/teacher-layout";

const EvaluationAssignmentsRedirect: NextPageWithLayout = () => {
  const router = useRouter();
  const evaluationId = typeof router.query.evaluationId === "string" ? router.query.evaluationId : null;
  const destination = evaluationId ? `${buildEvaluationEditUrl(evaluationId)}?section=asignacion` : null;

  useEffect(() => {
    if (destination) {
      void router.replace(destination);
    }
  }, [destination, router]);

  return null;
};

EvaluationAssignmentsRedirect.getLayout = withTeacherLayout;

export default EvaluationAssignmentsRedirect;
