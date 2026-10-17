/*
* Funcionalidad: Lab reservations route
* Descripción: Thin route for /lab/reservations: composes the student layout (RequireAuth + AppShell; every authenticated role may book the ventilator lab) with the LabReservationsPage of the ventilator-lab feature (week/day calendar in Bogota time and the create reservation dialog). Depends on @features/ventilator-lab and @shared/layouts/student-layout.
* Versión: 1.0
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

import { LabReservationsPage } from "@features/ventilator-lab";
import type { NextPageWithLayout } from "@shared/layouts/get-layout";
// Direct module import: the layouts index would pull every layout into this chunk.
import { withStudentLayout } from "@shared/layouts/student-layout";

const LabReservationsRoute: NextPageWithLayout = () => <LabReservationsPage />;

LabReservationsRoute.getLayout = withStudentLayout;

export default LabReservationsRoute;
