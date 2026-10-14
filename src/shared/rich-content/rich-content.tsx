/*
* Funcionalidad: RichContent
* Descripción: Read-only renderer for lesson content (markdown, markdown with KaTeX math). Detects the format, then lazily loads only the renderer it needs (React.lazy + retryImport) behind a LoadingState fallback; chunk failures that survive the retries surface through RouteErrorBoundary ("Recargar"). Depends on design-system and lib.
* Versión: 1.0
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

import { lazy, Suspense } from "react";
import { LoadingState } from "@shared/design-system/components/loading-state";
import { RouteErrorBoundary } from "@shared/design-system/components/route-error-boundary";
import { cx } from "@shared/lib/class-names";
import { retryImport } from "@shared/lib/retry-import";
import { detectContentFormat } from "./content-format";
import styles from "./UI/rich-content.module.css";

const MarkdownView = lazy(() =>
  retryImport(() => import("./markdown-view")).then((module) => ({ default: module.MarkdownView })),
);

const MathMarkdownView = lazy(() =>
  retryImport(() => import("./math-markdown-view")).then((module) => ({ default: module.MathMarkdownView })),
);

export type RichContentProps = {
  content: unknown
  className?: string
  emptyLabel?: string
};

// TODO(i18n): move the copy to an i18next namespace once src/i18n is in scope.
export function RichContent({ content, className, emptyLabel = "No hay contenido para mostrar." }: RichContentProps) {
  const format = detectContentFormat(content);

  if (format === "empty" || typeof content !== "string") {
    return <p className={cx(styles.empty, className)}>{emptyLabel}</p>;
  }

  const View = format === "markdown-math" ? MathMarkdownView : MarkdownView;

  return (
    <div className={cx(styles.root, className)}>
      <RouteErrorBoundary resetKey={content}>
        <Suspense fallback={<LoadingState label="Cargando contenido…" />}>
          <View content={content} />
        </Suspense>
      </RouteErrorBoundary>
    </div>
  );
}
