/*
* Funcionalidad: EvaluationsListPage
* Descripción: Page /evaluations: the evaluations assigned to the signed-in user (`GET /api/my-evaluations`) in three tabs by state (Activas, Próximas, Cerradas, with counts) and type filter chips (Todas, Examen, Quiz, Taller), both applied on the client because the endpoint has no filters. Each evaluation is an EvaluationCard. Loading skeleton, error with retry and an empty state per tab. The socket events evaluation:activated and grade:published revalidate the list and the grades. Depends on MUI (Tabs, Chip), next/head, the design-system states, the evaluations hooks, entities and components, and the evaluations CSS Module.
* Versión: 1.0
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

import AssignmentIcon from "@mui/icons-material/Assignment";
import Chip from "@mui/material/Chip";
import Tab from "@mui/material/Tab";
import Tabs from "@mui/material/Tabs";
import Head from "next/head";
import { useMemo, useState } from "react";
import { EmptyState } from "@shared/design-system/components/empty-state";
import { ErrorState } from "@shared/design-system/components/error-state";
import { PageHeader } from "@shared/design-system/components/page-header";
import { CardSkeleton } from "@shared/design-system/components/skeleton";
import { cx } from "@shared/lib/class-names";
import { EvaluationCard } from "../components/evaluation-card";
import type { EvaluationState, EvaluationTypeFilter } from "../entities/evaluation.entity";
import { countByState, EVALUATION_STATES, EVALUATION_TYPES, filterEvaluations } from "../entities/evaluation.entity";
import { EVALUATION_STATE_LABELS, EVALUATION_TYPE_LABELS } from "../entities/evaluation-labels";
import { getEvaluationErrorMessage } from "../entities/evaluations-error-messages";
import { useEvaluationsRealtime } from "../hooks/use-evaluations-realtime";
import { useMyEvaluations } from "../hooks/use-my-evaluations";
import styles from "../../UI/evaluations.module.css";

// TODO(i18n): move to an evaluations namespace in src/i18n.
const PAGE_COPY = {
  documentTitle: "Evaluaciones | VentyLab",
  title: "Evaluaciones",
  subtitle: "Exámenes, quizzes y talleres asignados a tus grupos.",
  tabsLabel: "Estado de las evaluaciones",
  typeFilterLabel: "Tipo:",
  allTypes: "Todas",
  loading: "Cargando evaluaciones…",
  loadErrorTitle: "No se pudieron cargar las evaluaciones",
  listLabel: (state: string) => `Evaluaciones ${state.toLowerCase()}`,
  empty: {
    ACTIVE: "No tienes evaluaciones activas.",
    UPCOMING: "No tienes evaluaciones próximas.",
    CLOSED: "No tienes evaluaciones cerradas.",
  } satisfies Record<EvaluationState, string>,
  emptyFiltered: "Prueba con otro tipo de evaluación.",
} as const;

export function EvaluationsListPage() {
  const { evaluations, isLoading, error, reload } = useMyEvaluations();
  const [state, setState] = useState<EvaluationState>("ACTIVE");
  const [type, setType] = useState<EvaluationTypeFilter>(null);

  useEvaluationsRealtime();

  const counts = useMemo(() => countByState(evaluations ?? [], type), [evaluations, type]);
  const visible = useMemo(() => filterEvaluations(evaluations ?? [], state, type), [evaluations, state, type]);
  const typeOptions: ReadonlyArray<EvaluationTypeFilter> = [null, ...EVALUATION_TYPES];

  return (
    <div className={cx(styles.page)}>
      <Head>
        <title>{PAGE_COPY.documentTitle}</title>
      </Head>
      <PageHeader title={PAGE_COPY.title} subtitle={PAGE_COPY.subtitle} />
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
      <div className={cx(styles.filters)} role="group" aria-label={PAGE_COPY.typeFilterLabel}>
        <span className={cx(styles.filtersLabel)}>{PAGE_COPY.typeFilterLabel}</span>
        {typeOptions.map((option) => {
          const selected = option === type;

          return (
            <Chip
              key={option ?? "ALL"}
              label={option ? EVALUATION_TYPE_LABELS[option] : PAGE_COPY.allTypes}
              color={selected ? "primary" : "default"}
              variant={selected ? "filled" : "outlined"}
              aria-pressed={selected}
              onClick={() => setType(option)}
            />
          );
        })}
      </div>
      {!evaluations && isLoading ? <CardSkeleton label={PAGE_COPY.loading} /> : null}
      {!evaluations && !isLoading && error ? (
        <ErrorState
          title={PAGE_COPY.loadErrorTitle}
          description={getEvaluationErrorMessage(error)}
          onRetry={() => void reload()}
        />
      ) : null}
      {evaluations && visible.length === 0 ? (
        <EmptyState
          icon={<AssignmentIcon />}
          title={PAGE_COPY.empty[state]}
          description={type === null ? undefined : PAGE_COPY.emptyFiltered}
        />
      ) : null}
      {visible.length > 0 ? (
        <ul className={cx(styles.grid)} aria-label={PAGE_COPY.listLabel(EVALUATION_STATE_LABELS[state])}>
          {visible.map((evaluation) => (
            <li key={evaluation.assignmentId}>
              <EvaluationCard evaluation={evaluation} />
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
