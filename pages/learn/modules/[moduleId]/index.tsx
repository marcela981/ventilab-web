/*
* Funcionalidad: Learn module route
* Descripción: Thin route for /learn/modules/[moduleId]: composes the student layout (RequireAuth + AppShell, which waits for router.isReady) with the ModulePage of the learning feature for the moduleId of the URL (progress, lessons, continue link, lock screen). Depends on next/router, @features/learning and @shared/layouts/student-layout.
* Versión: 1.0
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

import { useRouter } from "next/router";
import { ModulePage, parseRouteId } from "@features/learning";
import type { NextPageWithLayout } from "@shared/layouts/get-layout";
// Direct module import: the layouts index would pull every layout into this chunk.
import { withStudentLayout } from "@shared/layouts/student-layout";

const LearnModuleRoute: NextPageWithLayout = () => {
  const { query } = useRouter();
  const moduleId = parseRouteId(query.moduleId);

  return moduleId ? <ModulePage moduleId={moduleId} /> : null;
};

LearnModuleRoute.getLayout = withStudentLayout;

export default LearnModuleRoute;
