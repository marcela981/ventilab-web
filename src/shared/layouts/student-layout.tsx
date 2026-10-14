/*
* Funcionalidad: StudentLayout
* Descripción: Layout for learner pages: AppShell inside RequireAuth. The student routes of routes.config (/dashboard, /profile, /teaching, ...) declare no role restriction (any authenticated role), so this layout only requires a backend session; the navigation itself is filtered by the user's role. withStudentLayout is the getLayout helper for pages. v1.1 (T11a): StudentOnlyLayout / withStudentOnlyLayout for student-only pages (RequireRole with the roles of `/my-group` in routes.config; other roles go to their landing route). Depends on @shared/session and AppShell.
* Versión: 1.1
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

import type { ReactElement, ReactNode } from "react";
import { RequireAuth } from "@shared/session/require-auth";
import { RequireRole } from "@shared/session/require-role";
import { ROUTES } from "@shared/session/routes.config";
import { AppShell } from "./app-shell";
import type { LayoutProps } from "./get-layout";

export function StudentLayout({ children }: LayoutProps) {
  return (
    <RequireAuth>
      <AppShell>{children}</AppShell>
    </RequireAuth>
  );
}

export function withStudentLayout(page: ReactElement): ReactNode {
  return <StudentLayout>{page}</StudentLayout>;
}

export const STUDENT_ONLY_LAYOUT_ROLES = ROUTES["/my-group"].roles;

export function StudentOnlyLayout({ children }: LayoutProps) {
  return (
    <RequireRole roles={STUDENT_ONLY_LAYOUT_ROLES}>
      <AppShell>{children}</AppShell>
    </RequireRole>
  );
}

export function withStudentOnlyLayout(page: ReactElement): ReactNode {
  return <StudentOnlyLayout>{page}</StudentOnlyLayout>;
}
