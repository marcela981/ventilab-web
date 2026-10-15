/*
* Funcionalidad: Grade attempt route
* Descripción: Thin route for /grading/attempts/[attemptId]: composes the teacher layout (RequireRole TEACHER/ADMIN + AppShell, which waits for router.isReady) with the lazy GradeAttemptPage of the grading feature for the attemptId of the URL. Depends on next/router, @features/grading and @shared/layouts/teacher-layout.
* Versión: 1.0
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

import { useRouter } from "next/router";
import { GradeAttemptPage } from "@features/grading";
import type { NextPageWithLayout } from "@shared/layouts/get-layout";
// Direct module import: the layouts index would pull every layout into this chunk.
import { withTeacherLayout } from "@shared/layouts/teacher-layout";

const GradeAttemptRoute: NextPageWithLayout = () => {
  const { query } = useRouter();
  const attemptId = typeof query.attemptId === "string" ? query.attemptId : null;

  return attemptId ? <GradeAttemptPage attemptId={attemptId} /> : null;
};

GradeAttemptRoute.getLayout = withTeacherLayout;

export default GradeAttemptRoute;
