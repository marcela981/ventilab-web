/*
* Funcionalidad: Access denied route
* Descripción: Thin route for /auth/access-denied: composes the public layout (no session guard, the page is public and reads the session itself) with the AccessDeniedPage of the auth feature. Replaces the legacy MUI `sx` page rendered without the shell (B3.7). Depends on @features/auth and @shared/layouts/public-layout.
* Versión: 1.0
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

import { AccessDeniedPage } from "@features/auth";
import type { NextPageWithLayout } from "@shared/layouts/get-layout";
// Direct module import: the layouts index would pull the AppShell into this chunk.
import { withPublicLayout } from "@shared/layouts/public-layout";

const AccessDeniedRoute: NextPageWithLayout = () => <AccessDeniedPage />;

AccessDeniedRoute.getLayout = withPublicLayout;

export default AccessDeniedRoute;
