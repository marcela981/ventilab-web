/*
* Funcionalidad: ResultsTab
* Descripción: "Resultados" tab of the staff evaluation hub: the READY evaluations the caller can see (or the archived ones with "Mostrar archivadas"), first 50 by last update (`GET /api/evaluations`), each with its type and a "Ver resultados" link to the statistics tab of the unified grading screen (/grading/evaluations/<id>?tab=estadisticas). Loading, error with retry and empty states. Depends on MUI, next/link, the design-system states, the authoring list hook and entities, the staff hub entities and the staff hub CSS Module.
* Versión: 1.0
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

import InsightsIcon from "@mui/icons-material/Insights";
import Checkbox from "@mui/material/Checkbox";
import FormControlLabel from "@mui/material/FormControlLabel";
import Link from "next/link";
import { useMemo, useState } from "react";
import { EmptyState } from "@shared/design-system/components/empty-state";
import { ErrorState } from "@shared/design-system/components/error-state";
import { LoadingState } from "@shared/design-system/components/loading-state";
import { cx } from "@shared/lib/class-names";
import { EMPTY_EVALUATION_FILTERS, EVALUATION_TYPE_LABELS, toEvaluationListQuery } from "../../entities/evaluation-authoring.entity";
import { getAuthoringErrorMessage } from "../../entities/evaluation-authoring-error-messages";
import { buildEvaluationResultsUrl } from "../../entities/staff-hub.entity";
import { useAuthoringEvaluations } from "../../hooks/use-authoring-evaluations";
import styles from "../../../UI/staff-hub.module.css";

// TODO(i18n): move to an evaluation-authoring namespace in src/i18n.
export const RESULTS_TAB_COPY = {
  intro: "Estadísticas y publicación de las notas de cada evaluación.",
  showArchived: "Mostrar archivadas",
  loading: "Cargando evaluaciones…",
  loadErrorTitle: "No se pudieron cargar las evaluaciones",
  empty: "No hay evaluaciones listas para consultar resultados.",
  emptyArchived: "No hay evaluaciones archivadas.",
  listLabel: "Evaluaciones con resultados",
  open: "Ver resultados",
} as const;

const RESULTS_LIMIT = 50;

export function ResultsTab() {
  const [archived, setArchived] = useState(false);
  const query = useMemo(
    () => toEvaluationListQuery({ ...EMPTY_EVALUATION_FILTERS, status: archived ? "ARCHIVED" : "READY" }, 0, RESULTS_LIMIT),
    [archived],
  );
  const { page, isLoading, error, reload } = useAuthoringEvaluations(query);

  return (
    <div className={cx(styles.results)}>
      <div className={cx(styles.resultsToolbar)}>
        <p className={cx(styles.muted)}>{RESULTS_TAB_COPY.intro}</p>
        <FormControlLabel
          control={<Checkbox checked={archived} onChange={(_event, checked) => setArchived(checked)} />}
          label={RESULTS_TAB_COPY.showArchived}
        />
      </div>
      {!page && isLoading ? <LoadingState label={RESULTS_TAB_COPY.loading} /> : null}
      {!page && !isLoading && error ? (
        <ErrorState title={RESULTS_TAB_COPY.loadErrorTitle} description={getAuthoringErrorMessage(error)} onRetry={() => void reload()} />
      ) : null}
      {page && page.items.length === 0 ? (
        <EmptyState icon={<InsightsIcon />} title={archived ? RESULTS_TAB_COPY.emptyArchived : RESULTS_TAB_COPY.empty} />
      ) : null}
      {page && page.items.length > 0 ? (
        <ul className={cx(styles.resultsList)} aria-label={RESULTS_TAB_COPY.listLabel}>
          {page.items.map((evaluation) => (
            <li key={evaluation.id} className={cx(styles.resultsItem)}>
              <span className={cx(styles.resultsTitle)}>{evaluation.title}</span>
              <span className={cx(styles.muted)}>{EVALUATION_TYPE_LABELS[evaluation.type]}</span>
              <Link
                href={buildEvaluationResultsUrl(evaluation.id)}
                className={cx(styles.link)}
                aria-label={`${RESULTS_TAB_COPY.open}: ${evaluation.title}`}
              >
                {RESULTS_TAB_COPY.open}
              </Link>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
