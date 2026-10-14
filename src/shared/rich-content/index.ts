/*
* Funcionalidad: rich-content public API
* Descripción: Public surface of the read-only lesson content renderer: the RichContent component and the pure format detection helper. The markdown/KaTeX renderers are internal lazy chunks. v1.1 (T0 learning): the page block renderer (ContentBlocks/ContentBlock for the learning viewer and the content-editor preview, TiptapDocView, video URL parser and block input types).
* Versión: 1.1
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

export { detectContentFormat } from "./content-format";
export type { ContentFormat } from "./content-format";
export { RichContent } from "./rich-content";
export type { RichContentProps } from "./rich-content";
export { ContentBlock, ContentBlocks } from "./blocks/content-blocks";
export type { ContentBlockProps, ContentBlocksProps } from "./blocks/content-blocks";
export { CONTENT_BLOCK_TYPES, isRichTextBlockType, RICH_TEXT_BLOCK_TYPES } from "./blocks/content-block.types";
export type { ContentBlockInput, ContentBlockMode, ContentBlockType, RichTextBlockType } from "./blocks/content-block.types";
export { safeHref, TiptapDocView } from "./blocks/tiptap-doc-view";
export type { TiptapDocViewProps } from "./blocks/tiptap-doc-view";
export { isSafeMediaUrl, parseVideoEmbed } from "./blocks/video-source";
export type { VideoEmbed } from "./blocks/video-source";
