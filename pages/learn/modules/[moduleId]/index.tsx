/*
* Funcionalidad: Learn module route
* Descripción: Thin route for /learn/modules/[moduleId]: composes the student layout (RequireAuth + AppShell, which waits for router.isReady) with the ModuleResumeResolver of the learning feature for the moduleId of the URL. v1.2 (W3, Bloque 2): the module page is a resolver (replaces the URL with the lesson page where the module continues, or shows the lock screen); ?completed=1 is gone; imports the module entry point instead of the feature barrel. Depends on next/router, @features/learning/module.entry and @shared/layouts/student-layout.
* Versión: 1.2
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

import { useRouter } from "next/router";
import { ModuleResumeResolver, parseRouteId } from "@features/learning/module.entry";
import type { NextPageWithLayout } from "@shared/layouts/get-layout";
// Direct module import: the layouts index would pull every layout into this chunk.
import { withStudentLayout } from "@shared/layouts/student-layout";

const LearnModuleRoute: NextPageWithLayout = () => {
  const { query } = useRouter();
  const moduleId = parseRouteId(query.moduleId);

  // Keyed by module: a client navigation to another module resolves from scratch.
  return moduleId ? <ModuleResumeResolver key={moduleId} moduleId={moduleId} /> : null;
};

LearnModuleRoute.getLayout = withStudentLayout;

export default LearnModuleRoute;
