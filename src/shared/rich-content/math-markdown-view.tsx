/*
* Funcionalidad: Markdown + math renderer (lazy chunk)
* Descripción: Renders markdown with formulas (remark-gfm + remark-math + rehype-katex). The KaTeX stylesheet is imported here, so Next emits it with this async chunk instead of the First Load CSS (Next allows node_modules CSS imports outside _app). Loaded only when the content has `$` delimiters. Raw HTML is skipped; KaTeX runs with its default `trust: false`.
* Versión: 1.0
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

import "katex/dist/katex.min.css";
import ReactMarkdown from "react-markdown";
import rehypeKatex from "rehype-katex";
import remarkGfm from "remark-gfm";
import remarkMath from "remark-math";
import { MARKDOWN_COMPONENTS } from "./markdown-components";
import type { RendererProps } from "./markdown-components";

const REMARK_PLUGINS = [remarkGfm, remarkMath];
const REHYPE_PLUGINS = [rehypeKatex];

export function MathMarkdownView({ content }: RendererProps) {
  return (
    <ReactMarkdown
      remarkPlugins={REMARK_PLUGINS}
      rehypePlugins={REHYPE_PLUGINS}
      components={MARKDOWN_COMPONENTS}
      skipHtml
    >
      {content}
    </ReactMarkdown>
  );
}
