/*
* Funcionalidad: Login route
* Descripción: Thin route for /auth/login: composes the public layout (no session guard, login is public) with the LoginPage of the auth feature, which signs in against the backend (local and Google) and redirects an authenticated user. Replaces the legacy NextAuth credentials login page (T9). Depends on @features/auth and @shared/layouts/public-layout. v1.1 (Bloque 5, D5): uses withAuthLayout (July brand background and light card island of the /auth/* pages).
* Versión: 1.1
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

import { LoginPage } from "@features/auth";
import type { NextPageWithLayout } from "@shared/layouts/get-layout";
// Direct module import: the layouts index would pull the AppShell into the login chunk.
import { withAuthLayout } from "@shared/layouts/public-layout";

const LoginRoute: NextPageWithLayout = () => <LoginPage />;

LoginRoute.getLayout = withAuthLayout;

export default LoginRoute;
