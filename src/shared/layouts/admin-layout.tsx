/*
* Funcionalidad: AdminLayout
* Descripción: Layout for administration pages: PanelShell inside RequireRole with the roles of ROUTES["/admin/users"] in routes.config (ADMIN); other roles are redirected to their landing route by the guard. withAdminLayout is the getLayout helper for pages. Depends on @shared/session and PanelShell. v1.1 (O5 operation): the role set comes from ROUTES["/admin/users"] (same roles as the legacy entry), so the legacy /panel entries can be removed later. v1.2 (review): the description now names ROUTES["/admin/users"] as the source of the roles (it still named the legacy /panel route). v1.3 (W1 Bloque 4): the page renders inside the staff panel (PanelShell) instead of the AppShell (/admin/**).
* Versión: 1.3
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

import type { ReactElement, ReactNode } from "react";
import { RequireRole } from "@shared/session/require-role";
import { ROUTES } from "@shared/session/routes.config";
import type { LayoutProps } from "./get-layout";
import { PanelShell } from "./panel-shell";

export const ADMIN_LAYOUT_ROLES = ROUTES["/admin/users"].roles;

export function AdminLayout({ children }: LayoutProps) {
  return (
    <RequireRole roles={ADMIN_LAYOUT_ROLES}>
      <PanelShell>{children}</PanelShell>
    </RequireRole>
  );
}

export function withAdminLayout(page: ReactElement): ReactNode {
  return <AdminLayout>{page}</AdminLayout>;
}
