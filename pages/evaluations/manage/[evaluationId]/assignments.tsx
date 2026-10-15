/*
* Funcionalidad: Evaluation assignments route
* Descripción: Thin route for /evaluations/manage/[evaluationId]/assignments: reads the evaluation id from the router and composes the teacher layout (staff only: teachers and admins) with the EvaluationAssignmentsPage of the evaluation-authoring feature (activate for groups, list, close now). Renders nothing until the id is available. Depends on next/router, @features/evaluation-authoring and @shared/layouts/teacher-layout.
* Versión: 1.0
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

import { useRouter } from "next/router";
import { EvaluationAssignmentsPage } from "@features/evaluation-authoring";
import type { NextPageWithLayout } from "@shared/layouts/get-layout";
// Direct module import: the layouts index would pull every layout into this chunk.
import { withTeacherLayout } from "@shared/layouts/teacher-layout";

const EvaluationAssignmentsRoute: NextPageWithLayout = () => {
  const { query } = useRouter();
  const evaluationId = typeof query.evaluationId === "string" ? query.evaluationId : null;

  return evaluationId ? <EvaluationAssignmentsPage key={evaluationId} evaluationId={evaluationId} /> : null;
};

EvaluationAssignmentsRoute.getLayout = withTeacherLayout;

export default EvaluationAssignmentsRoute;
