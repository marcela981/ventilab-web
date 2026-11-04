/*
* Funcionalidad: Simulation session console route
* Descripción: Thin route for /simulator/sessions/[sessionId]: composes the student layout (RequireAuth + AppShell,
*   which waits for router.isReady; every authenticated role may run a session it owns, the backend enforces
*   ownership) with the SessionConsolePage of the simulator feature for the sessionId of the URL. Depends on
*   next/router, @features/simulator and @shared/layouts/student-layout.
*   v1.1 (W4, Bloque 1): imports the page from @features/simulator/session.entry instead of the feature barrel, so the
*   route chunk carries only its own area.
*   v1.2 (Bloque 5, C6): passes the signed-in user's value cards preference (simulator-workspace monitor-cards entry)
*   to the July console, so EXAM applies it read-only.
* Versión: 1.2
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

import { useRouter } from "next/router";
import { SessionConsolePage } from "@features/simulator/session.entry";
import { useMonitorCardsPref } from "@features/simulator-workspace/monitor-cards.entry";
import type { NextPageWithLayout } from "@shared/layouts/get-layout";
// Direct module import: the layouts index would pull every layout into this chunk.
import { withStudentLayout } from "@shared/layouts/student-layout";
import { useSession } from "@shared/session/use-session";

const SimulationSessionRoute: NextPageWithLayout = () => {
  const { query } = useRouter();
  const sessionId = typeof query.sessionId === "string" ? query.sessionId : null;
  const { user } = useSession();
  const cards = useMonitorCardsPref(user?.id);

  return sessionId ? <SessionConsolePage key={sessionId} sessionId={sessionId} cards={cards} /> : null;
};

SimulationSessionRoute.getLayout = withStudentLayout;

export default SimulationSessionRoute;
