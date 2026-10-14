/*
* Funcionalidad: PublicLayout
* Descripción: Layout for public pages (login and other /auth/* routes): no session guard, a centered narrow content column inside the main region and a RouteErrorBoundary. withPublicLayout is the getLayout helper for pages. Depends on react, @shared/design-system components and UI/public-layout.module.css.
* Versión: 1.0
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

import type { ReactElement, ReactNode } from "react";
import { RouteErrorBoundary } from "@shared/design-system/components/route-error-boundary";
import type { LayoutProps } from "./get-layout";
import styles from "./UI/public-layout.module.css";

export function PublicLayout({ children }: LayoutProps) {
  return (
    <main id="main-content" className={styles.root}>
      <div className={styles.content}>
        <RouteErrorBoundary>{children}</RouteErrorBoundary>
      </div>
    </main>
  );
}

export function withPublicLayout(page: ReactElement): ReactNode {
  return <PublicLayout>{page}</PublicLayout>;
}
