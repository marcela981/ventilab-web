/*
* Funcionalidad: ModulePage
* Descripción: Page /learn/modules/[moduleId]: breadcrumb (section > level > module), module header, backend module progress (`GET /api/progress/modules/{moduleId}`), the lessons (`GET /api/modules/{id}/lessons`) with per-lesson page progress, and the "Continuar donde quedé" link (continue-target: first unviewed Page, an approximation valid while Pages are viewed in order). The tree, the module progress and the lessons are requested IN PARALLEL (no query waits for another). A locked module (module or its level locked in the tree) shows LockedContentScreen with the prerequisite links to students, never blank content; staff preview it with a hint. Loading skeletons, "not available" state and errors with retry; a progress failure only hides the progress. v1.1 (L3): `completed` (route ?completed=1, set by the viewer after the last Page) shows the module completion card with the backend progress and the next unlocked module; the continue link is hidden when the module progress failed. Depends on next/head, next/link, @shared/design-system, the learning hooks, entities and components.
* Versión: 1.1
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

import MenuBookIcon from "@mui/icons-material/MenuBook";
import Head from "next/head";
import Link from "next/link";
import { EmptyState } from "@shared/design-system/components/empty-state";
import { ErrorState } from "@shared/design-system/components/error-state";
import { PageHeader } from "@shared/design-system/components/page-header";
import { CardSkeleton } from "@shared/design-system/components/skeleton";
import { cx } from "@shared/lib/class-names";
import { LearningBreadcrumb } from "../components/learning-breadcrumb";
import { LockedContentScreen } from "../components/locked-content-screen";
import { LockedHint } from "../components/locked-hint";
import { ModuleCompletion } from "../components/module-completion";
import { ModuleLessons } from "../components/module-lessons";
import { PreviewNotice } from "../components/preview-notice";
import { LearningProgressBar } from "../components/progress-bar";
import type { CurriculumTree, ModuleLocation } from "../entities/curriculum.entity";
import { findNextModule, levelPrerequisiteLinks, locateModule, modulePrerequisiteLinks } from "../entities/curriculum.entity";
import { getLearningErrorMessage } from "../entities/learning-error-messages";
import { buildSectionUrl, LEARN_HOME_URL } from "../entities/learning-urls";
import { useCurriculumTree } from "../hooks/use-curriculum-tree";
import type { ModuleProgress } from "../entities/progress.entity";
import { useModuleLessons } from "../hooks/use-module-lessons";
import type { UseModuleLessonsResult } from "../hooks/use-module-lessons";
import { usePreviewMode } from "../hooks/use-preview-mode";
import { useModuleProgress } from "../hooks/use-progress";
import type { ProgressQueryResult } from "../hooks/use-progress";
import styles from "../../UI/learning.module.css";

// TODO(i18n): move to a learning namespace in src/i18n.
const PAGE_COPY = {
  documentTitle: (title: string) => `${title} | VentyLab`,
  fallbackTitle: "Módulo",
  loading: "Cargando el módulo…",
  notFoundTitle: "Módulo no disponible",
  notFoundDescription: "El módulo no existe o todavía no está publicado.",
  backHome: "Volver a Aprender",
  backSection: "Volver a la sección",
  loadErrorTitle: "No se pudo cargar el módulo",
} as const;

export type ModulePageProps = {
  moduleId: string
  // Completion screen requested by the viewer (/learn/modules/[moduleId]?completed=1).
  completed?: boolean
};

type ModuleBodyProps = {
  tree: CurriculumTree
  location: ModuleLocation
  moduleId: string
  isPreview: boolean
  completed: boolean
  lessonsQuery: UseModuleLessonsResult
  progressQuery: ProgressQueryResult<ModuleProgress>
};

// Receives the query results as props: the queries live in ModulePage so they start before the tree resolves.
function ModuleBody({ tree, location, moduleId, isPreview, completed, lessonsQuery, progressQuery }: ModuleBodyProps) {
  const { section, level, module } = location;
  const locked = module.locked || level.locked;
  const prerequisites = [
    ...modulePrerequisiteLinks(tree, module.missingPrerequisites),
    ...levelPrerequisiteLinks(tree, level.missingPrerequisites),
  ];
  const backHref = section ? buildSectionUrl(section.id) : LEARN_HOME_URL;
  const backLabel = section ? PAGE_COPY.backSection : PAGE_COPY.backHome;

  return (
    <>
      <LearningBreadcrumb section={section} level={level} module={module} />
      <PageHeader title={module.title} subtitle={module.description} />
      {locked && !isPreview ? (
        <LockedContentScreen
          title={module.title}
          prerequisites={prerequisites}
          backHref={backHref}
          backLabel={backLabel}
        />
      ) : (
        <>
          {isPreview ? <PreviewNotice /> : null}
          {locked ? <LockedHint prerequisites={prerequisites} /> : null}
          {completed ? (
            <ModuleCompletion
              title={module.title}
              progress={progressQuery.progress?.overall ?? null}
              nextModule={findNextModule(tree, { ignoreLocks: isPreview, excludeModuleId: module.id })}
              backHref={backHref}
              backLabel={backLabel}
            />
          ) : null}
          {progressQuery.progress && !completed ? (
            <LearningProgressBar title={module.title} progress={progressQuery.progress.overall} />
          ) : null}
          <ModuleLessons
            moduleId={moduleId}
            lessons={lessonsQuery.lessons}
            isLoading={lessonsQuery.isLoading}
            error={lessonsQuery.error}
            onRetry={() => void lessonsQuery.reload()}
            progress={progressQuery.progress?.lessons ?? null}
          />
        </>
      )}
    </>
  );
}

export function ModulePage({ moduleId, completed = false }: ModulePageProps) {
  const isPreview = usePreviewMode();
  // Fired together on mount: none of these queries is gated on another one's data.
  const { tree, isLoading, error, reload } = useCurriculumTree();
  const lessonsQuery = useModuleLessons(moduleId);
  const progressQuery = useModuleProgress(moduleId);
  const location = tree ? locateModule(tree, moduleId) : null;
  const title = location?.module.title ?? PAGE_COPY.fallbackTitle;

  return (
    <div className={cx(styles.page)}>
      <Head>
        <title>{PAGE_COPY.documentTitle(title)}</title>
      </Head>
      {tree && location ? (
        <ModuleBody
          tree={tree}
          location={location}
          moduleId={moduleId}
          isPreview={isPreview}
          completed={completed}
          lessonsQuery={lessonsQuery}
          progressQuery={progressQuery}
        />
      ) : null}
      {tree && !location ? (
        <EmptyState
          icon={<MenuBookIcon />}
          title={PAGE_COPY.notFoundTitle}
          description={PAGE_COPY.notFoundDescription}
          action={<Link href={LEARN_HOME_URL} className={cx(styles.link)}>{PAGE_COPY.backHome}</Link>}
        />
      ) : null}
      {!tree && isLoading ? <CardSkeleton label={PAGE_COPY.loading} /> : null}
      {!tree && !isLoading && error ? (
        <ErrorState title={PAGE_COPY.loadErrorTitle} description={getLearningErrorMessage(error)} onRetry={() => void reload()} />
      ) : null}
    </div>
  );
}
