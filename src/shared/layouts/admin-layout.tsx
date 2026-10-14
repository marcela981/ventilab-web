/*
* Funcionalidad: AdminLayout
* Descripción: Layout for administration pages: AppShell inside RequireRole with the roles of the `/panel/admin` route in routes.config (ADMIN); other roles are redirected to their landing route by the guard. withAdminLayout is the getLayout helper for pages. Depends on @shared/session and AppShell.
* Versión: 1.0
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

export const ADMIN_LAYOUT_ROLES = ROUTES["/panel/admin"].roles;

export function AdminLayout({ children }: LayoutProps) {
  return (
    <RequireRole roles={ADMIN_LAYOUT_ROLES}>
      <AppShell>{children}</AppShell>
    </RequireRole>
  );
}

export function withAdminLayout(page: ReactElement): ReactNode {
  return <AdminLayout>{page}</AdminLayout>;
}
