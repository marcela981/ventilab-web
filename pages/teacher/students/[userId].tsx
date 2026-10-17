/*
* Funcionalidad: Teacher student detail route
* Descripción: Thin route for /teacher/students/[userId]: composes the teacher layout (TEACHER, ADMIN; RequireRole) with the StudentDetailPage of the teacher-dashboard feature for the userId of the URL (the feature reads the optional ?groupId). Depends on next/router, @features/teacher-dashboard and @shared/layouts/teacher-layout.
* Versión: 1.0
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

import { useRouter } from "next/router";
import { StudentDetailPage } from "@features/teacher-dashboard";
import type { NextPageWithLayout } from "@shared/layouts/get-layout";
// Direct module import: the layouts index would pull every layout into this chunk.
import { withTeacherLayout } from "@shared/layouts/teacher-layout";

const StudentDetailRoute: NextPageWithLayout = () => {
  const { query } = useRouter();
  const userId = typeof query.userId === "string" ? query.userId : null;

  return userId ? <StudentDetailPage key={userId} userId={userId} /> : null;
};

StudentDetailRoute.getLayout = withTeacherLayout;

export default StudentDetailRoute;
