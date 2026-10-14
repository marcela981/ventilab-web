/*
* Funcionalidad: Equation block
* Descripción: Renders an EQUATION block (`{latex, display?}`). The KaTeX view is a lazy chunk loaded with retryImport (same approach as the math markdown renderer); while it loads, the LaTeX source is shown as code so the content is never blank. Display mode is the default. Depends on react, design-system error boundary and retry-import.
* Versión: 1.0
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

import { lazy, Suspense } from "react";
import { RouteErrorBoundary } from "@shared/design-system/components/route-error-boundary";
import { retryImport } from "@shared/lib/retry-import";
import { isRecord, readString } from "./content-block.types";
import styles from "../UI/content-blocks.module.css";

const EquationView = lazy(() =>
  retryImport(() => import("./equation-view")).then((module) => ({ default: module.EquationView })),
);

export type EquationBlockProps = {
  content: unknown
};

export function EquationBlock({ content }: EquationBlockProps) {
  const latex = readString(content, "latex");

  if (latex === null) {
    return null;
  }

  const display = !isRecord(content) || content.display !== false;

  return (
    <div className={display ? styles.equationDisplay : styles.equationInline}>
      <RouteErrorBoundary resetKey={latex}>
        <Suspense fallback={<code className={styles.equationSource}>{latex}</code>}>
          <EquationView latex={latex} display={display} />
        </Suspense>
      </RouteErrorBoundary>
    </div>
  );
}
