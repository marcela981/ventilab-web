/*
* Funcionalidad: Learn section route
* Descripción: Thin route for /learn/[sectionId]: composes the student layout (RequireAuth + AppShell, which waits for router.isReady) with the SectionPage of the learning feature for the sectionId of the URL (levels with progress and locks). Depends on next/router, @features/learning and @shared/layouts/student-layout.
* Versión: 1.0
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

import { useRouter } from "next/router";
import { parseRouteId, SectionPage } from "@features/learning";
import type { NextPageWithLayout } from "@shared/layouts/get-layout";
// Direct module import: the layouts index would pull every layout into this chunk.
import { withStudentLayout } from "@shared/layouts/student-layout";

const LearnSectionRoute: NextPageWithLayout = () => {
  const { query } = useRouter();
  const sectionId = parseRouteId(query.sectionId);

  return sectionId ? <SectionPage sectionId={sectionId} /> : null;
};

LearnSectionRoute.getLayout = withStudentLayout;

export default LearnSectionRoute;
