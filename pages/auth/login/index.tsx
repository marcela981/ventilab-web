/*
* Funcionalidad: Login route
* Descripción: Thin route for /auth/login: composes the public layout (no session guard, login is public) with the LoginPage of the auth feature, which signs in against the backend (local and Google) and redirects an authenticated user. Replaces the legacy NextAuth credentials login page (T9). Depends on @features/auth and @shared/layouts/public-layout.
* Versión: 1.0
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

import { LoginPage } from "@features/auth";
import type { NextPageWithLayout } from "@shared/layouts/get-layout";
// Direct module import: the layouts index would pull the AppShell into the login chunk.
import { withPublicLayout } from "@shared/layouts/public-layout";

const LoginRoute: NextPageWithLayout = () => <LoginPage />;

LoginRoute.getLayout = withPublicLayout;

export default LoginRoute;
