/*
* Funcionalidad: Lab route
* Descripción: Thin route for /lab: composes the student layout (RequireAuth + AppShell; every authenticated role may book and use the ventilator lab) with the LabHomePage of the ventilator-lab feature (device status, active reservation with the console entry, upcoming reservations). Depends on @features/ventilator-lab and @shared/layouts/student-layout.
* Versión: 1.0
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

import { LabHomePage } from "@features/ventilator-lab";
import type { NextPageWithLayout } from "@shared/layouts/get-layout";
// Direct module import: the layouts index would pull every layout into this chunk.
import { withStudentLayout } from "@shared/layouts/student-layout";

const LabRoute: NextPageWithLayout = () => <LabHomePage />;

LabRoute.getLayout = withStudentLayout;

export default LabRoute;
