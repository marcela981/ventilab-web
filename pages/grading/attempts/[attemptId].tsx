/*
* Funcionalidad: Grading attempt resolver route
* Descripción: Thin route for /grading/attempts/[attemptId] (teacher layout): the review of one attempt lives in the unified grading screen of its evaluation (Bloque 3, W5), so this route renders the GradingAttemptResolver, which reads the attempt and replaces the route with /grading/evaluations/<evaluationId>?attempt=<attemptId>. Old links and the teacher dashboard keep working. Depends on the grading workspace entry point and the teacher layout. v1.1 (Bloque 3, W5): resolver.
* Versión: 1.1
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

import { useRouter } from "next/router";
import { GradingAttemptResolver } from "@features/grading/workspace.entry";
import type { NextPageWithLayout } from "@shared/layouts/get-layout";
// Direct module import: the layouts index would pull every layout into this chunk.
import { withTeacherLayout } from "@shared/layouts/teacher-layout";

const GradingAttemptRoute: NextPageWithLayout = () => {
  const { query } = useRouter();
  const attemptId = typeof query.attemptId === "string" ? query.attemptId : null;

  return attemptId ? <GradingAttemptResolver key={attemptId} attemptId={attemptId} /> : null;
};

GradingAttemptRoute.getLayout = withTeacherLayout;

export default GradingAttemptRoute;
