/*
* Funcionalidad: PrintLayout
* Descripción: Minimal layout of the module print view: guarded by RequireRole with the roles of the "/learn/modules/[moduleId]/print" route (TEACHER, ADMIN) and WITHOUT the app shell (no navigation drawer, app bar or user menu), so the printed document only contains the module. The AppShell CSS Module class names are hashed, so hiding the shell with @media print selectors would not be stable; rendering without it is. Content renders inside a main region and a RouteErrorBoundary. withPrintLayout is the getLayout helper for the page. Depends on react, @shared/session and @shared/design-system.
* Versión: 1.0 (L7)
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

import type { ReactElement, ReactNode } from "react";
import { RouteErrorBoundary } from "@shared/design-system/components/route-error-boundary";
import { cx } from "@shared/lib/class-names";
import { RequireRole } from "@shared/session/require-role";
import { ROUTES } from "@shared/session/routes.config";
import styles from "../../UI/module-print.module.css";

const PRINT_ROLES = ROUTES["/learn/modules/[moduleId]/print"].roles ?? [];

export function PrintLayout({ children }: { children: ReactNode }) {
  return (
    <RequireRole roles={PRINT_ROLES}>
      <main className={cx(styles.layout)}>
        <RouteErrorBoundary>{children}</RouteErrorBoundary>
      </main>
    </RequireRole>
  );
}

export function withPrintLayout(page: ReactElement): ReactNode {
  return <PrintLayout>{page}</PrintLayout>;
}
