/*
* Funcionalidad: LessonViewerPage
* Descripción: Page viewer of /learn/modules/[moduleId]/lessons/[lessonId]/[pageNumber]. Navigation state comes ONLY from the URL: pageNumber is the 1-based position of the backend Page inside its lesson (decision 1). Tree, module lessons and lesson Pages load in parallel; the Page content (`GET /api/pages/{id}`) is requested only once its id is known AND the module is visible for the user. An invalid pageNumber is replaced with Page 1, an out-of-range one with the last Page; an unknown module or a lesson outside the module is "not available". A student on a locked module (module or level locked in the curriculum tree) gets the lock screen with prerequisites; teachers/admins preview everything (PreviewNotice, no lock, no view registration). Breadcrumb Sección > Nivel > Módulo > Lección > Página. Previous/Next cross lesson boundaries (lesson-navigation entity); "Siguiente" registers the page view (fire-and-forget, also after 5 s) and navigates; after the last Page "Finalizar módulo" opens the module completion screen (/learn/modules/[moduleId]?completed=1). Side panel Notas | Profundizar | Preguntas with slots for L4-L6. v1.1 (L4): the "Notas" slot defaults to LessonNotesPanel. v1.2 (L5/L6): the "Profundizar" slot defaults to DeepenPanel and "Preguntas" to QuestionsPanel. v1.3 (W3, Bloque 2): "Finalizar módulo" shows the ModuleCompletion card in place of the navigation. v1.4 (W5, Bloque 2): July layout (FLUJOS_JULIO §e.4) without request cascade (DISENO_BLOQUE2 §2.7-2.8). Breadcrumb, lesson title, "Página x de N" with bar and percentage, content, module lesson index on the right (collapsible; Drawer on mobile) and Anterior / Siguiente below; the side panel is gone (its notes / deepen / questions components stay in the feature for the W7 TutorAI popup, which mounts in the `tutorFab` slot). Requests: wave 1 fires together on mount (lesson Pages, module lessons, lesson access and module progress for students, plus the ContentBlocks chunk); wave 2 is only `GET /api/pages/{id}`, which waits for the lesson Pages and nothing else. The curriculum tree is NEVER requested on load (the breadcrumb takes section and level from the tree already cached, if any; the module title comes with the Page); it is fetched only for a module_locked screen (prerequisites) or the module completion card (next module). Locking is the server's: `GET /api/lessons/{id}/access` or a 403 progress.lesson_locked on the Page shows LockedContentScreen with the missing lessons as links; the index locks later incomplete lessons. Once the Page is on screen the next step is prefetched (SWR preload + router.prefetch). Page views (5 s or Siguiente, offline outbox from W2) invalidate the tree only when they complete a lesson. Lesson close: on the last Page of a lesson, a view that completes it (or "Siguiente" on an already completed lesson) opens the "¡Lección Completada!" dialog (lazy chunk) with lazy confetti when it was just completed; "Continuar a la Siguiente Lección" goes to the next lesson with Pages, nothing navigates by itself. Module close: a view answering moduleCompleted (the one that completed the module, or "Finalizar módulo") shows the ModuleCompletion card in place of the navigation. Staff preview: no locks, no view registration, "Editar esta página" link to the Page editor. Depends on next/router, next/head, @shared/design-system, @shared/lib, the learning hooks, entities and components. v1.5 (W7, Bloque 2): TutorAI. The deepen accordion ("¿Te gustaría expandir más este tema?", lazy body) follows the content of every page, keyed by pageId; the TutorAI floating button (lazy popup: Sugerencias, Preguntas, Notas) fills the fixed tutor slot for an accessible lesson (the `tutorFab` prop is gone: the viewer owns the context it needs). A viewer-level prompt store (useSyncExternalStore, no window events) hands suggestion prompts to the accordion or to Preguntas. The popup offers the post-lesson suggestions on the last Page of a completed lesson (module progress, or a view result of this visit).
* Versión: 1.5
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

import EditIcon from "@mui/icons-material/Edit";
import MenuBookIcon from "@mui/icons-material/MenuBook";
import Alert from "@mui/material/Alert";
import Button from "@mui/material/Button";
import Head from "next/head";
import Link from "next/link";
import { useRouter } from "next/router";
import { lazy, Suspense, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { EmptyState } from "@shared/design-system/components/empty-state";
import { PageHeader } from "@shared/design-system/components/page-header";
import { RouteErrorBoundary } from "@shared/design-system/components/route-error-boundary";
import { cx } from "@shared/lib/class-names";
import { retryImport } from "@shared/lib/retry-import";
import type { PageViewResultDTO } from "../../api/dtos/progress.dto";
import { LearningBreadcrumb } from "../components/learning-breadcrumb";
import { launchLessonConfetti } from "../components/lesson-confetti";
import { LessonIndex } from "../components/lesson-index";
import { LessonPageContent, preloadContentBlocks } from "../components/lesson-page-content";
import { LessonPageNav } from "../components/lesson-page-nav";
import { LessonPageProgress } from "../components/lesson-page-progress";
import { LockedContentScreen } from "../components/locked-content-screen";
import { ModuleCompletion } from "../components/module-completion";
import { PreviewNotice } from "../components/preview-notice";
import { DeepenAccordion } from "../components/tutor/deepen-accordion";
import { TutorFab } from "../components/tutor/tutor-fab";
import type { CurriculumTree, PrerequisiteLink } from "../entities/curriculum.entity";
import { findNextModule, levelPrerequisiteLinks, locateModule, modulePrerequisiteLinks } from "../entities/curriculum.entity";
import {
  buildLessonPageUrl,
  buildLevelUrl,
  buildModuleUrl,
  buildPageEditorUrl,
  LEARN_HOME_URL,
  parsePageNumber,
} from "../entities/learning-urls";
import { buildLessonIndex, lessonLockFromError } from "../entities/lesson-access.entity";
import type { LessonLock, LessonPage, LessonSummary } from "../entities/lesson.entity";
import { findNextStep, findPreviousStep, resolvePageRedirect } from "../entities/lesson-navigation";
import { useCachedCurriculumTree, useCurriculumTree } from "../hooks/use-curriculum-tree";
import { useLessonAccess } from "../hooks/use-lesson-access";
import { useLessonPages } from "../hooks/use-lesson-pages";
import { useModuleLessons } from "../hooks/use-module-lessons";
import type { NextPageTarget } from "../hooks/use-next-page-prefetch";
import { useNextPagePrefetch } from "../hooks/use-next-page-prefetch";
import { usePageContent } from "../hooks/use-page-content";
import { usePageViewTracker } from "../hooks/use-page-view-tracker";
import { usePreviewMode } from "../hooks/use-preview-mode";
import { useModuleProgress } from "../hooks/use-progress";
import { TutorPromptContext } from "../hooks/use-tutor-prompt";
import { createTutorPromptStore } from "../session/tutor-prompt-store";
import learningStyles from "../../UI/learning.module.css";
import styles from "../../UI/lesson-viewer.module.css";

const LessonCompleteDialog = lazy(() =>
  retryImport(() => import("../components/lesson-complete-dialog")).then((module) => ({ default: module.LessonCompleteDialog })),
);

// TODO(i18n): move to a learning namespace in src/i18n.
const PAGE_COPY = {
  documentTitle: (title: string) => `${title} | VentyLab`,
  fallbackTitle: "Lección",
  moduleNotFound: "Módulo no disponible",
  lessonNotFound: "Lección no disponible",
  notFoundDescription: "El contenido no existe o todavía no está publicado.",
  backHome: "Volver a Aprender",
  backModule: "Volver al módulo",
  backCurriculum: "Volver al currículo",
  editPage: "Editar esta página",
  moduleIncomplete: "Aún te faltan páginas o lecciones por completar en este módulo.",
} as const;

export type LessonViewerPageProps = {
  moduleId: string
  lessonId: string
  // Raw [pageNumber] route segment; validated here so an invalid value can be redirected.
  pageParam: string | null
};

type NavTargets = {
  previousHref: string | null
  nextHref: string | null
  // The next step after this Page is the end of the module ("Finalizar módulo").
  isLastPage: boolean
  next: NextPageTarget | null
};

const NO_NAV: NavTargets = { previousHref: null, nextHref: null, isLastPage: false, next: null };

// completeHref only enables "Finalizar módulo"; the viewer shows the completion card in place.
function navTargets(moduleId: string, lessons: LessonSummary[] | null, lessonId: string, pageNumber: number | null, pages: LessonPage[] | null, completeHref: string): NavTargets {
  if (!lessons || pageNumber === null || !pages || pageNumber > pages.length) {
    return NO_NAV;
  }

  const position = { lessonId, pageNumber };
  const previous = findPreviousStep(lessons, position);
  const next = findNextStep(lessons, position, pages.length);
  const previousHref = previous ? buildLessonPageUrl(moduleId, previous.lessonId, previous.pageNumber) : null;

  if (!next) {
    return { ...NO_NAV, previousHref };
  }

  if (next.kind === "complete") {
    return { previousHref, nextHref: completeHref, isLastPage: true, next: null };
  }

  const href = buildLessonPageUrl(moduleId, next.lessonId, next.pageNumber);
  const sameLesson = next.lessonId === lessonId;

  return {
    previousHref,
    nextHref: href,
    isLastPage: false,
    next: { href, pageId: sameLesson ? pages[next.pageNumber - 1]?.id ?? null : null, lessonId: sameLesson ? null : next.lessonId },
  };
}

function lockPrerequisites(moduleId: string, lock: LessonLock, tree: CurriculumTree | null): PrerequisiteLink[] {
  if (lock.reason === "previous_lesson_incomplete") {
    return lock.missing.map((missing) => ({ id: missing.lessonId, title: missing.title, href: buildLessonPageUrl(moduleId, missing.lessonId) }));
  }

  const location = tree ? locateModule(tree, moduleId) : null;

  return tree && location
    ? [...modulePrerequisiteLinks(tree, location.module.missingPrerequisites), ...levelPrerequisiteLinks(tree, location.level.missingPrerequisites)]
    : [];
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

export function LessonViewerPage({ moduleId, lessonId, pageParam }: LessonViewerPageProps) {
  const router = useRouter();
  // Hands a TutorAI suggestion prompt to the deepen accordion or the popup's Preguntas tab (one per viewer).
  const [promptStore] = useState(createTutorPromptStore);
  const isPreview = usePreviewMode();
  const pageNumber = parsePageNumber(pageParam);
  // Wave 1: fired together on mount, none waits for another one's data.
  const pagesQuery = useLessonPages(lessonId);
  const lessonsQuery = useModuleLessons(moduleId);
  const access = useLessonAccess(isPreview ? null : lessonId);
  const moduleProgress = useModuleProgress(isPreview ? null : moduleId);
  const cachedTree = useCachedCurriculumTree();

  useEffect(() => {
    preloadContentBlocks();
  }, []);

  const { pages } = pagesQuery;
  const { lessons } = lessonsQuery;
  const lesson = lessons?.find((item) => item.id === lessonId) ?? null;
  const pageSummary = pages && pageNumber !== null ? pages[pageNumber - 1] ?? null : null;
  const accessLock = access.lock ?? null;
  // Wave 2: the Page waits only for the lesson Pages (its id); the server rejects it with 403 if the lesson is locked.
  const contentQuery = usePageContent(pageSummary && !accessLock ? pageSummary.id : null);
  const lock = accessLock ?? lessonLockFromError(contentQuery.error);
  const visiblePage = !lock && pageSummary && contentQuery.page?.id === pageSummary.id ? contentQuery.page : null;
  const redirectPage = pages ? resolvePageRedirect(pageNumber, pages.length) : null;
  const redirectHref = redirectPage === null ? null : buildLessonPageUrl(moduleId, lessonId, redirectPage);

  useEffect(() => {
    if (redirectHref) {
      void router.replace(redirectHref);
    }
  }, [redirectHref, router]);

  const cachedLocation = cachedTree ? locateModule(cachedTree, moduleId) : null;
  const moduleTitle = visiblePage?.moduleTitle ?? cachedLocation?.module.title ?? null;
  const levelId = visiblePage?.levelId ?? cachedLocation?.level.id ?? null;
  const curriculumHref = levelId ? buildLevelUrl(levelId) : LEARN_HOME_URL;
  const nav = navTargets(moduleId, lessons, lessonId, pageNumber, pages, curriculumHref);
  const isLessonEnd = pages !== null && pageNumber !== null && pages.length > 0 && pageNumber === pages.length;

  // Completion state, keyed by the Page it belongs to (a new Page resets it).
  const [dialogPageId, setDialogPageId] = useState<string | null>(null);
  const [dialogLoaded, setDialogLoaded] = useState(false);
  const [moduleDonePageId, setModuleDonePageId] = useState<string | null>(null);
  const [incompletePageId, setIncompletePageId] = useState<string | null>(null);
  // Lesson reported completed by a view result in this visit (the module progress may not be revalidated yet).
  const [completedLessonId, setCompletedLessonId] = useState<string | null>(null);
  const visiblePageId = visiblePage?.id ?? null;
  const moduleDone = visiblePageId !== null && moduleDonePageId === visiblePageId;
  // Fetched only for the screens that need it, never on load.
  const treeQuery = useCurriculumTree(lock?.reason === "module_locked" || moduleDone);
  const tree = treeQuery.tree ?? cachedTree;

  const visiblePageIdRef = useRef(visiblePageId);
  const endsRef = useRef({ isLessonEnd, isModuleEnd: nav.isLastPage });

  useEffect(() => {
    visiblePageIdRef.current = visiblePageId;
    endsRef.current = { isLessonEnd, isModuleEnd: nav.isLastPage };
  }, [visiblePageId, isLessonEnd, nav.isLastPage]);

  // The same result may arrive twice (timer callback and Siguiente): celebrate a Page once.
  const celebratedPageIdRef = useRef<string | null>(null);
  const celebrate = useCallback((result: PageViewResultDTO) => {
    if (result.lessonJustCompleted && celebratedPageIdRef.current !== result.pageId) {
      celebratedPageIdRef.current = result.pageId;
      void launchLessonConfetti();
    }
  }, []);

  const openDialog = useCallback((pageId: string) => {
    setDialogLoaded(true);
    setDialogPageId(pageId);
  }, []);

  // Applies a view result of the visible Page; explicit = "Siguiente"/"Finalizar módulo". Returns whether it took over.
  const applyViewResult = useCallback((result: PageViewResultDTO, explicit: boolean): boolean => {
    const { isLessonEnd: lessonEnd, isModuleEnd: moduleEnd } = endsRef.current;

    if (result.pageId !== visiblePageIdRef.current) {
      return false;
    }

    if (result.lessonCompleted && result.lessonId) {
      setCompletedLessonId(result.lessonId);
    }

    if (result.moduleCompleted && (result.lessonJustCompleted || (explicit && moduleEnd))) {
      setModuleDonePageId(result.pageId);
      celebrate(result);

      return true;
    }

    if (explicit && moduleEnd) {
      setIncompletePageId(result.pageId);

      return true;
    }

    if (lessonEnd && (result.lessonJustCompleted || (explicit && result.lessonCompleted))) {
      openDialog(result.pageId);
      celebrate(result);

      return true;
    }

    return false;
  }, [celebrate, openDialog]);

  const handleViewed = useCallback((result: PageViewResultDTO) => {
    applyViewResult(result, false);
  }, [applyViewResult]);

  const tracker = usePageViewTracker({ pageId: visiblePageId, moduleId, onViewed: handleViewed });

  useNextPagePrefetch(visiblePageId, nav.next);

  const handleNext = (href: string) => {
    if (!visiblePage) {
      return;
    }

    if (isPreview) {
      if (nav.isLastPage) {
        setModuleDonePageId(visiblePage.id);
      } else {
        void router.push(href);
      }

      return;
    }

    if (!isLessonEnd) {
      // Fire-and-forget: markViewedNow never rejects and registers at most once per visit.
      void tracker.markViewedNow();
      void router.push(href);

      return;
    }

    // Last Page of the lesson: the view result decides between the dialog, the module card and navigating.
    void tracker.markViewedNow().then((result) => {
      if (result && applyViewResult(result, true)) {
        return;
      }

      if (!nav.isLastPage) {
        void router.push(href);
      }
    });
  };

  const completedLessonIds = useMemo(() => {
    const progress = moduleProgress.progress;

    return progress ? new Set(progress.lessons.filter((item) => item.completed).map((item) => item.lessonId)) : null;
  }, [moduleProgress.progress]);
  const indexEntries = lessons ? buildLessonIndex({ lessons, completedLessonIds, currentLessonId: lessonId, preview: isPreview }) : null;
  const title = lesson?.title ?? visiblePage?.title ?? PAGE_COPY.fallbackTitle;
  const dialogOpen = visiblePageId !== null && dialogPageId === visiblePageId;
  const continueHref = nav.isLastPage ? null : nav.nextHref;
  const lessonCompleted = completedLessonId === lessonId || (completedLessonIds?.has(lessonId) ?? false);

  const renderMain = () => {
    if (lock) {
      return (
        <LockedContentScreen
          title={lock.reason === "module_locked" ? (moduleTitle ?? title) : title}
          prerequisites={lockPrerequisites(moduleId, lock, tree)}
          backHref={curriculumHref}
          backLabel={levelId ? PAGE_COPY.backCurriculum : PAGE_COPY.backHome}
        />
      );
    }

    const contentError = pagesQuery.error ?? contentQuery.error;
    const retry = () => {
      void pagesQuery.reload();
      void contentQuery.reload();
    };

    return (
      <>
        <LessonPageContent
          page={visiblePage}
          isEmpty={pages !== null && pages.length === 0}
          error={visiblePage ? null : contentError}
          onRetry={retry}
        />
        {visiblePage ? <DeepenAccordion key={visiblePage.id} pageId={visiblePage.id} /> : null}
        {visiblePage && incompletePageId === visiblePage.id && !moduleDone ? (
          <Alert severity="info" className={cx(learningStyles.notice)}>{PAGE_COPY.moduleIncomplete}</Alert>
        ) : null}
        {visiblePage && !moduleDone ? <LessonPageNav previousHref={nav.previousHref} nextHref={nav.nextHref} isLastPage={nav.isLastPage} onNext={handleNext} /> : null}
        {moduleDone ? (
          <ModuleCompletion
            title={moduleTitle ?? title}
            progress={moduleProgress.progress?.overall ?? null}
            nextModule={tree ? findNextModule(tree, { ignoreLocks: isPreview, excludeModuleId: moduleId }) : null}
            backHref={curriculumHref}
            backLabel={PAGE_COPY.backCurriculum}
          />
        ) : null}
      </>
    );
  };

  const renderBody = () => {
    if (lessonsQuery.error?.status === 404) {
      return <NotFound title={PAGE_COPY.moduleNotFound} href={LEARN_HOME_URL} label={PAGE_COPY.backHome} />;
    }

    if (lessons && !lesson) {
      return <NotFound title={PAGE_COPY.lessonNotFound} href={buildModuleUrl(moduleId)} label={PAGE_COPY.backModule} />;
    }

    const showProgress = !lock && pages !== null && pages.length > 0 && pageNumber !== null && redirectHref === null;

    return (
      <>
        <LearningBreadcrumb
          section={cachedLocation?.section ?? null}
          level={cachedLocation?.level ?? null}
          module={moduleTitle ? { id: moduleId, title: moduleTitle } : null}
          lesson={lesson}
          pageNumber={lesson ? pageNumber : null}
        />
        <PageHeader
          title={title}
          actions={isPreview && pageSummary ? (
            <Button component={Link} href={buildPageEditorUrl(pageSummary.id)} variant="outlined" startIcon={<EditIcon />}>
              {PAGE_COPY.editPage}
            </Button>
          ) : null}
        />
        {showProgress && pageNumber !== null && pages ? <LessonPageProgress pageNumber={pageNumber} pageCount={pages.length} /> : null}
        {isPreview ? <PreviewNotice /> : null}
        <div className={cx(styles.layout)}>
          <div className={cx(styles.main)}>{renderMain()}</div>
          {indexEntries ? <LessonIndex moduleId={moduleId} entries={indexEntries} /> : null}
        </div>
      </>
    );
  };

  return (
    <TutorPromptContext.Provider value={promptStore}>
      <div className={cx(styles.viewer)}>
        <Head>
          <title>{PAGE_COPY.documentTitle(title)}</title>
        </Head>
        {renderBody()}
        {dialogLoaded ? (
          <RouteErrorBoundary resetKey={lessonId}>
            <Suspense fallback={null}>
              <LessonCompleteDialog
                open={dialogOpen}
                onClose={() => setDialogPageId(null)}
                onContinue={continueHref ? () => {
                  setDialogPageId(null);
                  void router.push(continueHref);
                } : null}
              />
            </Suspense>
          </RouteErrorBoundary>
        ) : null}
        {lesson && !lock ? (
          <div className={cx(styles.tutorFabSlot)}>
            <TutorFab
              moduleId={moduleId}
              lessonId={lessonId}
              pageId={visiblePageId}
              pageTitle={visiblePage?.title ?? null}
              lessonTitle={lesson.title}
              pages={pages}
              postLesson={isLessonEnd && lessonCompleted}
            />
          </div>
        ) : null}
      </div>
    </TutorPromptContext.Provider>
  );
}
