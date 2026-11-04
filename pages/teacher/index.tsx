/*
* Funcionalidad: Teacher dashboard route
* Descripción: Thin route for /teacher: composes the teacher layout (TEACHER, ADMIN; RequireRole) with the TeacherDashboardPage of the teacher-dashboard feature, which reads the selected group from ?groupId. Depends on @features/teacher-dashboard and @shared/layouts/teacher-layout. v1.1 (W2 Bloque 4): renders TeacherWorkspacePage (?tab=general|grupo; General by default, Por grupo with ?groupId and no tab).
* Versión: 1.1
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

import { TeacherWorkspacePage } from "@features/teacher-dashboard";
import type { NextPageWithLayout } from "@shared/layouts/get-layout";
// Direct module import: the layouts index would pull every layout into this chunk.
import { withTeacherLayout } from "@shared/layouts/teacher-layout";

const TeacherDashboardRoute: NextPageWithLayout = () => <TeacherWorkspacePage />;

TeacherDashboardRoute.getLayout = withTeacherLayout;

export default TeacherDashboardRoute;
