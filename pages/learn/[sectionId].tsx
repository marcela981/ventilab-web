/*
* Funcionalidad: Learn section route
* Descripción: Thin route for /learn/[sectionId]. v1.1 (W3, Bloque 2): sections are accordions of the Currículo tab, so this page only replaces the URL with /learn?tab=curriculo&section=<sectionId> (client navigation; next.config also redirects the server request through config/legacy-redirects.mjs, but redirects do not apply to client-side navigation). Renders nothing. Depends on next/router, React, @features/learning/learn.entry and @shared/layouts/student-layout.
* Versión: 1.1
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

import { useRouter } from "next/router";
import { useEffect } from "react";
import { buildSectionUrl, parseRouteId } from "@features/learning/learn.entry";
import type { NextPageWithLayout } from "@shared/layouts/get-layout";
// Direct module import: the layouts index would pull every layout into this chunk.
import { withStudentLayout } from "@shared/layouts/student-layout";

const LearnSectionRoute: NextPageWithLayout = () => {
  const router = useRouter();
  const sectionId = parseRouteId(router.query.sectionId);

  useEffect(() => {
    if (sectionId) {
      void router.replace(buildSectionUrl(sectionId));
    }
  }, [sectionId, router]);

  return null;
};

LearnSectionRoute.getLayout = withStudentLayout;

export default LearnSectionRoute;
