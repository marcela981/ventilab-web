/*
* Funcionalidad: Learn lesson page route
* Descripción: Thin route for /learn/modules/[moduleId]/lessons/[lessonId]/[pageNumber]: composes the student layout (RequireAuth + AppShell, which waits for router.isReady) with the LessonViewerPage of the learning feature. The raw [pageNumber] segment is passed through so the viewer can redirect an invalid or out-of-range value. Depends on next/router, @features/learning and @shared/layouts/student-layout.
* Versión: 1.0
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

import { useRouter } from "next/router";
import { LessonViewerPage, parseRouteId } from "@features/learning";
import type { NextPageWithLayout } from "@shared/layouts/get-layout";
// Direct module import: the layouts index would pull every layout into this chunk.
import { withStudentLayout } from "@shared/layouts/student-layout";

const LearnLessonPageRoute: NextPageWithLayout = () => {
  const { query } = useRouter();
  const moduleId = parseRouteId(query.moduleId);
  const lessonId = parseRouteId(query.lessonId);
  const pageParam = typeof query.pageNumber === "string" ? query.pageNumber : null;

  return moduleId && lessonId ? <LessonViewerPage moduleId={moduleId} lessonId={lessonId} pageParam={pageParam} /> : null;
};

LearnLessonPageRoute.getLayout = withStudentLayout;

export default LearnLessonPageRoute;
