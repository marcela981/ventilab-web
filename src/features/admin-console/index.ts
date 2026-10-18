/*
* Funcionalidad: Admin console feature barrel
* Descripción: Public surface of the admin console (ADMIN): the lazy AdminUsersPage (/admin/users: users search and filters in the URL, role change with its effects, account activation) and AdminSettingsPage (/admin/settings: platform settings per category with forms generated from their metadata, provider chain editor, version conflicts and the ventilator commands double confirmation) plus their URLs. v1.1 (O4b): AdminAuditPage (/admin/audit), AdminAiAnalyticsPage (/admin/ai), AdminResearchPage (/admin/research) and SystemStatusPage (/admin/status, TEACHER and ADMIN) with their URLs. v1.2 (B3.10): the route constants (admin-console.routes.ts) are removed: no page or feature imported them (the navigation keeps its own route table). The only import surface for the thin pages and other features. Depends on the admin console lazy pages.
* Versión: 1.2
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

export {
  AdminAiAnalyticsPage,
  AdminAuditPage,
  AdminResearchPage,
  AdminSettingsPage,
  AdminUsersPage,
  SystemStatusPage,
} from "./application/pages/lazy-admin-console-pages";
