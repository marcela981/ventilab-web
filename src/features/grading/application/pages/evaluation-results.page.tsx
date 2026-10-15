/*
* Funcionalidad: EvaluationResultsPage
* Descripción: Staff page /grading/evaluations/[evaluationId] (teachers and admins). Shows the statistics the API computes for the evaluation (`GET /api/analytics/evaluations/{evaluationId}/stats`): average, median, minimum and maximum grade in es-CO, pass rate as a percentage, the passing grade of the API and the total, graded and published attempt counts; nothing is computed on the client. The grade histogram (the API 0.5 buckets) and the per-question difficulty index are drawn by a lazily loaded chart chunk (@shared/charts and Chart.js stay out of the page chunk); without graded attempts the charts are replaced by a note, and without attempts the page shows an empty state. A group filter (the groups of `GET /api/evaluation-assignments?evaluationId`) narrows the per-group attempt counts table, the per-student results and the bulk publish. The API has no per-evaluation results endpoint (reported gap): the per-student section explains it and, for a chosen group, lists the published grades of this evaluation read from the group dashboard (`GET /api/analytics/groups/{groupId}/dashboard`). "Publicar calificaciones" asks for confirmation with the approximate number of students to notify (the API graded attempts of the group's assignments, or graded minus published attempts of the evaluation), then sends `POST /api/evaluation-grading/publish` {evaluationId, groupId?}, toasts the publishedCount of the response and refreshes the grading reads (stats, assignments, dashboard, queue). Links back to /grading. Depends on MUI, next/head, next/link, the design-system components, @shared/lib, the grading hooks, service, entities and components and the CSS Module.
* Versión: 1.0
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import BarChartIcon from "@mui/icons-material/BarChart";
import Alert from "@mui/material/Alert";
import Button from "@mui/material/Button";
import TextField from "@mui/material/TextField";
import Head from "next/head";
import Link from "next/link";
import { useId, useMemo, useState } from "react";
import { ConfirmDialog } from "@shared/design-system/components/confirm-dialog";
import { EmptyState } from "@shared/design-system/components/empty-state";
import { ErrorState } from "@shared/design-system/components/error-state";
import { PageHeader } from "@shared/design-system/components/page-header";
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
  publishEstimate,
} from "../entities/evaluation-results.entity";
import type { EvaluationStats } from "../entities/evaluation-results.entity";
import { ALL_OPTION } from "../entities/grading.entity";
import { getGradingErrorMessage } from "../entities/grading-error-messages";
import { GRADING_URL } from "../entities/grading-urls";
import { useEvaluationAssignments, useEvaluationStats, useGroupStudentResults } from "../hooks/use-evaluation-results";
import { useGradingMutation } from "../hooks/use-grading-mutation";
import { EVALUATION_TYPE_LABELS } from "../components/grading-queue-table";
import styles from "../../UI/evaluation-results.module.css";

// TODO(i18n): move to a grading namespace in src/i18n.
export const RESULTS_COPY = {
  documentTitle: (title: string) => `Resultados: ${title} | VentyLab`,
  fallbackTitle: "Resultados de la evaluación",
  subtitle: (type: string | null, passingGrade: string) => `${type ? `${type} · ` : ""}Nota mínima para aprobar: ${passingGrade}`,
  backToQueue: "Volver a la cola",
  loading: "Cargando los resultados…",
  loadErrorTitle: "No se pudieron cargar los resultados",
  emptyTitle: "Todavía no hay intentos en esta evaluación",
  emptyDescription: "Las estadísticas aparecerán cuando los estudiantes presenten la evaluación.",
  kpiLabel: "Indicadores de la evaluación",
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
  publish: "Publicar calificaciones",
  publishTitle: "¿Publicar calificaciones?",
  publishScopeAll: "Se publicarán las calificaciones de todos los grupos de esta evaluación.",
  publishScopeGroup: (group: string) => `Se publicarán las calificaciones del grupo ${group}.`,
  publishNotify: (count: string) => `Se notificará aprox. a ${count} ${count === "1" ? "estudiante" : "estudiantes"} (según los intentos calificados que informa el servidor).`,
  publishConfirm: "Publicar",
  cancel: "Cancelar",
  published: (count: number) => {
    if (count === 0) {
      return "No había calificaciones pendientes de publicar.";
    }

    return count === 1 ? "Se publicó 1 calificación." : `Se publicaron ${formatCount(count)} calificaciones.`;
  },
} as const;

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

export type EvaluationResultsPageProps = {
  evaluationId: string
};

export function EvaluationResultsPage({ evaluationId }: EvaluationResultsPageProps) {
  const toast = useToast();
  const groupFieldId = useId();
  const stats = useEvaluationStats(evaluationId);
  const assignments = useEvaluationAssignments(evaluationId);
  const [groupId, setGroupId] = useState<string>(ALL_OPTION);
  const selectedGroup = groupId === ALL_OPTION ? null : groupId;
  const students = useGroupStudentResults(selectedGroup, evaluationId);
  const { pending: publishing, run } = useGradingMutation();
  const [confirmPublish, setConfirmPublish] = useState(false);

  const groups = useMemo(() => assignmentGroups(assignments.data ?? []), [assignments.data]);
  const groupAssignments = useMemo(
    () => (selectedGroup === null ? null : (assignments.data ?? []).filter((assignment) => assignment.groupId === selectedGroup)),
    [assignments.data, selectedGroup],
  );
  const groupName = groups.find((group) => group.id === selectedGroup)?.label ?? null;
  const estimate = stats.data ? publishEstimate(stats.data, groupAssignments) : null;
  const title = stats.data?.title ?? RESULTS_COPY.fallbackTitle;

  const publish = async() => {
    const outcome = await run(() => publishEvaluationGrades(
      selectedGroup === null ? { evaluationId } : { evaluationId, groupId: selectedGroup },
    ));

    if (outcome.status === "success") {
      setConfirmPublish(false);
      toast.success(RESULTS_COPY.published(outcome.value.publishedCount));
    } else if (outcome.status === "error") {
      setConfirmPublish(false);
      toast.error(outcome.message);
    }
  };

  const actions = (
    <div className={cx(styles.headerActions)}>
      <Button component={Link} href={GRADING_URL} startIcon={<ArrowBackIcon />}>
        {RESULTS_COPY.backToQueue}
      </Button>
      <Button
        variant="contained"
        disabled={!estimate || estimate.count === 0 || publishing}
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

  const confirmDescription = estimate ? (
    <>
      <span className={cx(styles.block)}>
        {groupName ? RESULTS_COPY.publishScopeGroup(groupName) : RESULTS_COPY.publishScopeAll}
      </span>
      <span className={cx(styles.block)}>{RESULTS_COPY.publishNotify(formatCount(estimate.count))}</span>
    </>
  ) : null;

  return (
    <div className={cx(styles.page)}>
      <Head>
        <title>{RESULTS_COPY.documentTitle(title)}</title>
      </Head>
      <PageHeader
        title={title}
        subtitle={stats.data
          ? RESULTS_COPY.subtitle(stats.data.type ? EVALUATION_TYPE_LABELS[stats.data.type] : null, formatStatGrade(stats.data.passingGrade))
          : undefined}
        actions={actions}
      />
      <div className={cx(styles.content)}>
        {renderStats()}
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
        <section className={cx(styles.section)} aria-labelledby={`${groupFieldId}-students`}>
          <h2 id={`${groupFieldId}-students`} className={cx(styles.sectionTitle)}>{RESULTS_COPY.studentsTitle}</h2>
          <Alert severity="info">{RESULTS_COPY.studentsGap}</Alert>
          {renderStudents()}
        </section>
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
