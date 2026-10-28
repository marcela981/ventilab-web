/*
* Funcionalidad: CurriculumTab
* Descripción: Currículo panel of the /learn workspace (W3, Bloque 2): one load of the curriculum tree and the progress summary (2 parallel SWR requests, no per-module request), every section with its levels (LevelCard) and the levels without section; staff see the preview notice. Skeleton while loading, empty state and error with retry. Lazy loaded by the workspace (lazyPanel). Depends on the design-system states, the learning hooks and components.
* Versión: 0.1
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

import MenuBookIcon from "@mui/icons-material/MenuBook";
import Typography from "@mui/material/Typography";
import { EmptyState } from "@shared/design-system/components/empty-state";
import { ErrorState } from "@shared/design-system/components/error-state";
import { ListSkeleton } from "@shared/design-system/components/skeleton";
import { cx } from "@shared/lib/class-names";
import { getLearningErrorMessage } from "../../entities/learning-error-messages";
import { useCurriculumTree } from "../../hooks/use-curriculum-tree";
import { usePreviewMode } from "../../hooks/use-preview-mode";
import { useProgressSummary } from "../../hooks/use-progress";
import { useScrollToHash } from "../../hooks/use-scroll-to-hash";
import { LevelCard } from "../level-card";
import { PreviewNotice } from "../preview-notice";
import styles from "../../../UI/learning.module.css";

// TODO(i18n): move to a learning namespace in src/i18n.
const COPY = {
  loading: "Cargando el currículo…",
  emptyTitle: "Aún no hay contenido publicado",
  emptyDescription: "Cuando haya módulos publicados, aparecerán aquí.",
  loadErrorTitle: "No se pudo cargar el currículo",
} as const;

export function CurriculumTab() {
  const isPreview = usePreviewMode();
  const { tree, isLoading, error, reload } = useCurriculumTree();
  const { progress } = useProgressSummary();
  const isEmpty = tree !== null && tree.sections.length === 0 && tree.unsectionedLevels.length === 0;

  useScrollToHash(tree !== null);

  if (!tree) {
    return isLoading || !error
      ? <ListSkeleton rows={3} label={COPY.loading} />
      : <ErrorState title={COPY.loadErrorTitle} description={getLearningErrorMessage(error)} onRetry={() => void reload()} />;
  }

  if (isEmpty) {
    return <EmptyState icon={<MenuBookIcon />} title={COPY.emptyTitle} description={COPY.emptyDescription} />;
  }

  const levelCard = (level: (typeof tree.unsectionedLevels)[number]) => (
    <LevelCard key={level.id} tree={tree} level={level} progress={progress?.levels.get(level.id) ?? null} isPreview={isPreview} />
  );

  return (
    <div className={cx(styles.content)}>
      {isPreview ? <PreviewNotice /> : null}
      {tree.sections.map((section) => (
        <section key={section.id} aria-label={section.title} className={cx(styles.content)}>
          <Typography variant="h5" component="h2">{section.title}</Typography>
          {section.levels.map(levelCard)}
        </section>
      ))}
      {tree.unsectionedLevels.map(levelCard)}
    </div>
  );
}
