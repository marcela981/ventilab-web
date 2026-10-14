/*
* Funcionalidad: Sanitized HTML view (lazy chunk)
* Descripción: Renders the legacy `{html}` content of a rich text block after sanitizing it with DOMPurify (HTML profile only: no scripts, event handlers, SVG/MathML, forms, frames or unsafe URLs). Loaded only through React.lazy + retryImport from content-blocks so DOMPurify stays out of the initial bundle. DOMPurify needs a DOM, so the markup is sanitized in an effect: the server render and the first client render are empty (no hydration mismatch) and the content appears right after mount. Depends on dompurify.
* Versión: 1.0
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

import DOMPurify from "dompurify";
import { useEffect, useState } from "react";

export type HtmlViewProps = {
  html: string
  className?: string | undefined
};

const FORBIDDEN_TAGS = ["style", "form", "input", "button", "textarea", "select", "iframe", "object", "embed"];

export function sanitizeHtml(html: string): string {
  if (!DOMPurify.isSupported) {
    return "";
  }

  return DOMPurify.sanitize(html, { USE_PROFILES: { html: true }, FORBID_TAGS: FORBIDDEN_TAGS });
}

export function HtmlView({ html, className }: HtmlViewProps) {
  const [markup, setMarkup] = useState("");

  useEffect(() => {
    setMarkup(sanitizeHtml(html));
  }, [html]);

  return <div className={className} dangerouslySetInnerHTML={{ __html: markup }} />;
}
