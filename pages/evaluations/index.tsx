/*
* Funcionalidad: Evaluations route
* Descripción: Thin route for /evaluations: composes the student layout (RequireAuth + AppShell; every authenticated role may open it) with the EvaluationsListPage of the evaluations feature, which lists the evaluations assigned to the user (GET /api/my-evaluations) by state and type. Depends on @features/evaluations and @shared/layouts/student-layout.
* Versión: 1.0
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

import { EvaluationsListPage } from "@features/evaluations";
import type { NextPageWithLayout } from "@shared/layouts/get-layout";
// Direct module import: the layouts index would pull every layout into this chunk.
import { withStudentLayout } from "@shared/layouts/student-layout";

const EvaluationsRoute: NextPageWithLayout = () => <EvaluationsListPage />;

EvaluationsRoute.getLayout = withStudentLayout;

export default EvaluationsRoute;
