/*
* Funcionalidad: Lab live console route
* Descripción: Thin route for /lab/live: composes the student layout (RequireAuth + AppShell; every authenticated role may open it, the page shows the console only to whoever the backend lets control the active reservation) with the LabLivePage of the ventilator-lab feature. The console and its adapter are lazy loaded by the page, so this route chunk does not statically include the shared ventilator console. Depends on @features/ventilator-lab and @shared/layouts/student-layout.
* Versión: 1.0
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

import { LabLivePage } from "@features/ventilator-lab";
import type { NextPageWithLayout } from "@shared/layouts/get-layout";
// Direct module import: the layouts index would pull every layout into this chunk.
import { withStudentLayout } from "@shared/layouts/student-layout";

const LabLiveRoute: NextPageWithLayout = () => <LabLivePage />;

LabLiveRoute.getLayout = withStudentLayout;

export default LabLiveRoute;
