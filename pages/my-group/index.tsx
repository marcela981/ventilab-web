/*
* Funcionalidad: My group route
* Descripción: Thin route for /my-group: composes the student-only layout (RequireRole STUDENT + AppShell; other roles go to their landing route) with the MyGroupPage of the groups feature, which reads the student's own group from the backend (GET /api/groups/mine). Depends on @features/groups and @shared/layouts/student-layout.
* Versión: 1.0
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

import { MyGroupPage } from "@features/groups";
import type { NextPageWithLayout } from "@shared/layouts/get-layout";
// Direct module import: the layouts index would pull every layout into this chunk.
import { withStudentOnlyLayout } from "@shared/layouts/student-layout";

const MyGroupRoute: NextPageWithLayout = () => <MyGroupPage />;

MyGroupRoute.getLayout = withStudentOnlyLayout;

export default MyGroupRoute;
