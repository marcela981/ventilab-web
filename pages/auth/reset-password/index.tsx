/*
* Funcionalidad: Reset password route
* Descripción: Thin route for /auth/reset-password?token= (the link of the password recovery email, Ajustes D3): composes the auth layout (no session guard) with the ResetPasswordPage of the auth feature. Depends on @features/auth and @shared/layouts/public-layout.
* Versión: 1.0
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

import { ResetPasswordPage } from "@features/auth";
import type { NextPageWithLayout } from "@shared/layouts/get-layout";
// Direct module import: the layouts index would pull the AppShell into this chunk.
import { withAuthLayout } from "@shared/layouts/public-layout";

const ResetPasswordRoute: NextPageWithLayout = () => <ResetPasswordPage />;

ResetPasswordRoute.getLayout = withAuthLayout;

export default ResetPasswordRoute;
