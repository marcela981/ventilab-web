/*
* Funcionalidad: Simulation session replay route
* Descripción: Thin route for /simulator/sessions/[sessionId]/replay: composes the student layout (RequireAuth + AppShell,
*   which waits for router.isReady; every authenticated role, the backend validates replay access) with the
*   SessionReplayPage of the simulator feature for the sessionId of the URL. Depends on next/router,
*   @features/simulator and @shared/layouts/student-layout.
* Versión: 1.0
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

import { useRouter } from "next/router";
import { SessionReplayPage } from "@features/simulator";
import type { NextPageWithLayout } from "@shared/layouts/get-layout";
// Direct module import: the layouts index would pull every layout into this chunk.
import { withStudentLayout } from "@shared/layouts/student-layout";

const SimulationSessionReplayRoute: NextPageWithLayout = () => {
  const { query } = useRouter();
  const sessionId = typeof query.sessionId === "string" ? query.sessionId : null;

  return sessionId ? <SessionReplayPage key={sessionId} sessionId={sessionId} /> : null;
};

SimulationSessionReplayRoute.getLayout = withStudentLayout;

export default SimulationSessionReplayRoute;
