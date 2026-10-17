/*
* Funcionalidad: Admin users route
* Descripción: Thin route for /admin/users: composes the admin layout (ADMIN; RequireRole) with the AdminUsersPage of the admin-console feature, which keeps its filters in the URL. Depends on @features/admin-console and @shared/layouts/admin-layout.
* Versión: 1.0
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

import { AdminUsersPage } from "@features/admin-console";
// Direct module import: the layouts index would pull every layout into this chunk.
import { withAdminLayout } from "@shared/layouts/admin-layout";
import type { NextPageWithLayout } from "@shared/layouts/get-layout";

const AdminUsersRoute: NextPageWithLayout = () => <AdminUsersPage />;

AdminUsersRoute.getLayout = withAdminLayout;

export default AdminUsersRoute;
