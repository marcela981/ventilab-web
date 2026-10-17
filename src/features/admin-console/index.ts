/*
* Funcionalidad: Admin console feature barrel
* Descripción: Public surface of the admin console (ADMIN): the lazy AdminUsersPage (/admin/users: users search and filters in the URL, role change with its effects, account activation) and AdminSettingsPage (/admin/settings: platform settings per category with forms generated from their metadata, provider chain editor, version conflicts and the ventilator commands double confirmation) plus their URLs. The only import surface for the thin pages and other features. Depends on the admin console lazy pages and routes.
* Versión: 1.0
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

export { ADMIN_SETTINGS_URL, ADMIN_USERS_URL, buildAdminSettingsUrl } from "./application/config/admin-console.routes";
export { AdminSettingsPage, AdminUsersPage } from "./application/pages/lazy-admin-console-pages";
