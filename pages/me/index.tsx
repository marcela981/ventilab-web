/*
* Funcionalidad: Student home route
* Descripción: Thin route for /me: composes the student-only layout (STUDENT; RequireRole) with the StudentHomePage of the student-space feature (GET /api/me/summary). Depends on @features/student-space and @shared/layouts/student-layout.
* Versión: 1.0
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

import { StudentHomePage } from "@features/student-space";
import type { NextPageWithLayout } from "@shared/layouts/get-layout";
// Direct module import: the layouts index would pull every layout into this chunk.
import { withStudentOnlyLayout } from "@shared/layouts/student-layout";

const StudentHomeRoute: NextPageWithLayout = () => <StudentHomePage />;

StudentHomeRoute.getLayout = withStudentOnlyLayout;

export default StudentHomeRoute;
