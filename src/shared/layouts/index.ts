/*
* Funcionalidad: Layouts public API
* Descripción: Public surface of the new layouts: AppShell, the Public/Student/Teacher/Admin layouts with their getLayout helpers (withXLayout), the navigation config and the per-page layout types/helper. Pages import a layout from here and export it as `getLayout`; `pages/_app.js` imports only ./get-layout to keep the app shell small.
* Versión: 1.0
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

export { AdminLayout, ADMIN_LAYOUT_ROLES, withAdminLayout } from "./admin-layout";
export { AppShell } from "./app-shell";
export type { AppShellProps } from "./app-shell";
export { resolvePageLayout } from "./get-layout";
export type { LayoutProps, NextPageWithLayout, PageLayout } from "./get-layout";
export { findActiveHref, getNavItems, NAV_ITEMS } from "./nav.config";
export type { NavItem } from "./nav.config";
export { PublicLayout, withPublicLayout } from "./public-layout";
export { StudentLayout, withStudentLayout } from "./student-layout";
export { TeacherLayout, TEACHER_LAYOUT_ROLES, withTeacherLayout } from "./teacher-layout";
