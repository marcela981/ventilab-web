/*
* Funcionalidad: Rich text block
* Descripción: Renders the rich text family (TEXT, INTRODUCTION, THEORY, CASE_STUDY, SUMMARY, EXERCISE, QUIZ, REFERENCES, CALLOUT). Content priority: `{doc}` Tiptap JSON through the pure TiptapDocView (no Tiptap bundle), then `{markdown}` through RichContent, then `{html}` through the lazily loaded DOMPurify view. CALLOUT renders as a note with its `variant` (info, tip, success, warning, error; info by default). QUIZ is rendered as rich text only (in-page quizzes are out of scope). Depends on react, design-system states, retry-import and the rich-content renderers.
* Versión: 1.0
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

import { lazy, Suspense } from "react";
import { LoadingState } from "@shared/design-system/components/loading-state";
import { RouteErrorBoundary } from "@shared/design-system/components/route-error-boundary";
import { cx } from "@shared/lib/class-names";
import { retryImport } from "@shared/lib/retry-import";
import { RichContent } from "../rich-content";
import { isRecord, readString } from "./content-block.types";
import { TiptapDocView } from "./tiptap-doc-view";
import richStyles from "../UI/rich-content.module.css";
import styles from "../UI/content-blocks.module.css";

const HtmlView = lazy(() =>
  retryImport(() => import("./html-view")).then((module) => ({ default: module.HtmlView })),
);

const CALLOUT_VARIANTS = ["info", "tip", "success", "warning", "error"] as const;

type CalloutVariant = (typeof CALLOUT_VARIANTS)[number];

const CALLOUT_CLASS: Record<CalloutVariant, string | undefined> = {
  info: styles.calloutInfo,
  tip: styles.calloutTip,
  success: styles.calloutSuccess,
  warning: styles.calloutWarning,
  error: styles.calloutError,
};

export type RichTextBlockProps = {
  type: string
  content: unknown
};

function calloutVariant(content: unknown): CalloutVariant {
  const variant = readString(content, "variant")?.toLowerCase();

  return CALLOUT_VARIANTS.find((value) => value === variant) ?? "info";
}

function RichTextBody({ content }: { content: unknown }) {
  if (isRecord(content) && isRecord(content.doc)) {
    return <TiptapDocView doc={content.doc} className={richStyles.root} />;
  }

  const markdown = readString(content, "markdown");

  if (markdown !== null) {
    return <RichContent content={markdown} />;
  }

  const html = readString(content, "html");

  if (html === null) {
    return null;
  }

  return (
    <RouteErrorBoundary resetKey={html}>
      <Suspense fallback={<LoadingState label="Cargando contenido…" />}>
        <HtmlView html={html} className={richStyles.root} />
      </Suspense>
    </RouteErrorBoundary>
  );
}

export function RichTextBlock({ type, content }: RichTextBlockProps) {
  if (type !== "CALLOUT") {
    return <RichTextBody content={content} />;
  }

  const variant = calloutVariant(content);

  return (
    <div role="note" className={cx(styles.callout, CALLOUT_CLASS[variant])} data-variant={variant}>
      <RichTextBody content={content} />
    </div>
  );
}
