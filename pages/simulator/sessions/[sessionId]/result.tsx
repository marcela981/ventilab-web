/*
* Funcionalidad: Simulation session result route
* Descripción: Thin route for /simulator/sessions/[sessionId]/result: composes the student layout (RequireAuth + AppShell,
*   which waits for router.isReady; every authenticated role, the backend enforces who may read the session) with the
*   SessionResultPage of the simulator feature for the sessionId of the URL. Depends on next/router,
*   @features/simulator and @shared/layouts/student-layout.
*   v1.1 (W4, Bloque 1): imports the page from @features/simulator/result.entry instead of the feature barrel, so the
*   route chunk carries only its own area.
* Versión: 1.1
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

import { useRouter } from "next/router";
import { SessionResultPage } from "@features/simulator/result.entry";
import type { NextPageWithLayout } from "@shared/layouts/get-layout";
// Direct module import: the layouts index would pull every layout into this chunk.
import { withStudentLayout } from "@shared/layouts/student-layout";

const SimulationSessionResultRoute: NextPageWithLayout = () => {
  const { query } = useRouter();
  const sessionId = typeof query.sessionId === "string" ? query.sessionId : null;

  return sessionId ? <SessionResultPage key={sessionId} sessionId={sessionId} /> : null;
};

SimulationSessionResultRoute.getLayout = withStudentLayout;

export default SimulationSessionResultRoute;
