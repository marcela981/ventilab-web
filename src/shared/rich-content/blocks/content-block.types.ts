/*
* Funcionalidad: Content block input types
* Descripción: Shared, feature-independent input shape of a page block (the PageSectionDTO / ModuleFullBlockDTO fields the renderer needs), the backend block type families (rich text, media, video, equation, code, divider), the render mode (screen | print) and small runtime readers for the untyped `content` JSON. Mirrors ventylab-server pages/domain (page-block-type.ts, page-block-content.ts). No dependencies.
* Versión: 1.0
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

export type ContentBlockMode = "screen" | "print";

export type ContentBlockInput = {
  id: string
  type: string
  title?: string | null | undefined
  // Stored JSON: `{doc} | {markdown} | {html}` (+ variant), `{caption, alt}`, `{url}`, `{latex, display}`, `{code, language}` or `{}`.
  content: unknown
  mediaId?: string | null | undefined
  mediaUrl?: string | null | undefined
};

export const RICH_TEXT_BLOCK_TYPES = [
  "TEXT",
  "INTRODUCTION",
  "THEORY",
  "CASE_STUDY",
  "SUMMARY",
  "EXERCISE",
  "QUIZ",
  "REFERENCES",
  "CALLOUT",
] as const;

export type RichTextBlockType = (typeof RICH_TEXT_BLOCK_TYPES)[number];

export const CONTENT_BLOCK_TYPES = [...RICH_TEXT_BLOCK_TYPES, "IMAGE", "FILE", "VIDEO", "EQUATION", "CODE", "DIVIDER"] as const;

export type ContentBlockType = (typeof CONTENT_BLOCK_TYPES)[number];

export function isRichTextBlockType(type: string): type is RichTextBlockType {
  return (RICH_TEXT_BLOCK_TYPES as readonly string[]).includes(type);
}

export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function readString(content: unknown, field: string): string | null {
  if (!isRecord(content)) {
    return null;
  }

  const value = content[field];

  return typeof value === "string" && value.trim() !== "" ? value : null;
}
