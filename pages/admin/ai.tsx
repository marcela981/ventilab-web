/*
* Funcionalidad: Admin AI analytics route
* Descripción: Thin route for /admin/ai: composes the admin layout (ADMIN; RequireRole) with the AdminAiAnalyticsPage of the admin-console feature, which keeps its filters in the URL. Depends on @features/admin-console and @shared/layouts/admin-layout.
* Versión: 1.0
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

import { AdminAiAnalyticsPage } from "@features/admin-console";
// Direct module import: the layouts index would pull every layout into this chunk.
import { withAdminLayout } from "@shared/layouts/admin-layout";
import type { NextPageWithLayout } from "@shared/layouts/get-layout";

const AdminAiRoute: NextPageWithLayout = () => <AdminAiAnalyticsPage />;

AdminAiRoute.getLayout = withAdminLayout;

export default AdminAiRoute;
