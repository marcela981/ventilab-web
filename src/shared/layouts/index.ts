/*
* Funcionalidad: Layouts public API
* Descripción: Public surface of the new layouts: AppShell, the Public/Student/Teacher/Admin layouts with their getLayout helpers (withXLayout), the navigation config and the per-page layout types/helper. Pages import a layout from here and export it as `getLayout`; `pages/_app.js` imports only ./get-layout to keep the app shell small. v1.1 (T11a): exports the student-only layout. v1.2 (G1 grading): exports the nav-badges registry (NavBadgeProvider, useNavBadgeCounts, useSetNavBadgeCount).
* Versión: 1.2
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
export { NAV_BADGE_KEYS, NavBadgeProvider, useNavBadgeCounts, useSetNavBadgeCount } from "./nav-badges";
export type { NavBadgeCounts, NavBadgeKey, NavBadgeProviderProps } from "./nav-badges";
export { findActiveHref, getNavItems, NAV_ITEMS } from "./nav.config";
export type { NavItem } from "./nav.config";
export { PublicLayout, withPublicLayout } from "./public-layout";
export {
  STUDENT_ONLY_LAYOUT_ROLES,
  StudentLayout,
  StudentOnlyLayout,
  withStudentLayout,
  withStudentOnlyLayout,
} from "./student-layout";
export { TeacherLayout, TEACHER_LAYOUT_ROLES, withTeacherLayout } from "./teacher-layout";
