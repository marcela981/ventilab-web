/*
* Funcionalidad: SectionPage
* Descripción: Page /learn/[sectionId]: breadcrumb, the section title and its backend progress (`GET /api/progress/sections/{sectionId}`), and its levels as level cards with their own progress and lock state (locked levels show the lock and the links to their missing prerequisites; staff preview them with a hint). Tree and section progress are requested in parallel; a progress failure only hides the bars. Loading skeleton, "not available" state and error with retry. Depends on next/head, @shared/design-system, the learning hooks, entities and components.
* Versión: 1.0
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
import { ListSkeleton } from "@shared/design-system/components/skeleton";
import { cx } from "@shared/lib/class-names";
import { LearningBreadcrumb } from "../components/learning-breadcrumb";
import { LevelCard } from "../components/level-card";
import { PreviewNotice } from "../components/preview-notice";
import { LearningProgressBar } from "../components/progress-bar";
import { findSection } from "../entities/curriculum.entity";
import { getLearningErrorMessage } from "../entities/learning-error-messages";
import { LEARN_HOME_URL } from "../entities/learning-urls";
import { useCurriculumTree } from "../hooks/use-curriculum-tree";
import { usePreviewMode } from "../hooks/use-preview-mode";
import { useSectionProgress } from "../hooks/use-progress";
import { useScrollToHash } from "../hooks/use-scroll-to-hash";
import styles from "../../UI/learning.module.css";

// TODO(i18n): move to a learning namespace in src/i18n.
const PAGE_COPY = {
  documentTitle: (title: string) => `${title} | VentyLab`,
  fallbackTitle: "Sección",
  loading: "Cargando la sección…",
  notFoundTitle: "Sección no disponible",
  notFoundDescription: "La sección no existe o todavía no está publicada.",
  back: "Volver a Aprender",
  emptyLevels: "Esta sección aún no tiene niveles publicados.",
  loadErrorTitle: "No se pudo cargar la sección",
} as const;

export type SectionPageProps = {
  sectionId: string
};

export function SectionPage({ sectionId }: SectionPageProps) {
  const isPreview = usePreviewMode();
  const { tree, isLoading, error, reload } = useCurriculumTree();
  const { progress } = useSectionProgress(sectionId);
  const section = tree ? findSection(tree, sectionId) : null;

  useScrollToHash(section !== null);

  return (
    <div className={cx(styles.page)}>
      <Head>
        <title>{PAGE_COPY.documentTitle(section?.title ?? PAGE_COPY.fallbackTitle)}</title>
      </Head>
      {tree && section ? (
        <>
          <LearningBreadcrumb section={section} />
          <PageHeader title={section.title} subtitle={section.description} />
          {isPreview ? <PreviewNotice /> : null}
          {progress ? <LearningProgressBar title={section.title} progress={progress.overall} /> : null}
          <div className={cx(styles.content)}>
            {section.levels.map((level) => (
              <LevelCard
                key={level.id}
                tree={tree}
                level={level}
                progress={progress?.levels.get(level.id) ?? null}
                isPreview={isPreview}
              />
            ))}
            {section.levels.length === 0 ? <p className={cx(styles.muted)}>{PAGE_COPY.emptyLevels}</p> : null}
          </div>
        </>
      ) : null}
      {tree && !section ? (
        <EmptyState
          icon={<MenuBookIcon />}
          title={PAGE_COPY.notFoundTitle}
          description={PAGE_COPY.notFoundDescription}
          action={<Link href={LEARN_HOME_URL} className={cx(styles.link)}>{PAGE_COPY.back}</Link>}
        />
      ) : null}
      {!tree && isLoading ? <ListSkeleton rows={3} label={PAGE_COPY.loading} /> : null}
      {!tree && !isLoading && error ? (
        <ErrorState title={PAGE_COPY.loadErrorTitle} description={getLearningErrorMessage(error)} onRetry={() => void reload()} />
      ) : null}
    </div>
  );
}
