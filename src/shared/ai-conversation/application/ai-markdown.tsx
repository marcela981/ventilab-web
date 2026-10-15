/*
* Funcionalidad: AiMarkdown
* Descripción: Safe markdown render of AI answers. Wraps the shared RichContent (no second markdown stack): raw HTML is skipped (skipHtml, so no script or img/onerror from the model), react-markdown's default urlTransform drops javascript:, data: and vbscript: URLs from links and images, external http(s) links open in a new tab with rel="noopener noreferrer", and the markdown renderer and KaTeX (only when the text has $ math) load lazily. No raw HTML injection API is used. Empty content renders nothing. Depends on @shared/rich-content.
* Versión: 1.0
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

import { RichContent } from "@shared/rich-content/rich-content";

export type AiMarkdownProps = {
  content: string
  className?: string
};

export function AiMarkdown({ content, className }: AiMarkdownProps) {
  return <RichContent content={content} emptyLabel="" {...(className === undefined ? {} : { className })} />;
}
