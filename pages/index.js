/*
 * Funcionalidad: Home page (/)
 * Descripción: Role-aware entry of the app. v2.0 (O5 operation): waits for the backend session (@shared/session) and
 *   then replaces the URL with the home of the role (STUDENT /me, TEACHER and ADMIN /teacher, DEFAULT_ROUTE_BY_ROLE),
 *   or with the login page when there is no session (RoleHomeRedirect). Before v2.0 it replaced the URL with /dashboard
 *   for everyone and relied on the middleware for the login. Bare layout (getLayout): no legacy shell around a redirect. v2.1 (B5): document title "VentyLab" (APP_NAME) while the redirect runs.
 * Versión: 2.1
 * Autor: Marcela Mazo Castro
 * Proyecto: VentyLab
 * Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria
 *        que integre un sistema de retroalimentación usando modelos de lenguaje
 * Institución: Universidad del Valle
 * Contacto: marcela.mazo@correounivalle.edu.co
 */
import Head from 'next/head';
import { APP_NAME } from '@shared/lib/page-title';
import { RoleHomeRedirect } from '@shared/session/role-home-redirect';

export default function Home() {
  return (
    <>
      <Head>
        <title>{APP_NAME}</title>
      </Head>
      <RoleHomeRedirect />
    </>
  );
}

// Bare layout: only the redirect, without the legacy shell.
Home.getLayout = (page) => page;
