/*
* Funcionalidad: Lesson page content
* Descripción: Main column states of the lesson viewer for an unlocked (or previewed) lesson: error with retry for the lessons, Pages or Page queries, empty state for a lesson without published Pages, skeleton while loading or redirecting, and the Page itself (title + blocks rendered by the shared ContentBlocks in screen mode, already sorted by order). ContentBlocks is a lazy chunk (React.lazy + retryImport, C1 pattern, with the design-system error boundary and the skeleton as fallback): the learning routes share the feature barrel, so a static import would add the block renderers to the First Load JS of /learn, sections and modules. Depends on @shared/design-system, @shared/lib/retry-import, @shared/rich-content (ContentBlocks only: Tiptap is never loaded), the learning error messages and the viewer CSS Module. v1.1 (C6): the Page article (title + lazy ContentBlocks) is exported as LessonPageArticle so the content editor's student preview renders the same component; viewer behavior unchanged. v1.2 (W5, Bloque 2): preloadContentBlocks starts the ContentBlocks chunk download (the same memoized promise React.lazy uses) so the viewer fetches it in parallel with the Page data instead of after it; a failed download is forgotten so the lazy component retries.
* Versión: 1.2
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

import MenuBookIcon from "@mui/icons-material/MenuBook";
import { lazy, Suspense } from "react";
import type { ApiError } from "@shared/api-client/api-error";
import { EmptyState } from "@shared/design-system/components/empty-state";
import { ErrorState } from "@shared/design-system/components/error-state";
import { RouteErrorBoundary } from "@shared/design-system/components/route-error-boundary";
import { CardSkeleton } from "@shared/design-system/components/skeleton";
import { cx } from "@shared/lib/class-names";
import { retryImport } from "@shared/lib/retry-import";
import { getLearningErrorMessage } from "../entities/learning-error-messages";
import type { PageContent } from "../entities/lesson.entity";
import styles from "../../UI/lesson-viewer.module.css";

type ContentBlocksModule = typeof import("@shared/rich-content/blocks/content-blocks");

let contentBlocksChunk: Promise<ContentBlocksModule> | null = null;

function loadContentBlocks(): Promise<ContentBlocksModule> {
  contentBlocksChunk ??= retryImport(() => import("@shared/rich-content/blocks/content-blocks")).catch((error: unknown) => {
    contentBlocksChunk = null;
    throw error;
  });

  return contentBlocksChunk;
}

/** Starts downloading the blocks renderer before the Page data arrives (fire and forget). */
export function preloadContentBlocks(): void {
  loadContentBlocks().catch(() => undefined);
}

const ContentBlocks = lazy(() => loadContentBlocks().then((module) => ({ default: module.ContentBlocks })));

// TODO(i18n): move to a learning namespace in src/i18n.
const COPY = {
  loading: "Cargando la página…",
  loadErrorTitle: "No se pudo cargar la página",
  emptyTitle: "Lección sin páginas",
  emptyDescription: "Esta lección todavía no tiene páginas publicadas.",
} as const;

export type LessonPageContentProps = {
  page: PageContent | null
  isEmpty: boolean
  error: ApiError | null
  onRetry: () => void
};

export type LessonPageArticleProps = {
  page: Pick<PageContent, "id" | "title" | "blocks">
};

// The Page body exactly as students see it; also used by the content editor's student preview.
export function LessonPageArticle({ page }: LessonPageArticleProps) {
  return (
    <article className={cx(styles.article)} aria-labelledby="lesson-page-title">
      <h2 id="lesson-page-title" className={cx(styles.pageTitle)}>{page.title}</h2>
      <RouteErrorBoundary resetKey={page.id}>
        <Suspense fallback={<CardSkeleton label={COPY.loading} />}>
          <ContentBlocks blocks={page.blocks} mode="screen" />
        </Suspense>
      </RouteErrorBoundary>
    </article>
  );
}

export function LessonPageContent({ page, isEmpty, error, onRetry }: LessonPageContentProps) {
  if (error) {
    return <ErrorState title={COPY.loadErrorTitle} description={getLearningErrorMessage(error)} onRetry={onRetry} />;
  }

  if (isEmpty) {
    return <EmptyState icon={<MenuBookIcon />} title={COPY.emptyTitle} description={COPY.emptyDescription} />;
  }

  if (!page) {
    return <CardSkeleton label={COPY.loading} />;
  }

  return <LessonPageArticle page={page} />;
}
