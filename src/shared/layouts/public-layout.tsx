/*
* Funcionalidad: PublicLayout
* Descripción: Layout for public pages (login and other /auth/* routes): no session guard, a centered narrow content column inside the main region and a RouteErrorBoundary. withPublicLayout is the getLayout helper for pages. Depends on react, @shared/design-system components and UI/public-layout.module.css. v1.1 (Bloque 5, §5.3, D5-D6): `variant="auth"` (withAuthLayout, used by every /auth/* page; 404 and 500 stay neutral): the July violet brand gradient (--vl-auth-bg) behind a wider column (34rem) whose content is a light island (data-surface="auth" + data-mui-color-scheme="light": MUI reads its light-scheme variables there and tokens.css re-declares the aliases), and the footer "© {año} VentyLab. Plataforma educativa de ventilación mecánica." under it (current year; the prerendered text may differ after a new year, so its hydration warning is suppressed). v1.2: (Ajustes D3): the auth variant follows the active palette and mode (no forced light island): --vl-auth-bg of the combination behind a centered column; from 1024px a brand column (logo, tagline and three features) beside the card.
* Versión: 1.2
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

import type { ReactElement, ReactNode } from "react";
import { BrandLogo } from "@shared/design-system/components/brand-logo";
import { RouteErrorBoundary } from "@shared/design-system/components/route-error-boundary";
import { cx } from "@shared/lib/class-names";
import type { LayoutProps } from "./get-layout";
import { APP_NAME } from "./shell.config";
import styles from "./UI/public-layout.module.css";

export type PublicLayoutVariant = "neutral" | "auth";

export type PublicLayoutProps = LayoutProps & {
  variant?: PublicLayoutVariant
};

// TODO(i18n): see nav.config.
export const AUTH_FOOTER_TEXT = (year: number) => `© ${year} ${APP_NAME}. Plataforma educativa de ventilación mecánica.`;

export const AUTH_BRAND_COPY = {
  tagline: "Aprende ventilación mecánica con un simulador, módulos por niveles y evaluaciones con retroalimentación.",
  features: [
    "Simulador de ventilador con paciente virtual y equipo real",
    "Módulos de enseñanza de principiante a avanzado",
    "Evaluaciones y retroalimentación con IA",
  ],
} as const;

export function PublicLayout({ children, variant = "neutral" }: PublicLayoutProps) {
  if (variant === "auth") {
    return (
      <main id="main-content" className={cx(styles.root, styles.auth)}>
        <div className={styles.authGrid}>
          <div className={styles.brand}>
            <BrandLogo alt={APP_NAME} size="auth" priority />
            <p className={styles.tagline}>{AUTH_BRAND_COPY.tagline}</p>
            <ul className={styles.features}>
              {AUTH_BRAND_COPY.features.map((feature) => <li key={feature}>{feature}</li>)}
            </ul>
          </div>
          <div className={styles.authContent}>
            <RouteErrorBoundary>{children}</RouteErrorBoundary>
          </div>
        </div>
        <p className={styles.footer} suppressHydrationWarning>
          {AUTH_FOOTER_TEXT(new Date().getFullYear())}
        </p>
      </main>
    );
  }

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

// The /auth/* pages: the brand background and the card of the active palette and mode.
export function withAuthLayout(page: ReactElement): ReactNode {
  return <PublicLayout variant="auth">{page}</PublicLayout>;
}
