/*
* Funcionalidad: Notifications route
* Descripción: Thin route for /notifications: composes the student layout (any authenticated role; RequireAuth) with the NotificationsPage of the notifications feature (GET /api/notifications). Depends on @features/notifications and @shared/layouts/student-layout.
* Versión: 1.0
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

import { NotificationsPage } from "@features/notifications";
import type { NextPageWithLayout } from "@shared/layouts/get-layout";
// Direct module import: the layouts index would pull every layout into this chunk.
import { withStudentLayout } from "@shared/layouts/student-layout";

const NotificationsRoute: NextPageWithLayout = () => <NotificationsPage />;

NotificationsRoute.getLayout = withStudentLayout;

export default NotificationsRoute;
