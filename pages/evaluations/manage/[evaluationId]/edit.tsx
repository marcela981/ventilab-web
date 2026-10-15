/*
* Funcionalidad: Edit evaluation route
* Descripción: Thin route for /evaluations/manage/[evaluationId]/edit: reads the evaluation id from the router and composes the teacher layout (staff only: teachers and admins) with the EvaluationBuilderPage of the evaluation-authoring feature (GET /api/evaluations/{id} plus the builder mutations). Renders nothing until the id is available. Depends on next/router, @features/evaluation-authoring and @shared/layouts/teacher-layout.
* Versión: 1.0
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

import { useRouter } from "next/router";
import { EvaluationBuilderPage } from "@features/evaluation-authoring";
import type { NextPageWithLayout } from "@shared/layouts/get-layout";
// Direct module import: the layouts index would pull every layout into this chunk.
import { withTeacherLayout } from "@shared/layouts/teacher-layout";

const EditEvaluationRoute: NextPageWithLayout = () => {
  const { query } = useRouter();
  const evaluationId = typeof query.evaluationId === "string" ? query.evaluationId : null;

  // A different id remounts the builder, so no draft leaks between evaluations.
  return evaluationId ? <EvaluationBuilderPage key={evaluationId} evaluationId={evaluationId} /> : null;
};

EditEvaluationRoute.getLayout = withTeacherLayout;

export default EditEvaluationRoute;
