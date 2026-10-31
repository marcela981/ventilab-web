/*
* Funcionalidad: Evaluations manage redirect
* Descripción: The authoring list is the Gestionar tab of the staff evaluation hub (Bloque 3, W5): this thin route replaces /evaluations/manage with /evaluations?tab=gestionar on client navigations; full loads are redirected by next.config (config/legacy-redirects.mjs), which does not apply to client navigations. Depends on the staff hub entry point and the teacher layout. v1.1 (Bloque 3, W5): redirect only.
* Versión: 1.0
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

import { useRouter } from "next/router";
import { useEffect } from "react";
import { staffHubUrl } from "@features/evaluation-authoring/staff-hub.entry";
import type { NextPageWithLayout } from "@shared/layouts/get-layout";
// Direct module import: the layouts index would pull every layout into this chunk.
import { withTeacherLayout } from "@shared/layouts/teacher-layout";

const EvaluationsManageRedirect: NextPageWithLayout = () => {
  const router = useRouter();
  const destination = router.isReady ? staffHubUrl("gestionar") : null;

  useEffect(() => {
    if (destination) {
      void router.replace(destination);
    }
  }, [destination, router]);

  return null;
};

EvaluationsManageRedirect.getLayout = withTeacherLayout;

export default EvaluationsManageRedirect;
