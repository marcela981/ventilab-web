/*
 * Funcionalidad: Legacy /dashboard redirect
 * Descripción: Client redirect of /dashboard (the students' former "Inicio" and default route). v1.1 (T12
 *   ventilator-lab): target changed from /simulador to /lab, where /simulador now redirects (avoids a double
 *   redirect; the destination is the same). v2.0 (O6 operation): role-aware like /: once the backend session is
 *   known it goes to the home of the role (STUDENT /me, TEACHER and ADMIN /teacher) or to the login page
 *   (RoleHomeRedirect of @shared/session), so old student bookmarks land on /me. Bare layout (getLayout): no legacy shell around a redirect.
 * Versión: 2.0
 * Autor: Marcela Mazo Castro
 * Proyecto: VentyLab
 * Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria
 *        que integre un sistema de retroalimentación usando modelos de lenguaje
 * Institución: Universidad del Valle
 * Contacto: marcela.mazo@correounivalle.edu.co
 */
import { RoleHomeRedirect } from '@shared/session/role-home-redirect';

export default function DashboardRedirect() {
  return <RoleHomeRedirect />;
}

// Bare layout: only the redirect, without the legacy shell.
DashboardRedirect.getLayout = (page) => page;
