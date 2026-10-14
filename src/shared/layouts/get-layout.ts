/*
* Funcionalidad: Per-page layout selection
* Descripción: Types for pages that bring their own layout (`getLayout(page)`, the Next Pages Router per-page layout pattern) and resolvePageLayout, the pure helper `pages/_app.js` uses: it returns the page's getLayout, or null so the page keeps the legacy shell unchanged. Imported directly by _app (not through the layouts index) so the app shell does not pull the layouts. Depends on next and react types only.
* Versión: 1.0
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

import type { NextPage } from "next";
import type { ReactElement, ReactNode } from "react";

export type PageLayout = (page: ReactElement) => ReactNode;

export type NextPageWithLayout<P = object> = NextPage<P> & {
  getLayout?: PageLayout
};

export type LayoutProps = {
  children: ReactNode
};

export function resolvePageLayout(component: unknown): PageLayout | null {
  if ((typeof component !== "function" && typeof component !== "object") || component === null) {
    return null;
  }

  const { getLayout } = component as { getLayout?: unknown };

  return typeof getLayout === "function" ? (getLayout as PageLayout) : null;
}
