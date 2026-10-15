/*
* Funcionalidad: Lazy content editor pages
* Descripción: On-demand entry point of the content editor pages exported by the content-editor barrel: ContentTreePage (/content) loads its page module with React.lazy + retryImport (3 attempts with backoff) behind a LoadingState, inside a RouteErrorBoundary (a chunk that still fails shows "Recargar"). The tree code (drag and drop, dialogs) stays out of the shared chunks, and the page editor of C4 can be added the same way without growing /content. Same pattern as the groups staff pages. v1.1 (C4): PageEditorPage (/content/pages/[pageId]) loads the page editor module the same way, in its own chunk (Tiptap is a further lazy chunk inside it). Depends on React, @shared/design-system and @shared/lib.
* Versión: 1.1 (C4)
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

import { lazy, Suspense } from "react";
import { LoadingState } from "@shared/design-system/components/loading-state";
import { RouteErrorBoundary } from "@shared/design-system/components/route-error-boundary";
import { retryImport } from "@shared/lib/retry-import";

const LoadedContentTreePage = lazy(() =>
  retryImport(() => import("./content-tree.page")).then((module) => ({ default: module.ContentTreePage })),
);

const LoadedPageEditorPage = lazy(() =>
  retryImport(() => import("./page-editor.page")).then((module) => ({ default: module.PageEditorPage })),
);

// TODO(i18n): move to a content-editor namespace in src/i18n.
const LOADING_LABEL = "Cargando el editor de contenido…";

export function ContentTreePage() {
  return (
    <RouteErrorBoundary>
      <Suspense fallback={<LoadingState label={LOADING_LABEL} />}>
        <LoadedContentTreePage />
      </Suspense>
    </RouteErrorBoundary>
  );
}

export function PageEditorPage({ pageId }: { pageId: string }) {
  return (
    <RouteErrorBoundary>
      <Suspense fallback={<LoadingState label={LOADING_LABEL} />}>
        <LoadedPageEditorPage pageId={pageId} />
      </Suspense>
    </RouteErrorBoundary>
  );
}
