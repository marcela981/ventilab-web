/*
* Funcionalidad: System status route
* Descripción: Thin route for /admin/status: composes the teacher layout (TEACHER and ADMIN; the backend grants system:status to teachers) with the SystemStatusPage of the admin-console feature, which hides the admin-only probe and telemetry metrics from teachers. Depends on @features/admin-console and @shared/layouts/teacher-layout.
* Versión: 1.0
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

import { SystemStatusPage } from "@features/admin-console";
// Direct module import: the layouts index would pull every layout into this chunk.
import { withTeacherLayout } from "@shared/layouts/teacher-layout";
import type { NextPageWithLayout } from "@shared/layouts/get-layout";

const SystemStatusRoute: NextPageWithLayout = () => <SystemStatusPage />;

SystemStatusRoute.getLayout = withTeacherLayout;

export default SystemStatusRoute;
