/*
* Funcionalidad: Equation view (lazy chunk)
* Descripción: Renders one EQUATION block with KaTeX (inline or display mode, throwOnError off so invalid LaTeX shows in the error color instead of crashing). Loaded only through React.lazy + retryImport from content-blocks, so KaTeX and its CSS stay out of the initial bundle. KaTeX output is generated markup (trust off), not user HTML. Depends on katex.
* Versión: 1.0
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

import "katex/dist/katex.min.css";
import katex from "katex";
import { useMemo } from "react";

export type EquationViewProps = {
  latex: string
  display: boolean
};

export function EquationView({ latex, display }: EquationViewProps) {
  const markup = useMemo(
    () => katex.renderToString(latex, { displayMode: display, throwOnError: false, trust: false, output: "htmlAndMathml" }),
    [latex, display],
  );

  return display
    ? <div dangerouslySetInnerHTML={{ __html: markup }} />
    : <span dangerouslySetInnerHTML={{ __html: markup }} />;
}
