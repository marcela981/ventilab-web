/*
* Funcionalidad: Forgot password route
* Descripción: Thin route for /auth/forgot-password: composes the public layout (no session guard) with the informational ForgotPasswordPage of the auth feature. Replaces the legacy MUI `sx` page rendered without the shell (B3.7). Depends on @features/auth and @shared/layouts/public-layout.
* Versión: 1.0
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

import { ForgotPasswordPage } from "@features/auth";
import type { NextPageWithLayout } from "@shared/layouts/get-layout";
// Direct module import: the layouts index would pull the AppShell into this chunk.
import { withPublicLayout } from "@shared/layouts/public-layout";

const ForgotPasswordRoute: NextPageWithLayout = () => <ForgotPasswordPage />;

ForgotPasswordRoute.getLayout = withPublicLayout;

export default ForgotPasswordRoute;
