/*
* Funcionalidad: Access denied route
* Descripción: Thin route for /auth/access-denied: composes the public layout (no session guard, the page is public and reads the session itself) with the AccessDeniedPage of the auth feature. Replaces the legacy MUI `sx` page rendered without the shell (B3.7). Depends on @features/auth and @shared/layouts/public-layout. v1.1 (Bloque 5, D5): uses withAuthLayout (July brand background and light card island of the /auth/* pages).
* Versión: 1.1
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

import { AccessDeniedPage } from "@features/auth";
import type { NextPageWithLayout } from "@shared/layouts/get-layout";
// Direct module import: the layouts index would pull the AppShell into this chunk.
import { withAuthLayout } from "@shared/layouts/public-layout";

const AccessDeniedRoute: NextPageWithLayout = () => <AccessDeniedPage />;

AccessDeniedRoute.getLayout = withAuthLayout;

export default AccessDeniedRoute;
