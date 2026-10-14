/*
* Funcionalidad: LearnHomePage
* Descripción: Page /learn: the curriculum sections in order, each with its backend progress (`GET /api/progress/summary`) and a link to /learn/[sectionId]; the levels without section as level cards; and "Continuar donde quedé", a link to the first unlocked, unfinished module (its page computes the exact lesson and Page). Tree and summary are requested in parallel; a progress failure only hides the bars. Teachers and admins see the preview notice and the continue link ignores locks for them. Loading skeleton, empty state and error with retry. Depends on next/head, next/link, @shared/design-system, the learning hooks, entities and components.
* Versión: 1.0
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

import MenuBookIcon from "@mui/icons-material/MenuBook";
import PlayArrowIcon from "@mui/icons-material/PlayArrow";
import Head from "next/head";
import Link from "next/link";
import { EmptyState } from "@shared/design-system/components/empty-state";
import { ErrorState } from "@shared/design-system/components/error-state";
import { PageHeader } from "@shared/design-system/components/page-header";
import { ListSkeleton } from "@shared/design-system/components/skeleton";
import { cx } from "@shared/lib/class-names";
import { LevelCard } from "../components/level-card";
import { PreviewNotice } from "../components/preview-notice";
import { LearningProgressBar } from "../components/progress-bar";
import { findNextModule } from "../entities/curriculum.entity";
import { getLearningErrorMessage } from "../entities/learning-error-messages";
import { buildModuleUrl, buildSectionUrl } from "../entities/learning-urls";
import { useCurriculumTree } from "../hooks/use-curriculum-tree";
import { usePreviewMode } from "../hooks/use-preview-mode";
import { useProgressSummary } from "../hooks/use-progress";
import { useScrollToHash } from "../hooks/use-scroll-to-hash";
import styles from "../../UI/learning.module.css";

// TODO(i18n): move to a learning namespace in src/i18n.
const PAGE_COPY = {
  documentTitle: "Aprender | VentyLab",
  title: "Aprender",
  subtitle: "Recorre las secciones del curso de ventilación mecánica a tu ritmo.",
  continue: "Continuar donde quedé",
  loading: "Cargando el contenido…",
  emptyTitle: "Aún no hay contenido publicado",
  emptyDescription: "Cuando haya secciones publicadas, aparecerán aquí.",
  loadErrorTitle: "No se pudo cargar el contenido",
  sections: "Secciones",
  otherLevels: "Otros niveles",
} as const;

export function LearnHomePage() {
  const isPreview = usePreviewMode();
  const { tree, isLoading, error, reload } = useCurriculumTree();
  const { progress } = useProgressSummary();
  const next = tree ? findNextModule(tree, { ignoreLocks: isPreview }) : null;
  const isEmpty = tree !== null && tree.sections.length === 0 && tree.unsectionedLevels.length === 0;

  useScrollToHash(tree !== null);

  const continueLink = next ? (
    <Link href={buildModuleUrl(next.id)} className={cx(styles.primaryAction)}>
      <PlayArrowIcon fontSize="small" aria-hidden="true" />
      {PAGE_COPY.continue}
    </Link>
  ) : null;

  return (
    <div className={cx(styles.page)}>
      <Head>
        <title>{PAGE_COPY.documentTitle}</title>
      </Head>
      <PageHeader title={PAGE_COPY.title} subtitle={PAGE_COPY.subtitle} actions={continueLink} />
      {isPreview ? <PreviewNotice /> : null}
      {tree && !isEmpty ? (
        <div className={cx(styles.content)}>
          <ul aria-label={PAGE_COPY.sections} className={cx(styles.cards)}>
            {tree.sections.map((section) => {
              const sectionProgress = progress?.sections.get(section.id) ?? null;

              return (
                <li key={section.id} className={cx(styles.card)}>
                  <Link href={buildSectionUrl(section.id)} className={cx(styles.cardTitle)}>
                    {section.title}
                  </Link>
                  {section.description ? <p className={cx(styles.muted)}>{section.description}</p> : null}
                  {sectionProgress ? <LearningProgressBar title={section.title} progress={sectionProgress} /> : null}
                </li>
              );
            })}
          </ul>
          {tree.unsectionedLevels.length > 0 ? (
            <section aria-label={PAGE_COPY.otherLevels} className={cx(styles.content)}>
              {tree.unsectionedLevels.map((level) => (
                <LevelCard
                  key={level.id}
                  tree={tree}
                  level={level}
                  progress={progress?.levels.get(level.id) ?? null}
                  isPreview={isPreview}
                />
              ))}
            </section>
          ) : null}
        </div>
      ) : null}
      {isEmpty ? (
        <EmptyState icon={<MenuBookIcon />} title={PAGE_COPY.emptyTitle} description={PAGE_COPY.emptyDescription} />
      ) : null}
      {!tree && isLoading ? <ListSkeleton rows={3} label={PAGE_COPY.loading} /> : null}
      {!tree && !isLoading && error ? (
        <ErrorState title={PAGE_COPY.loadErrorTitle} description={getLearningErrorMessage(error)} onRetry={() => void reload()} />
      ) : null}
    </div>
  );
}
