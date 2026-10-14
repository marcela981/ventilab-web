/*
* Funcionalidad: Markdown renderer (lazy chunk)
* Descripción: Renders GitHub Flavored Markdown with react-markdown + remark-gfm. Loaded only through RichContent's dynamic import, so the markdown pipeline stays out of every First Load JS. Raw HTML is skipped and react-markdown's default URL transform drops unsafe protocols.
* Versión: 1.0
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { MARKDOWN_COMPONENTS } from "./markdown-components";
import type { RendererProps } from "./markdown-components";

const REMARK_PLUGINS = [remarkGfm];

export function MarkdownView({ content }: RendererProps) {
  return (
    <ReactMarkdown remarkPlugins={REMARK_PLUGINS} components={MARKDOWN_COMPONENTS} skipHtml>
      {content}
    </ReactMarkdown>
  );
}
