/*
* Funcionalidad: Register route
* Descripción: Thin route for /auth/register: composes the public layout (no session guard, registration is public) with the RegisterPage of the auth feature, which creates the student account against the backend (`POST /api/auth/register`), signs in and redirects. Replaces the legacy NextAuth registration page (B3.4, D4). Depends on @features/auth and @shared/layouts/public-layout. v1.1 (Bloque 5, D5): uses withAuthLayout (July brand background and light card island of the /auth/* pages).
* Versión: 1.1
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

import { RegisterPage } from "@features/auth";
import type { NextPageWithLayout } from "@shared/layouts/get-layout";
// Direct module import: the layouts index would pull the AppShell into the register chunk.
import { withAuthLayout } from "@shared/layouts/public-layout";

const RegisterRoute: NextPageWithLayout = () => <RegisterPage />;

RegisterRoute.getLayout = withAuthLayout;

export default RegisterRoute;
