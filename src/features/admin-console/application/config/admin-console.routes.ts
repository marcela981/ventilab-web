/*
* Funcionalidad: Admin console routes
* Descripción: URLs of the admin console pages (/admin/users, /admin/settings with an optional ?category). Kept local because feature barrels are not tree-shaken (precedent: teacher-dashboard.routes.ts). No dependencies.
* Versión: 1.0
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

export const ADMIN_USERS_URL = "/admin/users";
export const ADMIN_SETTINGS_URL = "/admin/settings";

export function buildAdminSettingsUrl(category: string | null): string {
  return category ? `${ADMIN_SETTINGS_URL}?category=${encodeURIComponent(category)}` : ADMIN_SETTINGS_URL;
}
