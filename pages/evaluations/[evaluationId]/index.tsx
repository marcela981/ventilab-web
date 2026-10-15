/*
* Funcionalidad: Evaluation intro route
* Descripción: Thin route for /evaluations/[evaluationId]: composes the student layout (RequireAuth + AppShell, which waits for router.isReady; every authenticated role may open it) with the EvaluationIntroPage of the evaluations feature for the evaluationId of the URL. Depends on next/router, @features/evaluations and @shared/layouts/student-layout.
* Versión: 1.0
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

import { useRouter } from "next/router";
import { EvaluationIntroPage } from "@features/evaluations";
import type { NextPageWithLayout } from "@shared/layouts/get-layout";
// Direct module import: the layouts index would pull every layout into this chunk.
import { withStudentLayout } from "@shared/layouts/student-layout";

const EvaluationIntroRoute: NextPageWithLayout = () => {
  const { query } = useRouter();
  const evaluationId = typeof query.evaluationId === "string" ? query.evaluationId : null;

  return evaluationId ? <EvaluationIntroPage evaluationId={evaluationId} /> : null;
};

EvaluationIntroRoute.getLayout = withStudentLayout;

export default EvaluationIntroRoute;
