/*
* Funcionalidad: StudentLayout
* Descripción: Layout for learner pages: AppShell inside RequireAuth. The student routes of routes.config (/dashboard, /profile, /teaching, ...) declare no role restriction (any authenticated role), so this layout only requires a backend session; the navigation itself is filtered by the user's role. withStudentLayout is the getLayout helper for pages. Depends on @shared/session and AppShell.
* Versión: 1.0
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

import type { ReactElement, ReactNode } from "react";
import { RequireAuth } from "@shared/session/require-auth";
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
