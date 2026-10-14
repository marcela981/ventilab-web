/*
* Funcionalidad: Group detail route
* Descripción: Thin route for /groups/[groupId]: composes the teacher layout (RequireRole TEACHER/ADMIN + AppShell, which waits for router.isReady) with the GroupDetailPage of the groups feature for the groupId of the URL. Depends on next/router, @features/groups and @shared/layouts/teacher-layout.
* Versión: 1.0
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

import { useRouter } from "next/router";
import { GroupDetailPage } from "@features/groups";
import type { NextPageWithLayout } from "@shared/layouts/get-layout";
// Direct module import: the layouts index would pull every layout into this chunk.
import { withTeacherLayout } from "@shared/layouts/teacher-layout";

const GroupDetailRoute: NextPageWithLayout = () => {
  const { query } = useRouter();
  const groupId = typeof query.groupId === "string" ? query.groupId : null;

  return groupId ? <GroupDetailPage groupId={groupId} /> : null;
};

GroupDetailRoute.getLayout = withTeacherLayout;

export default GroupDetailRoute;
