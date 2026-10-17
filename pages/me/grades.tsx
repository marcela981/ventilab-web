/*
* Funcionalidad: My grades route
* Descripción: Thin route for /me/grades: composes the student-only layout (STUDENT; RequireRole) with the MyGradesPage of the student-space feature (GET /api/my-evaluations/grades). Depends on @features/student-space and @shared/layouts/student-layout.
* Versión: 1.0
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

import { MyGradesPage } from "@features/student-space";
import type { NextPageWithLayout } from "@shared/layouts/get-layout";
// Direct module import: the layouts index would pull every layout into this chunk.
import { withStudentOnlyLayout } from "@shared/layouts/student-layout";

const MyGradesRoute: NextPageWithLayout = () => <MyGradesPage />;

MyGradesRoute.getLayout = withStudentOnlyLayout;

export default MyGradesRoute;
