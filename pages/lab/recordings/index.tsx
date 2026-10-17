/*
* Funcionalidad: Lab recordings route
* Descripción: Thin route for /lab/recordings: composes the student layout (RequireAuth + AppShell; every authenticated role may open it, the page lists only what the backend lets each role read) with the LabRecordingsPage of the ventilator-lab feature. Depends on @features/ventilator-lab and @shared/layouts/student-layout.
* Versión: 1.0
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

import { LabRecordingsPage } from "@features/ventilator-lab";
import type { NextPageWithLayout } from "@shared/layouts/get-layout";
// Direct module import: the layouts index would pull every layout into this chunk.
import { withStudentLayout } from "@shared/layouts/student-layout";

const LabRecordingsRoute: NextPageWithLayout = () => <LabRecordingsPage />;

LabRecordingsRoute.getLayout = withStudentLayout;

export default LabRecordingsRoute;
