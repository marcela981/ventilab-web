/*
* Funcionalidad: RoleShellLayout
* Descripción: Layout for the pages every authenticated role opens but staff see inside the staff panel (DISENO_BLOQUE4 §2.1: /evaluations, whose staff branch is the Bloque 3 hub). Inside RequireAuth it renders the PanelShell for TEACHER and ADMIN and the AppShell for students. withRoleShellLayout is the getLayout helper for pages. Depends on @shared/session, AppShell and PanelShell.
* Versión: 1.0
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

import type { ReactElement, ReactNode } from "react";
import { RequireAuth } from "@shared/session/require-auth";
import { useSession } from "@shared/session/use-session";
import { AppShell } from "./app-shell";
import type { LayoutProps } from "./get-layout";
import { PanelShell } from "./panel-shell";

function RoleShell({ children }: LayoutProps) {
  const { role } = useSession();

  return role === "TEACHER" || role === "ADMIN" ? <PanelShell>{children}</PanelShell> : <AppShell>{children}</AppShell>;
}

export function RoleShellLayout({ children }: LayoutProps) {
  return (
    <RequireAuth>
      <RoleShell>{children}</RoleShell>
    </RequireAuth>
  );
}

export function withRoleShellLayout(page: ReactElement): ReactNode {
  return <RoleShellLayout>{page}</RoleShellLayout>;
}
