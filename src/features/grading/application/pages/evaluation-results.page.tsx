/*
* Funcionalidad: EvaluationResultsBody
* Descripción: v2.0 (Bloque 3, W7): the former results page is now the body of the "Estadísticas" and "Publicación masiva" tabs of the unified grading screen /grading/evaluations/[evaluationId] (section prop): "estadisticas" shows the statistics, the group filter, the attempts per group and the published grades per student; "publicacion" shows the group filter, "Publicar calificaciones" with its confirmation, the stats delay notice and the attempts per group. The page header, document title and back link moved to the screen. Before: Staff page /grading/evaluations/[evaluationId] (teachers and admins). Shows the statistics the API computes for the evaluation (`GET /api/analytics/evaluations/{evaluationId}/stats`): average, median, minimum and maximum grade in es-CO, pass rate as a percentage, the passing grade of the API and the total, graded and published attempt counts; nothing is computed on the client. The grade histogram (the API 0.5 buckets) and the per-question difficulty index are drawn by a lazily loaded chart chunk (@shared/charts and Chart.js stay out of the page chunk); without graded attempts the charts are replaced by a note, and without attempts the page shows an empty state. A group filter (the groups of `GET /api/evaluation-assignments?evaluationId`) narrows the per-group attempt counts table, the per-student results and the bulk publish. The API has no per-evaluation results endpoint (reported gap): the per-student section explains it and, for a chosen group, lists the published grades of this evaluation read from the group dashboard (`GET /api/analytics/groups/{groupId}/dashboard`). "Publicar calificaciones" asks for confirmation stating the scope only (all graded, unpublished grades of the chosen group or of every group), then sends `POST /api/evaluation-grading/publish` {evaluationId, groupId?}, toasts the publishedCount of the response and refreshes the grading reads (stats, assignments, dashboard, queue). Links back to /grading. Depends on MUI, next/head, next/link, the design-system components, @shared/lib, the grading hooks, service, entities and components and the CSS Module. v1.1 (G3 review): W1/S1 no client-side estimate (the confirmation states the scope, the toast reports the API publishedCount, the button is not disabled by computed counts); W2 after a successful publish an info note warns that the stats (cached up to 60 s by the backend) may take up to a minute, and the stats are revalidated once more after STATS_REFRESH_DELAY_MS while the page stays mounted (timer cleared on unmount); S2 a note states that the indicators cover every group (the stats have no group filter). v2.1 (ajustes C1): the bulk publication becomes a release with a scope choice ("Solo la nota" by default, or "Nota, respuestas y retroalimentación IA") sent as scope in `POST /api/evaluation-grading/publish`; the confirmation and the toast speak of released results (publishedCount counts the attempts whose release changed).
* Versión: 2.1
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

import BarChartIcon from "@mui/icons-material/BarChart";
import Alert from "@mui/material/Alert";
import Button from "@mui/material/Button";
import FormControl from "@mui/material/FormControl";
import FormControlLabel from "@mui/material/FormControlLabel";
import FormLabel from "@mui/material/FormLabel";
import Radio from "@mui/material/Radio";
import RadioGroup from "@mui/material/RadioGroup";
import TextField from "@mui/material/TextField";
import { useEffect, useId, useMemo, useRef, useState } from "react";
import { ConfirmDialog } from "@shared/design-system/components/confirm-dialog";
import { EmptyState } from "@shared/design-system/components/empty-state";
import { ErrorState } from "@shared/design-system/components/error-state";
import { CardSkeleton, ListSkeleton } from "@shared/design-system/components/skeleton";
import { useToast } from "@shared/design-system/components/use-toast";
import { cx } from "@shared/lib/class-names";
import { publishEvaluationGrades } from "../../api/services/grading.service";
import { AssignmentCountsTable } from "../components/results/assignment-counts-table";
import { EvaluationResultsCharts } from "../components/results/lazy-evaluation-results-charts";
import { StudentResultsTable } from "../components/results/student-results-table";
import {
  assignmentGroups,
  formatCount,
  formatRate,
  formatStatGrade,
} from "../entities/evaluation-results.entity";
import type { EvaluationStats } from "../entities/evaluation-results.entity";
import { ALL_OPTION } from "../entities/grading.entity";
import { getGradingErrorMessage } from "../entities/grading-error-messages";
import { RELEASE_SCOPES } from "../entities/results-release.entity";
import type { ReleaseScope } from "../entities/results-release.entity";
import { useEvaluationAssignments, useEvaluationStats, useGroupStudentResults } from "../hooks/use-evaluation-results";
import { useGradingMutation } from "../hooks/use-grading-mutation";
import styles from "../../UI/evaluation-results.module.css";

// TODO(i18n): move to a grading namespace in src/i18n.
const RELEASE_WHAT: Record<ReleaseScope, string> = {
  GRADE: "Se liberará solo la nota (las respuestas, las explicaciones y la retroalimentación IA seguirán ocultas)",
  GRADE_AND_ANSWERS: "Se liberarán la nota, las respuestas correctas, las explicaciones y la retroalimentación IA",
};

export const RESULTS_COPY = {
  publishIntro: "Libera de una vez los resultados de los intentos ya calificados, de todos los grupos o de uno. Los intentos en curso o por revisar quedan fuera.",
  scopeLabel: "Qué verá el estudiante",
  scopes: {
    GRADE: "Solo la nota",
    GRADE_AND_ANSWERS: "Nota, respuestas y retroalimentación IA",
  } satisfies Record<ReleaseScope, string>,
  loading: "Cargando los resultados…",
  loadErrorTitle: "No se pudieron cargar los resultados",
  emptyTitle: "Todavía no hay intentos en esta evaluación",
  emptyDescription: "Las estadísticas aparecerán cuando los estudiantes presenten la evaluación.",
  kpiLabel: "Indicadores de la evaluación",
  kpiScope: "Indicadores de todos los grupos",
  average: "Promedio",
  median: "Mediana",
  passRate: "Tasa de aprobación",
  passingGrade: "Nota mínima aprobatoria",
  minGrade: "Nota más baja",
  maxGrade: "Nota más alta",
  totalAttempts: "Intentos",
  gradedCount: "Calificados",
  publishedCount: "Publicados",
  noGradedYet: "Las gráficas aparecerán cuando haya intentos calificados.",
  group: "Grupo",
  allGroups: "Todos los grupos",
  groupsTitle: "Intentos por grupo",
  groupsLoading: "Cargando los grupos…",
  groupsError: "No se pudieron cargar los grupos de la evaluación.",
  groupsEmpty: "Esta evaluación todavía no está asignada a ningún grupo.",
  studentsTitle: "Resultados por estudiante",
  studentsGap: "La API todavía no ofrece las notas de cada estudiante en una evaluación. Aquí solo se muestran las notas ya publicadas, tomadas del panel del grupo; las notas calificadas sin publicar no están disponibles.",
  studentsChooseGroup: "Elige un grupo para ver las notas publicadas de sus estudiantes.",
  studentsLoading: "Cargando las notas del grupo…",
  studentsError: "No se pudieron cargar las notas del grupo.",
  studentsEmpty: "Ningún estudiante de este grupo tiene una nota publicada en esta evaluación.",
  retry: "Reintentar",
  publish: "Liberar resultados",
  publishTitle: "¿Liberar los resultados?",
  publishScopeAll: (scope: ReleaseScope) => `${RELEASE_WHAT[scope]} de todos los intentos calificados de todos los grupos. No se puede deshacer.`,
  publishScopeGroup: (group: string, scope: ReleaseScope) => `${RELEASE_WHAT[scope]} de todos los intentos calificados del grupo ${group}. No se puede deshacer.`,
  statsDelay: "Las estadísticas pueden tardar hasta 1 minuto en actualizarse.",
  publishConfirm: "Liberar",
  cancel: "Cancelar",
  published: (count: number) => {
    if (count === 0) {
      return "No había resultados pendientes de liberar.";
    }

    return count === 1 ? "Se liberaron los resultados de 1 intento." : `Se liberaron los resultados de ${formatCount(count)} intentos.`;
  },
} as const;

// The backend caches the stats for up to 60 s: revalidate once more after that window.
export const STATS_REFRESH_DELAY_MS = 65_000;

const NATIVE_SELECT = { select: { native: true }, inputLabel: { shrink: true } } as const;

function Kpis({ stats }: { stats: EvaluationStats }) {
  const items: [string, string][] = [
    [RESULTS_COPY.average, formatStatGrade(stats.averageGrade)],
    [RESULTS_COPY.median, formatStatGrade(stats.medianGrade)],
    [RESULTS_COPY.passRate, formatRate(stats.passRate)],
    [RESULTS_COPY.passingGrade, formatStatGrade(stats.passingGrade)],
    [RESULTS_COPY.minGrade, formatStatGrade(stats.minGrade)],
    [RESULTS_COPY.maxGrade, formatStatGrade(stats.maxGrade)],
    [RESULTS_COPY.totalAttempts, formatCount(stats.totalAttempts)],
    [RESULTS_COPY.gradedCount, formatCount(stats.gradedCount)],
    [RESULTS_COPY.publishedCount, formatCount(stats.publishedCount)],
  ];

  return (
    <dl className={cx(styles.kpis)} aria-label={RESULTS_COPY.kpiLabel}>
      {items.map(([label, value]) => (
        <div key={label} className={cx(styles.kpi)}>
          <dt className={cx(styles.kpiLabel)}>{label}</dt>
          <dd className={cx(styles.kpiValue)}>{value}</dd>
        </div>
      ))}
    </dl>
  );
}

export type ResultsSection = "estadisticas" | "publicacion";

export type EvaluationResultsBodyProps = {
  evaluationId: string
  section: ResultsSection
};

export function EvaluationResultsBody({ evaluationId, section }: EvaluationResultsBodyProps) {
  const toast = useToast();
  const groupFieldId = useId();
  const stats = useEvaluationStats(evaluationId);
  const assignments = useEvaluationAssignments(evaluationId);
  const [groupId, setGroupId] = useState<string>(ALL_OPTION);
  const selectedGroup = groupId === ALL_OPTION ? null : groupId;
  const students = useGroupStudentResults(section === "estadisticas" ? selectedGroup : null, evaluationId);
  const { pending: publishing, run } = useGradingMutation();
  const [confirmPublish, setConfirmPublish] = useState(false);
  // The least revealing release by default: a release cannot be undone.
  const [scope, setScope] = useState<ReleaseScope>("GRADE");
  const [statsDelayed, setStatsDelayed] = useState(false);
  const refreshTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const reloadStats = stats.reload;

  useEffect(() => () => {
    if (refreshTimerRef.current !== null) {
      clearTimeout(refreshTimerRef.current);
    }
  }, []);

  const groups = useMemo(() => assignmentGroups(assignments.data ?? []), [assignments.data]);
  const groupAssignments = useMemo(
    () => (selectedGroup === null ? null : (assignments.data ?? []).filter((assignment) => assignment.groupId === selectedGroup)),
    [assignments.data, selectedGroup],
  );
  const groupName = groups.find((group) => group.id === selectedGroup)?.label ?? null;

  const publish = async() => {
    const outcome = await run(() => publishEvaluationGrades(
      selectedGroup === null ? { evaluationId, scope } : { evaluationId, groupId: selectedGroup, scope },
    ));

    if (outcome.status === "success") {
      setConfirmPublish(false);
      toast.success(RESULTS_COPY.published(outcome.value.publishedCount));
      setStatsDelayed(true);

      if (refreshTimerRef.current !== null) {
        clearTimeout(refreshTimerRef.current);
      }

      refreshTimerRef.current = setTimeout(() => {
        refreshTimerRef.current = null;
        void reloadStats();
      }, STATS_REFRESH_DELAY_MS);
    } else if (outcome.status === "error") {
      setConfirmPublish(false);
      toast.error(outcome.message);
    }
  };

  const actions = (
    <div className={cx(styles.headerActions)}>
      <p className={cx(styles.muted)}>{RESULTS_COPY.publishIntro}</p>
      <FormControl className={cx(styles.scopeChoice)}>
        <FormLabel id={`${groupFieldId}-scope`}>{RESULTS_COPY.scopeLabel}</FormLabel>
        <RadioGroup
          aria-labelledby={`${groupFieldId}-scope`}
          name="release-scope"
          value={scope}
          onChange={(event) => setScope(event.target.value as ReleaseScope)}
        >
          {RELEASE_SCOPES.map((value) => (
            <FormControlLabel key={value} value={value} control={<Radio />} label={RESULTS_COPY.scopes[value]} disabled={publishing} />
          ))}
        </RadioGroup>
      </FormControl>
      <Button
        variant="contained"
        disabled={!stats.data || stats.data.totalAttempts === 0 || publishing}
        onClick={() => setConfirmPublish(true)}
      >
        {RESULTS_COPY.publish}
      </Button>
    </div>
  );

  const renderStats = () => {
    if (!stats.data) {
      if (stats.error && !stats.isLoading) {
        return (
          <ErrorState
            title={RESULTS_COPY.loadErrorTitle}
            description={getGradingErrorMessage(stats.error)}
            onRetry={() => void stats.reload()}
          />
        );
      }

      return <CardSkeleton label={RESULTS_COPY.loading} />;
    }

    if (stats.data.totalAttempts === 0) {
      return <EmptyState icon={<BarChartIcon />} title={RESULTS_COPY.emptyTitle} description={RESULTS_COPY.emptyDescription} />;
    }

    return (
      <>
        <p className={cx(styles.muted)}>{RESULTS_COPY.kpiScope}</p>
        <Kpis stats={stats.data} />
        {stats.data.gradedCount > 0 ? (
          <EvaluationResultsCharts histogram={stats.data.histogram} questions={stats.data.questions} />
        ) : (
          <p className={cx(styles.muted)}>{RESULTS_COPY.noGradedYet}</p>
        )}
      </>
    );
  };

  const renderGroups = () => {
    if (!assignments.data) {
      if (assignments.error && !assignments.isLoading) {
        return (
          <Alert
            severity="error"
            action={<Button color="inherit" size="small" onClick={() => void assignments.reload()}>{RESULTS_COPY.retry}</Button>}
          >
            {RESULTS_COPY.groupsError} {getGradingErrorMessage(assignments.error)}
          </Alert>
        );
      }

      return <ListSkeleton rows={2} label={RESULTS_COPY.groupsLoading} />;
    }

    if (assignments.data.length === 0) {
      return <p className={cx(styles.muted)}>{RESULTS_COPY.groupsEmpty}</p>;
    }

    return <AssignmentCountsTable assignments={groupAssignments ?? assignments.data} />;
  };

  const renderStudents = () => {
    if (selectedGroup === null) {
      return <p className={cx(styles.muted)}>{RESULTS_COPY.studentsChooseGroup}</p>;
    }

    if (!students.data) {
      if (students.error && !students.isLoading) {
        return (
          <Alert
            severity="error"
            action={<Button color="inherit" size="small" onClick={() => void students.reload()}>{RESULTS_COPY.retry}</Button>}
          >
            {RESULTS_COPY.studentsError} {getGradingErrorMessage(students.error)}
          </Alert>
        );
      }

      return <ListSkeleton rows={3} label={RESULTS_COPY.studentsLoading} />;
    }

    if (students.data.length === 0) {
      return <p className={cx(styles.muted)}>{RESULTS_COPY.studentsEmpty}</p>;
    }

    return <StudentResultsTable results={students.data} />;
  };

  const confirmDescription = groupName ? RESULTS_COPY.publishScopeGroup(groupName, scope) : RESULTS_COPY.publishScopeAll(scope);

  return (
    <div className={cx(styles.content)}>
      <div className={cx(styles.content)}>
        {section === "publicacion" ? actions : null}
        {statsDelayed ? <Alert severity="info">{RESULTS_COPY.statsDelay}</Alert> : null}
        {section === "estadisticas" ? renderStats() : null}
        {groups.length > 0 ? (
          <div className={cx(styles.filters)}>
            <TextField
              id={groupFieldId}
              select
              label={RESULTS_COPY.group}
              value={groupId}
              onChange={(event) => setGroupId(event.target.value)}
              slotProps={NATIVE_SELECT}
              className={cx(styles.filterField)}
            >
              <option value={ALL_OPTION}>{RESULTS_COPY.allGroups}</option>
              {groups.map((group) => <option key={group.id} value={group.id}>{group.label}</option>)}
            </TextField>
          </div>
        ) : null}
        <section className={cx(styles.section)} aria-labelledby={`${groupFieldId}-groups`}>
          <h2 id={`${groupFieldId}-groups`} className={cx(styles.sectionTitle)}>{RESULTS_COPY.groupsTitle}</h2>
          {renderGroups()}
        </section>
        {section === "estadisticas" ? (
        <section className={cx(styles.section)} aria-labelledby={`${groupFieldId}-students`}>
          <h2 id={`${groupFieldId}-students`} className={cx(styles.sectionTitle)}>{RESULTS_COPY.studentsTitle}</h2>
          <Alert severity="info">{RESULTS_COPY.studentsGap}</Alert>
          {renderStudents()}
        </section>
        ) : null}
      </div>
      <ConfirmDialog
        open={confirmPublish}
        title={RESULTS_COPY.publishTitle}
        description={confirmDescription}
        confirmLabel={RESULTS_COPY.publishConfirm}
        cancelLabel={RESULTS_COPY.cancel}
        isPending={publishing}
        onConfirm={() => void publish()}
        onCancel={() => setConfirmPublish(false)}
      />
    </div>
  );
}
