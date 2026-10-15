/*
* Funcionalidad: RichTextView
* Descripción: Read-only view of an evaluation RichText (description, question prompt or scenario content): a Tiptap document goes through the pure TiptapDocView (no Tiptap loaded) and text goes through the shared RichContent (markdown, lazy KaTeX when it has math). Renders nothing for null. Depends on @shared/rich-content and the evaluation entities.
* Versión: 1.0
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

import { TiptapDocView } from "@shared/rich-content/blocks/tiptap-doc-view";
import { RichContent } from "@shared/rich-content/rich-content";
import type { RichText } from "../entities/evaluation.entity";

export type RichTextViewProps = {
  value: RichText | null
  className?: string | undefined
};

export function RichTextView({ value, className }: RichTextViewProps) {
  if (!value) {
    return null;
  }

  if (value.kind === "doc") {
    return <TiptapDocView doc={value.doc} className={className} />;
  }

  return className === undefined
    ? <RichContent content={value.text} />
    : <RichContent content={value.text} className={className} />;
}
