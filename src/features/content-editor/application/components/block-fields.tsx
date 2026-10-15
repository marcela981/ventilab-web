/*
* Funcionalidad: BlockFields
* Descripción: Type-specific fields of one block in the page editor. Rich text types: a Tiptap document opens the lazy RichTextEditor (React.lazy + retryImport behind a skeleton and an error boundary, so Tiptap is a separate chunk); stored Markdown or HTML is edited as source with a live preview; any other shape (e.g. legacy quiz data) is preserved untouched. Equation: LaTeX source, display toggle and a live KaTeX preview. Video: YouTube/Vimeo URL and caption with the embed preview once the link is valid (an uploaded video keeps its media). Image and file: caption (and alt text) plus the upload slot reserved for C5, with the current media preview. Code: language and source. Divider: nothing to edit. Unknown types are kept as they are. Previews reuse the shared ContentBlock renderer. Depends on React, MUI, @shared/design-system, @shared/lib, @shared/rich-content, the page draft entity and the page editor CSS Module.
* Versión: 1.0 (C4)
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

import Checkbox from "@mui/material/Checkbox";
import FormControlLabel from "@mui/material/FormControlLabel";
import { lazy, Suspense } from "react";
import type { ChangeEvent } from "react";
import { FormField } from "@shared/design-system/components/form-field";
import { RouteErrorBoundary } from "@shared/design-system/components/route-error-boundary";
import { CardSkeleton } from "@shared/design-system/components/skeleton";
import { cx } from "@shared/lib/class-names";
import { retryImport } from "@shared/lib/retry-import";
import { ContentBlock } from "@shared/rich-content/blocks/content-blocks";
import { isRecord, isRichTextBlockType, readString } from "@shared/rich-content/blocks/content-block.types";
import { parseVideoEmbed } from "@shared/rich-content/blocks/video-source";
import { richTextFormat } from "../entities/page-draft.entity";
import type { BlockContent, DraftBlock } from "../entities/page-draft.entity";
import styles from "../../UI/page-editor.module.css";

const RichTextEditor = lazy(() =>
  retryImport(() => import("./rich-text-editor")).then((module) => ({ default: module.RichTextEditor })),
);

// TODO(i18n): move to a content-editor namespace in src/i18n.
const COPY = {
  text: "Texto del bloque",
  textPlaceholder: "Escribe el contenido…",
  loadingEditor: "Cargando el editor…",
  markdown: "Contenido (Markdown)",
  html: "Contenido (HTML)",
  preserved: "Este bloque tiene un formato que no se edita aquí; se conserva sin cambios.",
  preview: "Vista previa",
  latex: "Ecuación (LaTeX)",
  display: "Mostrar como bloque centrado",
  videoUrl: "Enlace de YouTube o Vimeo",
  uploadedVideo: "Este video es un archivo subido; se conserva sin cambios.",
  caption: "Leyenda (opcional)",
  alt: "Texto alternativo",
  uploadSlot: "La subida de archivos estará disponible próximamente.",
  noMedia: "Todavía no hay un archivo asociado.",
  language: "Lenguaje (opcional)",
  code: "Código",
  divider: "Separador horizontal entre bloques.",
  unknown: "Este tipo de bloque se conserva sin cambios.",
} as const;

export type BlockFieldsProps = {
  block: DraftBlock
  error: string | null
  onContentChange: (content: BlockContent) => void
};

function textOf(content: BlockContent, field: string): string {
  const value = content[field];

  return typeof value === "string" ? value : "";
}

function Preview({ block }: { block: DraftBlock }) {
  return (
    <div className={cx(styles.preview)} aria-label={COPY.preview} role="group">
      <span className={cx(styles.previewLabel)}>{COPY.preview}</span>
      <ContentBlock block={{ id: block.key, type: block.type, title: null, content: block.content, mediaId: block.mediaId, mediaUrl: block.mediaUrl }} />
    </div>
  );
}

type FieldsProps = { block: DraftBlock, error: string | null, set: (field: string, value: unknown) => void };

function RichTextFields({ block, set }: FieldsProps) {
  const format = richTextFormat(block.content);

  if (format === "doc") {
    const doc = block.content.doc;

    return (
      <RouteErrorBoundary>
        <Suspense fallback={<CardSkeleton label={COPY.loadingEditor} />}>
          <RichTextEditor
            initialDoc={isRecord(doc) ? doc : {}}
            label={COPY.text}
            placeholder={COPY.textPlaceholder}
            onChange={(next) => set("doc", next)}
          />
        </Suspense>
      </RouteErrorBoundary>
    );
  }

  if (format === null) {
    return <p className={cx(styles.note)}>{COPY.preserved}</p>;
  }

  return (
    <>
      <FormField
        label={format === "markdown" ? COPY.markdown : COPY.html}
        multiline
        minRows={4}
        value={textOf(block.content, format)}
        onChange={(event: ChangeEvent<HTMLInputElement>) => set(format, event.target.value)}
      />
      <Preview block={block} />
    </>
  );
}

function EquationFields({ block, error, set }: FieldsProps) {
  const latex = textOf(block.content, "latex");

  return (
    <>
      <FormField
        label={COPY.latex}
        multiline
        minRows={2}
        value={latex}
        error={error ?? undefined}
        onChange={(event: ChangeEvent<HTMLInputElement>) => set("latex", event.target.value)}
      />
      <FormControlLabel
        control={<Checkbox checked={block.content.display !== false} onChange={(event) => set("display", event.target.checked)} />}
        label={COPY.display}
      />
      {latex.trim() ? <Preview block={block} /> : null}
    </>
  );
}

function CaptionField({ block, set }: Pick<FieldsProps, "block" | "set">) {
  return (
    <FormField
      label={COPY.caption}
      value={textOf(block.content, "caption")}
      onChange={(event: ChangeEvent<HTMLInputElement>) => set("caption", event.target.value)}
    />
  );
}

function VideoFields({ block, error, set }: FieldsProps) {
  if (block.mediaId !== null && readString(block.content, "url") === null) {
    return (
      <>
        <p className={cx(styles.note)}>{COPY.uploadedVideo}</p>
        <CaptionField block={block} set={set} />
        <Preview block={block} />
      </>
    );
  }

  const url = textOf(block.content, "url");

  return (
    <>
      <FormField
        label={COPY.videoUrl}
        type="url"
        value={url}
        error={url.trim() ? (error ?? undefined) : undefined}
        onChange={(event: ChangeEvent<HTMLInputElement>) => set("url", event.target.value)}
      />
      <CaptionField block={block} set={set} />
      {parseVideoEmbed(url) ? <Preview block={block} /> : null}
    </>
  );
}

// TODO(C5): replace the upload slot with the media upload (progress, client validation, 413/415).
function MediaFields({ block, error, set }: FieldsProps) {
  return (
    <>
      <div className={cx(styles.uploadSlot)} data-slot="media-upload">
        <p className={cx(styles.note)}>{COPY.uploadSlot}</p>
        {error ? <p className={cx(styles.fieldError)}>{error}</p> : null}
      </div>
      <CaptionField block={block} set={set} />
      {block.type === "IMAGE" ? (
        <FormField
          label={COPY.alt}
          value={textOf(block.content, "alt")}
          onChange={(event: ChangeEvent<HTMLInputElement>) => set("alt", event.target.value)}
        />
      ) : null}
      {block.mediaUrl ? <Preview block={block} /> : <p className={cx(styles.note)}>{COPY.noMedia}</p>}
    </>
  );
}

function CodeFields({ block, error, set }: FieldsProps) {
  return (
    <>
      <FormField
        label={COPY.language}
        value={textOf(block.content, "language")}
        error={error ?? undefined}
        onChange={(event: ChangeEvent<HTMLInputElement>) => set("language", event.target.value)}
      />
      <FormField
        label={COPY.code}
        multiline
        minRows={4}
        value={textOf(block.content, "code")}
        onChange={(event: ChangeEvent<HTMLInputElement>) => set("code", event.target.value)}
      />
    </>
  );
}

export function BlockFields({ block, error, onContentChange }: BlockFieldsProps) {
  const set = (field: string, value: unknown) => onContentChange({ ...block.content, [field]: value });
  const props: FieldsProps = { block, error, set };

  if (isRichTextBlockType(block.type)) {
    return <RichTextFields {...props} />;
  }

  switch (block.type) {
    case "EQUATION":
      return <EquationFields {...props} />;
    case "VIDEO":
      return <VideoFields {...props} />;
    case "IMAGE":
    case "FILE":
      return <MediaFields {...props} />;
    case "CODE":
      return <CodeFields {...props} />;
    case "DIVIDER":
      return <p className={cx(styles.note)}>{COPY.divider}</p>;
    default:
      return <p className={cx(styles.note)}>{COPY.unknown}</p>;
  }
}
