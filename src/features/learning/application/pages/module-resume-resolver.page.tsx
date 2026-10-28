/*
* Funcionalidad: ModuleResumeResolver
* Descripción: Page /learn/modules/[moduleId] (W3, Bloque 2; DISENO_BLOQUE2 §2.2 and §2.3): it has no content of its own, it resolves where the module continues and replaces the URL with that lesson page. The tree (lock state; usually cached by the Currículo tab), the module lessons and the module progress are requested IN PARALLEL; the target is findContinueTarget (first unfinished lesson at its first unviewed page, a review from the start when everything was viewed). Staff go to the first lesson page (no progress read, locks ignored). A student on a locked module (module or level locked in the tree) gets LockedContentScreen with the prerequisite links, never a redirect. A failed progress read falls back to the first lesson; a module whose lessons have no pages shows an empty state; an unknown module "not available"; tree or lessons errors are retryable. The completion card no longer lives here (the ?completed=1 route behaviour is gone). Depends on next/head, next/link, next/router, the design-system states, the learning hooks, entities and components.
* Versión: 0.1
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
import { useEffect } from "react";
import { EmptyState } from "@shared/design-system/components/empty-state";
import { ErrorState } from "@shared/design-system/components/error-state";
import { PageHeader } from "@shared/design-system/components/page-header";
import { CardSkeleton } from "@shared/design-system/components/skeleton";
import { cx } from "@shared/lib/class-names";
import { LearningBreadcrumb } from "../components/learning-breadcrumb";
import { LockedContentScreen } from "../components/locked-content-screen";
import { findContinueTarget } from "../entities/continue-target";
import type { CurriculumTree, ModuleLocation } from "../entities/curriculum.entity";
import { levelPrerequisiteLinks, locateModule, modulePrerequisiteLinks } from "../entities/curriculum.entity";
import { getLearningErrorMessage } from "../entities/learning-error-messages";
import { buildCurriculumUrl, buildLessonPageUrl, buildLevelUrl } from "../entities/learning-urls";
import { useCurriculumTree } from "../hooks/use-curriculum-tree";
import { useModuleLessons } from "../hooks/use-module-lessons";
import { usePreviewMode } from "../hooks/use-preview-mode";
import { useModuleProgress } from "../hooks/use-progress";
import styles from "../../UI/learning.module.css";

// TODO(i18n): move to a learning namespace in src/i18n.
export const MODULE_RESUME_COPY = {
  documentTitle: (title: string) => `${title} | VentyLab`,
  fallbackTitle: "Módulo",
  resolving: "Abriendo el módulo…",
  notFoundTitle: "Módulo no disponible",
  notFoundDescription: "El módulo no existe o todavía no está publicado.",
  emptyTitle: "Próximamente",
  emptyDescription: "Este módulo todavía no tiene lecciones con contenido.",
  backCurriculum: "Volver al currículo",
  loadErrorTitle: "No se pudo abrir el módulo",
} as const;

export type ModuleResumeResolverProps = {
  moduleId: string
};

function isLocked(location: ModuleLocation): boolean {
  return location.module.locked || location.level.locked;
}

function LockedModule({ tree, location }: { tree: CurriculumTree, location: ModuleLocation }) {
  const { section, level, module } = location;

  return (
    <>
      <LearningBreadcrumb section={section} level={level} module={module} />
      <PageHeader title={module.title} subtitle={module.description} />
      <LockedContentScreen
        title={module.title}
        prerequisites={[
          ...modulePrerequisiteLinks(tree, module.missingPrerequisites),
          ...levelPrerequisiteLinks(tree, level.missingPrerequisites),
        ]}
        backHref={buildLevelUrl(level.id)}
        backLabel={MODULE_RESUME_COPY.backCurriculum}
      />
    </>
  );
}

export function ModuleResumeResolver({ moduleId }: ModuleResumeResolverProps) {
  const router = useRouter();
  const isPreview = usePreviewMode();
  // Fired together on mount: none of these queries waits for another one's data.
  const treeQuery = useCurriculumTree();
  const lessonsQuery = useModuleLessons(moduleId);
  const progressQuery = useModuleProgress(isPreview ? null : moduleId);
  const { tree } = treeQuery;
  const { lessons } = lessonsQuery;
  const location = tree ? locateModule(tree, moduleId) : null;
  const studentLocked = location !== null && isLocked(location) && !isPreview;
  const progressSettled = isPreview || progressQuery.progress !== null || progressQuery.error !== null;
  const canResolve = location !== null && !studentLocked && lessons !== null && progressSettled;
  // Staff always start at the first lesson; a failed progress read degrades to the same start.
  const target = canResolve && lessons ? findContinueTarget(lessons, isPreview ? null : (progressQuery.progress?.lessons ?? null)) : null;
  const targetHref = target ? buildLessonPageUrl(moduleId, target.lessonId, target.pageNumber) : null;

  useEffect(() => {
    if (targetHref) {
      void router.replace(targetHref);
    }
  }, [targetHref, router]);

  const title = location?.module.title ?? MODULE_RESUME_COPY.fallbackTitle;
  const backLink = (
    <Link href={location ? buildLevelUrl(location.level.id) : buildCurriculumUrl()} className={cx(styles.link)}>
      {MODULE_RESUME_COPY.backCurriculum}
    </Link>
  );

  const renderBody = () => {
    const loadError = (tree ? null : treeQuery.error) ?? lessonsQuery.error;

    if (tree && !location) {
      return <EmptyState icon={<MenuBookIcon />} title={MODULE_RESUME_COPY.notFoundTitle} description={MODULE_RESUME_COPY.notFoundDescription} action={backLink} />;
    }

    if (tree && location && studentLocked) {
      return <LockedModule tree={tree} location={location} />;
    }

    if (loadError && !treeQuery.isLoading && !lessonsQuery.isLoading) {
      const retry = () => {
        void treeQuery.reload();
        void lessonsQuery.reload();
      };

      return <ErrorState title={MODULE_RESUME_COPY.loadErrorTitle} description={getLearningErrorMessage(loadError)} onRetry={retry} />;
    }

    if (canResolve && !target) {
      return <EmptyState icon={<MenuBookIcon />} title={MODULE_RESUME_COPY.emptyTitle} description={MODULE_RESUME_COPY.emptyDescription} action={backLink} />;
    }

    return <CardSkeleton label={MODULE_RESUME_COPY.resolving} />;
  };

  return (
    <div className={cx(styles.page)}>
      <Head>
        <title>{MODULE_RESUME_COPY.documentTitle(title)}</title>
      </Head>
      {renderBody()}
    </div>
  );
}
