/*
* Funcionalidad: /teacher/lab route
* Descripción: Thin route for /teacher/lab, the laboratory of the staff panel (DISENO_BLOQUE4 §2.6): composes the teacher layout (TEACHER, ADMIN; RequireRole + PanelShell) with the existing LabReservationsPage of the ventilator-lab feature (the same page as /lab/reservations, without duplicating it). Depends on @features/ventilator-lab and @shared/layouts/teacher-layout.
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
import { withTeacherLayout } from "@shared/layouts/teacher-layout";

const TeacherLabRoute: NextPageWithLayout = () => <LabReservationsPage />;

TeacherLabRoute.getLayout = withTeacherLayout;

export default TeacherLabRoute;
