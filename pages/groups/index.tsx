/*
* Funcionalidad: Groups route
* Descripción: Thin route for /groups: composes the teacher layout (RequireRole TEACHER/ADMIN + AppShell) with the GroupsPage of the groups feature, which lists the groups the backend returns for the user (GET /api/groups) with client-side filters and pagination. Depends on @features/groups and @shared/layouts/teacher-layout.
* Versión: 1.0
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

import { GroupsPage } from "@features/groups";
import type { NextPageWithLayout } from "@shared/layouts/get-layout";
// Direct module import: the layouts index would pull every layout into this chunk.
import { withTeacherLayout } from "@shared/layouts/teacher-layout";

const GroupsRoute: NextPageWithLayout = () => <GroupsPage />;

GroupsRoute.getLayout = withTeacherLayout;

export default GroupsRoute;
