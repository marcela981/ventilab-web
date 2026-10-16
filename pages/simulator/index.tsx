/*
* Funcionalidad: Simulator route
* Descripción: Thin route for /simulator: composes the student layout (RequireAuth + AppShell; every authenticated role may practice) with the SimulatorCatalogPage of the simulator feature, which lists the published clinical cases with filters, starts a FREE practice and shows "Mis sesiones". Depends on @features/simulator and @shared/layouts/student-layout.
* Versión: 1.0
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

import { SimulatorCatalogPage } from "@features/simulator";
import type { NextPageWithLayout } from "@shared/layouts/get-layout";
// Direct module import: the layouts index would pull every layout into this chunk.
import { withStudentLayout } from "@shared/layouts/student-layout";

const SimulatorRoute: NextPageWithLayout = () => <SimulatorCatalogPage />;

SimulatorRoute.getLayout = withStudentLayout;

export default SimulatorRoute;
