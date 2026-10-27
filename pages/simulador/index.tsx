/*
* Funcionalidad: Simulator workspace route
* Descripción: Thin route for /simulador, the unified simulator workspace and the home of every role (W1, Bloque 1): composes the student layout (RequireAuth + AppShell; every authenticated role) with the SimulatorWorkspacePage of the simulator-workspace feature, which reads `?tab=simular | monitoreo | conexion | sesiones`. The old /simulator, /lab and /lab/live pages are gone; next.config redirects those URLs here with their tab. Depends on @features/simulator-workspace and @shared/layouts/student-layout.
* Versión: 0.1
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

import { SimulatorWorkspacePage } from "@features/simulator-workspace";
import type { NextPageWithLayout } from "@shared/layouts/get-layout";
// Direct module import: the layouts index would pull every layout into this chunk.
import { withStudentLayout } from "@shared/layouts/student-layout";

const SimulatorWorkspaceRoute: NextPageWithLayout = () => <SimulatorWorkspacePage />;

SimulatorWorkspaceRoute.getLayout = withStudentLayout;

export default SimulatorWorkspaceRoute;
