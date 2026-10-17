/*
* Funcionalidad: Legacy route redirects (O6)
* Descripción: Server-side redirects of the legacy staff panel to the migrated screens, for getServerSideProps of the legacy pages: /panel → /teacher, /panel/students → /teacher, /panel/students/[id] → /teacher/students/[id] (the student's user id), /panel/admin → /admin/users, /panel/settings → /admin/settings. Temporary redirects (permanent: false), like the other legacy redirects of the migration, so the targets can still change before delivery. The destination keeps no query string. Depends on the session route table types.
* Versión: 1.0
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

import type { RoutePath } from "./routes.config";

export const LEGACY_PANEL_REDIRECTS = {
  "/panel": "/teacher",
  "/panel/students": "/teacher",
  "/panel/admin": "/admin/users",
  "/panel/settings": "/admin/settings",
} as const satisfies Partial<Record<RoutePath, RoutePath>>;

export type LegacyPanelRoute = keyof typeof LEGACY_PANEL_REDIRECTS;

export type LegacyRedirectResult = { redirect: { destination: string, permanent: false } };

export function legacyPanelRedirect(from: LegacyPanelRoute): LegacyRedirectResult {
  return { redirect: { destination: LEGACY_PANEL_REDIRECTS[from], permanent: false } };
}

// /panel/students/[id] → /teacher/students/[id]; a missing or repeated id falls back to /teacher.
export function legacyStudentDetailRedirect(id: unknown): LegacyRedirectResult {
  const destination = typeof id === "string" && id !== "" ? `/teacher/students/${encodeURIComponent(id)}` : "/teacher";

  return { redirect: { destination, permanent: false } };
}
