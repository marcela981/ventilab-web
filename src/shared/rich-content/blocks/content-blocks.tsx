/*
* Funcionalidad: Content blocks renderer
* Descripción: Renders an ordered list of page blocks (PageSectionDTO / ModuleFullBlockDTO shape) for both the learning viewer and the content-editor preview. Dispatches by type to the rich text, media, video, equation, code and divider renderers; unknown types render nothing. Blocks are rendered in the given order (the caller sorts). `mode` is "screen" (default) or "print" (videos become visible links). Tiptap is never loaded: stored Tiptap docs use the pure TiptapDocView; KaTeX and DOMPurify are lazy chunks. Depends on react and the block renderers.
* Versión: 1.0
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

import { cx } from "@shared/lib/class-names";
import { CONTENT_BLOCK_TYPES, isRichTextBlockType, readString } from "./content-block.types";
import type { ContentBlockInput, ContentBlockMode } from "./content-block.types";
import { EquationBlock } from "./equation-block";
import { FileBlock, ImageBlock, VideoBlock } from "./media-blocks";
import { RichTextBlock } from "./rich-text-block";
import styles from "../UI/content-blocks.module.css";

export type ContentBlocksProps = {
  blocks: readonly ContentBlockInput[]
  mode?: ContentBlockMode
  className?: string
};

export type ContentBlockProps = {
  block: ContentBlockInput
  mode?: ContentBlockMode
};

function CodeBlock({ content }: { content: unknown }) {
  const code = readString(content, "code");
  const language = readString(content, "language");

  if (code === null) {
    return null;
  }

  return (
    <pre className={styles.code} {...(language === null ? {} : { "data-language": language })}>
      <code>{code}</code>
    </pre>
  );
}

function BlockBody({ block, mode }: { block: ContentBlockInput, mode: ContentBlockMode }) {
  const { type, content, mediaUrl, title } = block;

  if (isRichTextBlockType(type)) {
    return <RichTextBlock type={type} content={content} />;
  }

  switch (type) {
    case "IMAGE":
      return <ImageBlock content={content} mediaUrl={mediaUrl} title={title} />;
    case "FILE":
      return <FileBlock content={content} mediaUrl={mediaUrl} title={title} />;
    case "VIDEO":
      return <VideoBlock content={content} mediaUrl={mediaUrl} title={title} mode={mode} />;
    case "EQUATION":
      return <EquationBlock content={content} />;
    case "CODE":
      return <CodeBlock content={content} />;
    default:
      return <hr className={styles.divider} />;
  }
}

function isKnownType(type: string): boolean {
  return (CONTENT_BLOCK_TYPES as readonly string[]).includes(type);
}

export function ContentBlock({ block, mode = "screen" }: ContentBlockProps) {
  if (!isKnownType(block.type)) {
    return null;
  }

  const title = block.title?.trim();

  return (
    <section className={styles.block} data-block-type={block.type}>
      {title && block.type !== "DIVIDER" ? <h2 className={styles.title}>{title}</h2> : null}
      <BlockBody block={block} mode={mode} />
    </section>
  );
}

export function ContentBlocks({ blocks, mode = "screen", className }: ContentBlocksProps) {
  return (
    <div className={cx(styles.root, mode === "print" && styles.print, className)}>
      {blocks.map((block) => <ContentBlock key={block.id} block={block} mode={mode} />)}
    </div>
  );
}
