/*
* Funcionalidad: EvaluationsListPage
* Descripción: Page /evaluations: the evaluations assigned to the signed-in user (`GET /api/my-evaluations`) in three tabs by state (Activas, Próximas, Cerradas, with counts), applied on the client because the endpoint has no state filter. Each evaluation is an EvaluationCard. Loading skeleton, error with retry and an empty state per tab. The socket events evaluation:activated and grade:published revalidate the list and the grades. Depends on MUI (Tabs), next/head, next/link, the design-system states, the evaluations hooks, entities and components and the evaluations CSS Module. v1.1 (Bloque 3, W2): inside each tab the evaluations are grouped as in July — type (📝 Quizzes, 📋 Talleres, 🎓 Exámenes Finales) → track → level (EvaluationTypeSection, groupEvaluations) — instead of the type filter chips; July empty texts ("No tienes evaluaciones asignadas todavía." with nothing assigned, "Sin evaluaciones asignadas." in an empty section); optional moduleId (`?moduleId=` of the "Quiz del módulo" link) narrows the list to one curriculum module with a "Ver todas" link.
* Versión: 1.1
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

import AssignmentIcon from "@mui/icons-material/Assignment";
import Tab from "@mui/material/Tab";
import Tabs from "@mui/material/Tabs";
import Head from "next/head";
import Link from "next/link";
import { useMemo, useState } from "react";
import { EmptyState } from "@shared/design-system/components/empty-state";
import { ErrorState } from "@shared/design-system/components/error-state";
import { PageHeader } from "@shared/design-system/components/page-header";
import { CardSkeleton } from "@shared/design-system/components/skeleton";
import { cx } from "@shared/lib/class-names";
import { EvaluationTypeSection } from "../components/evaluation-type-section";
import type { EvaluationState } from "../entities/evaluation.entity";
import { countByState, EVALUATION_STATES, filterEvaluations } from "../entities/evaluation.entity";
import { EVALUATION_STATE_LABELS } from "../entities/evaluation-labels";
import { getEvaluationErrorMessage } from "../entities/evaluations-error-messages";
import { EVALUATIONS_URL } from "../entities/evaluations-urls";
import { GROUP_COPY, groupEvaluations } from "../entities/group-evaluations";
import { useEvaluationsRealtime } from "../hooks/use-evaluations-realtime";
import { useMyEvaluations } from "../hooks/use-my-evaluations";
import styles from "../../UI/evaluations.module.css";

// TODO(i18n): move to an evaluations namespace in src/i18n.
const PAGE_COPY = {
  documentTitle: "Evaluaciones | VentyLab",
  title: "Evaluaciones",
  subtitle: "Exámenes, quizzes y talleres asignados a tus grupos.",
  tabsLabel: "Estado de las evaluaciones",
  loading: "Cargando evaluaciones…",
  loadErrorTitle: "No se pudieron cargar las evaluaciones",
  groupsLabel: (state: string) => `Evaluaciones ${state.toLowerCase()}`,
  empty: {
    ACTIVE: "No tienes evaluaciones activas.",
    UPCOMING: "No tienes evaluaciones próximas.",
    CLOSED: "No tienes evaluaciones cerradas.",
  } satisfies Record<EvaluationState, string>,
  moduleFilter: "Mostrando solo las evaluaciones del módulo.",
  showAll: "Ver todas",
} as const;

export type EvaluationsListPageProps = {
  // `?moduleId=`: only the evaluations linked to this curriculum module.
  moduleId?: string | null | undefined
};

export function EvaluationsListPage({ moduleId = null }: EvaluationsListPageProps = {}) {
  const { evaluations, isLoading, error, reload } = useMyEvaluations(moduleId);
  const [state, setState] = useState<EvaluationState>("ACTIVE");

  useEvaluationsRealtime();

  const counts = useMemo(() => countByState(evaluations ?? [], null), [evaluations]);
  const visible = useMemo(() => filterEvaluations(evaluations ?? [], state, null), [evaluations, state]);
  const sections = useMemo(() => groupEvaluations(visible), [visible]);
  const nothingAssigned = evaluations !== null && evaluations.length === 0;

  return (
    <div className={cx(styles.page)}>
      <Head>
        <title>{PAGE_COPY.documentTitle}</title>
      </Head>
      <PageHeader title={PAGE_COPY.title} subtitle={PAGE_COPY.subtitle} />
      {moduleId ? (
        <p className={cx(styles.moduleFilter)}>
          <span>{PAGE_COPY.moduleFilter}</span>
          <Link href={EVALUATIONS_URL} className={cx(styles.link)}>{PAGE_COPY.showAll}</Link>
        </p>
      ) : null}
      <Tabs
        value={state}
        onChange={(_event, value: EvaluationState) => setState(value)}
        aria-label={PAGE_COPY.tabsLabel}
        variant="scrollable"
        allowScrollButtonsMobile
      >
        {EVALUATION_STATES.map((option) => (
          <Tab
            key={option}
            value={option}
            label={evaluations ? `${EVALUATION_STATE_LABELS[option]} (${counts[option]})` : EVALUATION_STATE_LABELS[option]}
          />
        ))}
      </Tabs>
      {!evaluations && isLoading ? <CardSkeleton label={PAGE_COPY.loading} /> : null}
      {!evaluations && !isLoading && error ? (
        <ErrorState
          title={PAGE_COPY.loadErrorTitle}
          description={getEvaluationErrorMessage(error)}
          onRetry={() => void reload()}
        />
      ) : null}
      {nothingAssigned ? <EmptyState icon={<AssignmentIcon />} title={GROUP_COPY.emptyAll} /> : null}
      {evaluations && !nothingAssigned && visible.length === 0 ? (
        <EmptyState icon={<AssignmentIcon />} title={PAGE_COPY.empty[state]} />
      ) : null}
      {visible.length > 0 ? (
        <div className={cx(styles.groups)} role="group" aria-label={PAGE_COPY.groupsLabel(EVALUATION_STATE_LABELS[state])}>
          {sections.map((section) => (
            <EvaluationTypeSection key={`${state}-${section.type}`} section={section} />
          ))}
        </div>
      ) : null}
    </div>
  );
}
