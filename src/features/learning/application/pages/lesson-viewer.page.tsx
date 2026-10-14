/*
* Funcionalidad: LessonViewerPage
* Descripción: Page viewer of /learn/modules/[moduleId]/lessons/[lessonId]/[pageNumber]. Navigation state comes ONLY from the URL: pageNumber is the 1-based position of the backend Page inside its lesson (decision 1). Tree, module lessons and lesson Pages load in parallel; the Page content (`GET /api/pages/{id}`) is requested only once its id is known AND the module is visible for the user. An invalid pageNumber is replaced with Page 1, an out-of-range one with the last Page; an unknown module or a lesson outside the module is "not available". A student on a locked module (module or level locked in the curriculum tree) gets the lock screen with prerequisites; teachers/admins preview everything (PreviewNotice, no lock, no view registration). Breadcrumb Sección > Nivel > Módulo > Lección > Página. Previous/Next cross lesson boundaries (lesson-navigation entity); "Siguiente" registers the page view (fire-and-forget, also after 5 s) and navigates; after the last Page "Finalizar módulo" opens the module completion screen (/learn/modules/[moduleId]?completed=1). Side panel Notas | Profundizar | Preguntas with slots for L4-L6. v1.1 (L4): the "Notas" slot defaults to LessonNotesPanel (the caller's own notes of the lesson, anchored to the visible Page, page numbers resolved with the lesson Pages already loaded here); `panels.notes` still overrides it. The panel is a lazy chunk (React.lazy + retryImport, design-system error boundary, list skeleton fallback) so its MUI dialog/form pieces, the rating widget and the note renderer stay out of the viewer's First Load JS; the Tiptap editor is a further lazy chunk loaded only when a note is created or edited. v1.2 (L5/L6): the "Profundizar" slot defaults to DeepenPanel (AI deepening of the visible Page, keyed by pageId) and "Preguntas" to QuestionsPanel (lesson/module chat, keyed by lessonId), both lazy chunks with the same retryImport + error boundary + skeleton pattern (not exported from the shared feature barrel); `panels.deepen` / `panels.questions` still override them. Depends on next/router, next/head, @shared/design-system, the learning hooks, entities and components.
* Versión: 1.2
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

import MenuBookIcon from "@mui/icons-material/MenuBook";
import Head from "next/head";
import Link from "next/link";
import { useRouter } from "next/router";
import { lazy, Suspense, useEffect } from "react";
import { EmptyState } from "@shared/design-system/components/empty-state";
import { ErrorState } from "@shared/design-system/components/error-state";
import { PageHeader } from "@shared/design-system/components/page-header";
import { RouteErrorBoundary } from "@shared/design-system/components/route-error-boundary";
import { CardSkeleton, ListSkeleton } from "@shared/design-system/components/skeleton";
import { cx } from "@shared/lib/class-names";
import { retryImport } from "@shared/lib/retry-import";
import { LearningBreadcrumb } from "../components/learning-breadcrumb";
import { LessonPageContent } from "../components/lesson-page-content";
import { LessonPageNav } from "../components/lesson-page-nav";
import { LessonSidePanel } from "../components/lesson-side-panel";
import type { LessonSidePanelSlots } from "../components/lesson-side-panel";
import { LockedContentScreen } from "../components/locked-content-screen";
import { PreviewNotice } from "../components/preview-notice";
import type { CurriculumTree, ModuleLocation } from "../entities/curriculum.entity";
import { levelPrerequisiteLinks, locateModule, modulePrerequisiteLinks } from "../entities/curriculum.entity";
import { getLearningErrorMessage } from "../entities/learning-error-messages";
import {
  buildLessonPageUrl,
  buildModuleCompletedUrl,
  buildModuleUrl,
  buildSectionUrl,
  LEARN_HOME_URL,
  parsePageNumber,
} from "../entities/learning-urls";
import type { LessonSummary } from "../entities/lesson.entity";
import { findNextStep, findPreviousStep, resolvePageRedirect } from "../entities/lesson-navigation";
import { useCurriculumTree } from "../hooks/use-curriculum-tree";
import { useLessonPages } from "../hooks/use-lesson-pages";
import { useModuleLessons } from "../hooks/use-module-lessons";
import { usePageContent } from "../hooks/use-page-content";
import { usePageViewTracker } from "../hooks/use-page-view-tracker";
import { usePreviewMode } from "../hooks/use-preview-mode";
import learningStyles from "../../UI/learning.module.css";
import styles from "../../UI/lesson-viewer.module.css";

const LessonNotesPanel = lazy(() =>
  retryImport(() => import("../components/notes/lesson-notes-panel")).then((module) => ({ default: module.LessonNotesPanel })),
);

const DeepenPanel = lazy(() =>
  retryImport(() => import("../components/tutor/deepen-panel")).then((module) => ({ default: module.DeepenPanel })),
);

const QuestionsPanel = lazy(() =>
  retryImport(() => import("../components/tutor/questions-panel")).then((module) => ({ default: module.QuestionsPanel })),
);

// TODO(i18n): move to a learning namespace in src/i18n.
const PAGE_COPY = {
  documentTitle: (title: string) => `${title} | VentyLab`,
  fallbackTitle: "Lección",
  loading: "Cargando la lección…",
  moduleNotFound: "Módulo no disponible",
  lessonNotFound: "Lección no disponible",
  notFoundDescription: "El contenido no existe o todavía no está publicado.",
  backHome: "Volver a Aprender",
  backSection: "Volver a la sección",
  backModule: "Volver al módulo",
  loadErrorTitle: "No se pudo cargar la lección",
  pageOf: (page: number, total: number) => `Página ${page} de ${total}`,
  loadingNotes: "Cargando tus notas…",
  loadingTutor: "Cargando el tutor…",
} as const;

export type LessonViewerPageProps = {
  moduleId: string
  lessonId: string
  // Raw [pageNumber] route segment; validated here so an invalid value can be redirected.
  pageParam: string | null
  // Side panel bodies (L4 notes, L5 deepen, L6 questions); placeholders when absent.
  panels?: LessonSidePanelSlots
};

function isModuleLocked(location: ModuleLocation): boolean {
  return location.module.locked || location.level.locked;
}

function NotFound({ title, href, label }: { title: string, href: string, label: string }) {
  return (
    <EmptyState
      icon={<MenuBookIcon />}
      title={title}
      description={PAGE_COPY.notFoundDescription}
      action={<Link href={href} className={cx(learningStyles.link)}>{label}</Link>}
    />
  );
}

function LockedModule({ tree, location }: { tree: CurriculumTree, location: ModuleLocation }) {
  const { section, level, module } = location;

  return (
    <LockedContentScreen
      title={module.title}
      prerequisites={[
        ...modulePrerequisiteLinks(tree, module.missingPrerequisites),
        ...levelPrerequisiteLinks(tree, level.missingPrerequisites),
      ]}
      backHref={section ? buildSectionUrl(section.id) : LEARN_HOME_URL}
      backLabel={section ? PAGE_COPY.backSection : PAGE_COPY.backHome}
    />
  );
}

type NavTargets = {
  previousHref: string | null
  nextHref: string | null
  isLastPage: boolean
};

function navTargets(moduleId: string, lessons: LessonSummary[] | null, lessonId: string, pageNumber: number | null, pageCount: number | null): NavTargets {
  if (!lessons || pageNumber === null || pageCount === null || pageNumber > pageCount) {
    return { previousHref: null, nextHref: null, isLastPage: false };
  }

  const position = { lessonId, pageNumber };
  const previous = findPreviousStep(lessons, position);
  const next = findNextStep(lessons, position, pageCount);

  return {
    previousHref: previous ? buildLessonPageUrl(moduleId, previous.lessonId, previous.pageNumber) : null,
    nextHref: next ? (next.kind === "complete" ? buildModuleCompletedUrl(moduleId) : buildLessonPageUrl(moduleId, next.lessonId, next.pageNumber)) : null,
    isLastPage: next?.kind === "complete",
  };
}

export function LessonViewerPage({ moduleId, lessonId, pageParam, panels }: LessonViewerPageProps) {
  const router = useRouter();
  const isPreview = usePreviewMode();
  // Fired together on mount: none of these queries waits for another one's data.
  const treeQuery = useCurriculumTree();
  const lessonsQuery = useModuleLessons(moduleId);
  const pagesQuery = useLessonPages(lessonId);
  const pageNumber = parsePageNumber(pageParam);
  const { tree } = treeQuery;
  const { lessons } = lessonsQuery;
  const { pages } = pagesQuery;
  const location = tree ? locateModule(tree, moduleId) : null;
  const lesson = lessons?.find((item) => item.id === lessonId) ?? null;
  // BACKEND GAP (odd/tasks/learning-content-editor.md, "Prerequisite locks are NOT enforced on content reads"):
  // GET /api/pages/{id} answers 200 for locked modules, so the lock is enforced here: the content of a locked
  // module is never requested nor rendered for a student, whatever the backend would return.
  const locked = location !== null && isModuleLocked(location) && !isPreview;
  const canRead = location !== null && lesson !== null && !locked;
  const pageSummary = pages && pageNumber !== null ? pages[pageNumber - 1] ?? null : null;
  const contentQuery = usePageContent(canRead && pageSummary ? pageSummary.id : null);
  const visiblePage = canRead && pageSummary && contentQuery.page?.id === pageSummary.id ? contentQuery.page : null;
  const tracker = usePageViewTracker({ pageId: visiblePage?.id ?? null, moduleId });
  const redirectPage = pages ? resolvePageRedirect(pageNumber, pages.length) : null;
  const redirectHref = redirectPage === null ? null : buildLessonPageUrl(moduleId, lessonId, redirectPage);

  useEffect(() => {
    if (redirectHref) {
      void router.replace(redirectHref);
    }
  }, [redirectHref, router]);

  const title = visiblePage?.title ?? lesson?.title ?? PAGE_COPY.fallbackTitle;
  const nav = navTargets(moduleId, lessons, lessonId, pageNumber, pages?.length ?? null);

  const handleNext = (href: string) => {
    // Fire-and-forget: markViewedNow never rejects and registers at most once per visit.
    void tracker.markViewedNow();
    void router.push(href);
  };

  const renderBody = () => {
    if (!tree) {
      return treeQuery.error && !treeQuery.isLoading
        ? <ErrorState title={PAGE_COPY.loadErrorTitle} description={getLearningErrorMessage(treeQuery.error)} onRetry={() => void treeQuery.reload()} />
        : <CardSkeleton label={PAGE_COPY.loading} />;
    }

    if (!location) {
      return <NotFound title={PAGE_COPY.moduleNotFound} href={LEARN_HOME_URL} label={PAGE_COPY.backHome} />;
    }

    const { section, level, module } = location;
    const breadcrumb = (
      <LearningBreadcrumb section={section} level={level} module={module} lesson={lesson} pageNumber={lesson ? pageNumber : null} />
    );

    if (locked) {
      return (
        <>
          {breadcrumb}
          <PageHeader title={module.title} />
          <LockedModule tree={tree} location={location} />
        </>
      );
    }

    if (lessons && !lesson) {
      return <NotFound title={PAGE_COPY.lessonNotFound} href={buildModuleUrl(moduleId)} label={PAGE_COPY.backModule} />;
    }

    const contentError = lessonsQuery.error ?? pagesQuery.error ?? contentQuery.error;
    const retry = () => {
      void lessonsQuery.reload();
      void pagesQuery.reload();
      void contentQuery.reload();
    };

    return (
      <>
        {breadcrumb}
        <PageHeader
          title={lesson?.title ?? module.title}
          subtitle={pages && pageNumber !== null && redirectHref === null && pages.length > 0 ? PAGE_COPY.pageOf(pageNumber, pages.length) : null}
        />
        {isPreview ? <PreviewNotice /> : null}
        <div className={cx(styles.layout)}>
          <div className={cx(styles.main)}>
            <LessonPageContent
              page={visiblePage}
              isEmpty={pages !== null && pages.length === 0}
              error={visiblePage ? null : contentError}
              onRetry={retry}
            />
            {visiblePage ? <LessonPageNav {...nav} onNext={handleNext} /> : null}
          </div>
          <LessonSidePanel
            {...panels}
            notes={panels?.notes ?? (
              <RouteErrorBoundary resetKey={lessonId}>
                <Suspense fallback={<ListSkeleton label={PAGE_COPY.loadingNotes} />}>
                  <LessonNotesPanel key={lessonId} moduleId={moduleId} lessonId={lessonId} currentPageId={visiblePage?.id ?? null} pages={pages} />
                </Suspense>
              </RouteErrorBoundary>
            )}
            deepen={panels?.deepen ?? (
              <RouteErrorBoundary resetKey={lessonId}>
                <Suspense fallback={<ListSkeleton label={PAGE_COPY.loadingTutor} />}>
                  <DeepenPanel pageId={visiblePage?.id ?? null} />
                </Suspense>
              </RouteErrorBoundary>
            )}
            questions={panels?.questions ?? (
              <RouteErrorBoundary resetKey={lessonId}>
                <Suspense fallback={<ListSkeleton label={PAGE_COPY.loadingTutor} />}>
                  <QuestionsPanel key={lessonId} moduleId={moduleId} lessonId={lessonId} currentPageId={visiblePage?.id ?? null} />
                </Suspense>
              </RouteErrorBoundary>
            )}
          />
        </div>
      </>
    );
  };

  return (
    <div className={cx(styles.viewer)}>
      <Head>
        <title>{PAGE_COPY.documentTitle(title)}</title>
      </Head>
      {renderBody()}
    </div>
  );
}
