/*
* Funcionalidad: /teacher/students route
* Descripción: Thin route for /teacher/students (the students directory of the staff panel; July's /panel/students redirects here): composes the teacher layout (TEACHER, ADMIN; RequireRole + PanelShell) with the lazy StudentsDirectoryPage of the teacher-dashboard feature. Depends on @features/teacher-dashboard and @shared/layouts/teacher-layout.
* Versión: 1.0
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

import { StudentsDirectoryPage } from "@features/teacher-dashboard";
import type { NextPageWithLayout } from "@shared/layouts/get-layout";
// Direct module import: the layouts index would pull every layout into this chunk.
import { withTeacherLayout } from "@shared/layouts/teacher-layout";

const StudentsDirectoryRoute: NextPageWithLayout = () => <StudentsDirectoryPage />;

StudentsDirectoryRoute.getLayout = withTeacherLayout;

export default StudentsDirectoryRoute;
