/*
* Funcionalidad: Evaluation results route
* Descripción: Thin route for /grading/evaluations/[evaluationId]: composes the teacher layout (RequireRole TEACHER/ADMIN + AppShell, which waits for router.isReady) with the lazy EvaluationResultsPage of the grading feature for the evaluationId of the URL. Depends on next/router, @features/grading and @shared/layouts/teacher-layout. v1.1 (Bloque 3): imports the feature entry point instead of the barrel (smaller route chunk).
* Versión: 1.1
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

import { useRouter } from "next/router";
import { EvaluationResultsPage } from "@features/grading/workspace.entry";
import type { NextPageWithLayout } from "@shared/layouts/get-layout";
// Direct module import: the layouts index would pull every layout into this chunk.
import { withTeacherLayout } from "@shared/layouts/teacher-layout";

const EvaluationResultsRoute: NextPageWithLayout = () => {
  const { query } = useRouter();
  const evaluationId = typeof query.evaluationId === "string" ? query.evaluationId : null;

  return evaluationId ? <EvaluationResultsPage evaluationId={evaluationId} /> : null;
};

EvaluationResultsRoute.getLayout = withTeacherLayout;

export default EvaluationResultsRoute;
