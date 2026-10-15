/*
* Funcionalidad: StudentPreview
* Descripción: "Vista previa como estudiante" of the page editor: renders the CURRENT draft (unsaved edits included) with the learning viewer's own Page body component (LessonPageArticle from @features/learning: the same title, layout CSS and shared ContentBlocks the lesson viewer uses), so there is no copy of the rendering code. Draft blocks are mapped to the viewer's block input (local key as id, empty title as none, uploaded media through the signed URLs resolved by the media uploads). Only the page body: no progress registration, notes, tutor or navigation. The learning component is a lazy chunk (React.lazy + retryImport behind a skeleton and an error boundary), loaded only when the preview is opened, so the learning barrel never reaches the editor's First Load JS. Depends on React, @shared/design-system, @shared/lib, @features/learning (lazy), the page draft entity and the page editor CSS Module.
* Versión: 1.0 (C6)
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

import { lazy, Suspense, useMemo } from "react";
import { RouteErrorBoundary } from "@shared/design-system/components/route-error-boundary";
import { CardSkeleton } from "@shared/design-system/components/skeleton";
import { cx } from "@shared/lib/class-names";
import { retryImport } from "@shared/lib/retry-import";
import type { DraftBlock } from "../entities/page-draft.entity";
import styles from "../../UI/page-editor.module.css";

const LessonPageArticle = lazy(() =>
  retryImport(() => import("@features/learning")).then((module) => ({ default: module.LessonPageArticle })),
);

// TODO(i18n): move to a content-editor namespace in src/i18n.
const COPY = {
  label: "Vista previa como estudiante",
  note: "Así verán esta página los estudiantes, con los cambios sin guardar incluidos.",
  loading: "Cargando la vista previa…",
} as const;

export type StudentPreviewProps = {
  pageId: string
  title: string
  blocks: readonly DraftBlock[]
};

export function StudentPreview({ pageId, title, blocks }: StudentPreviewProps) {
  const page = useMemo(() => ({
    id: pageId,
    title,
    blocks: blocks.map((block) => ({
      id: block.key,
      type: block.type,
      title: block.title.trim() || null,
      content: block.content,
      mediaId: block.mediaId,
      mediaUrl: block.mediaUrl,
    })),
  }), [pageId, title, blocks]);

  return (
    <section className={cx(styles.studentPreview)} aria-label={COPY.label}>
      <p className={cx(styles.note)}>{COPY.note}</p>
      <RouteErrorBoundary resetKey={pageId}>
        <Suspense fallback={<CardSkeleton label={COPY.loading} />}>
          <LessonPageArticle page={page} />
        </Suspense>
      </RouteErrorBoundary>
    </section>
  );
}
