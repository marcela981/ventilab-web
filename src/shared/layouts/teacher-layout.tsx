/*
* Funcionalidad: TeacherLayout
* Descripción: Layout for staff pages: AppShell inside RequireRole with the roles of the `/panel` route in routes.config (TEACHER, ADMIN); other roles are redirected to their landing route by the guard. withTeacherLayout is the getLayout helper for pages. Depends on @shared/session and AppShell. v1.1 (O5 operation): the role set comes from ROUTES["/teacher"] (same roles as the legacy entry), so the legacy /panel entries can be removed later.
* Versión: 1.1
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

import type { ReactElement, ReactNode } from "react";
import { RequireRole } from "@shared/session/require-role";
import { ROUTES } from "@shared/session/routes.config";
import { AppShell } from "./app-shell";
import type { LayoutProps } from "./get-layout";

export const TEACHER_LAYOUT_ROLES = ROUTES["/teacher"].roles;

export function TeacherLayout({ children }: LayoutProps) {
  return (
    <RequireRole roles={TEACHER_LAYOUT_ROLES}>
      <AppShell>{children}</AppShell>
    </RequireRole>
  );
}

export function withTeacherLayout(page: ReactElement): ReactNode {
  return <TeacherLayout>{page}</TeacherLayout>;
}
