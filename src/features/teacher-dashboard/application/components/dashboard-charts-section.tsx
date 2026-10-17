/*
* Funcionalidad: DashboardChartsSection
* Descripción: Charts block of /teacher with its selectors: the grade distribution of one evaluation chosen among the evaluations with published grades in the group rows (histogram and passing grade from `GET /api/analytics/evaluations/{id}/stats`, never bucketed on the client; the API computes it over every group of the caller in scope, which the description states) and the module progress of one student of the group (that student's module percentages from the dashboard row). A group-level module average would be client math and the API has no group aggregate (BACKEND GAP), so the module chart is per student. Depends on MUI, the design-system states, the lazy charts, the teacher dashboard hooks, entities and CSS Module.
* Versión: 1.0
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

import Alert from "@mui/material/Alert";
import MenuItem from "@mui/material/MenuItem";
import TextField from "@mui/material/TextField";
import { useMemo, useState } from "react";
import { CardSkeleton } from "@shared/design-system/components/skeleton";
import { cx } from "@shared/lib/class-names";
import { toModuleProgressSeries } from "../entities/curriculum-titles.entity";
import type { CurriculumTitles } from "../entities/curriculum-titles.entity";
import { getTeacherDashboardErrorMessage } from "../entities/teacher-dashboard-error-messages";
import { displayName, listEvaluationOptions } from "../entities/teacher-dashboard.entity";
import type { StudentRow } from "../entities/teacher-dashboard.entity";
import { useEvaluationStats } from "../hooks/use-evaluation-stats";
import { GradeDistributionChart, ModuleProgressChart } from "./lazy-dashboard-charts";
import styles from "../../UI/teacher-dashboard.module.css";

// TODO(i18n): move to a teacher-dashboard namespace in src/i18n.
export const CHARTS_SECTION_COPY = {
  title: "Gráficas",
  evaluation: "Evaluación",
  student: "Estudiante",
  scopeNote: "La distribución la calcula el servidor con los intentos calificados de todos tus grupos con esta evaluación.",
  noEvaluations: "Ningún estudiante del grupo tiene calificaciones publicadas todavía.",
  noModules: "El estudiante aún no tiene progreso por módulo.",
  loadingStats: "Cargando la distribución de notas…",
} as const;

export type DashboardChartsSectionProps = {
  rows: readonly StudentRow[]
  titles: CurriculumTitles
};

export function DashboardChartsSection({ rows, titles }: DashboardChartsSectionProps) {
  const evaluations = useMemo(() => listEvaluationOptions(rows), [rows]);
  const [chosenEvaluation, setChosenEvaluation] = useState<string | null>(null);
  const [chosenStudent, setChosenStudent] = useState<string | null>(null);
  const evaluationId = evaluations.some((option) => option.id === chosenEvaluation) ? chosenEvaluation : (evaluations[0]?.id ?? null);
  const student = rows.find((row) => row.userId === chosenStudent) ?? rows[0] ?? null;
  const { stats, isLoading, error } = useEvaluationStats(evaluationId);
  const modules = useMemo(() => (student ? toModuleProgressSeries(student.progress.modules, titles) : []), [student, titles]);

  const renderDistribution = () => {
    if (!evaluationId) {
      return <p className={cx(styles.emptyText)}>{CHARTS_SECTION_COPY.noEvaluations}</p>;
    }

    if (stats && stats.evaluationId === evaluationId) {
      return <GradeDistributionChart title={stats.title} passingGrade={stats.passingGrade} histogram={stats.histogram} />;
    }

    if (error) {
      return <Alert severity="error">{getTeacherDashboardErrorMessage(error)}</Alert>;
    }

    return isLoading || !stats ? <CardSkeleton label={CHARTS_SECTION_COPY.loadingStats} /> : null;
  };

  return (
    <section aria-label={CHARTS_SECTION_COPY.title} className={cx(styles.section)}>
      <h2 className={cx(styles.sectionTitle)}>{CHARTS_SECTION_COPY.title}</h2>
      <div className={cx(styles.charts)}>
        <div className={cx(styles.chartCard)}>
          {evaluations.length > 0 && evaluationId ? (
            <TextField
              select
              size="small"
              label={CHARTS_SECTION_COPY.evaluation}
              value={evaluationId}
              className={cx(styles.chartSelect)}
              onChange={(event) => setChosenEvaluation(event.target.value)}
            >
              {evaluations.map((option) => <MenuItem key={option.id} value={option.id}>{option.title}</MenuItem>)}
            </TextField>
          ) : null}
          {renderDistribution()}
          {evaluationId ? <p className={cx(styles.meta)}>{CHARTS_SECTION_COPY.scopeNote}</p> : null}
        </div>
        {student ? (
          <div className={cx(styles.chartCard)}>
            <TextField
              select
              size="small"
              label={CHARTS_SECTION_COPY.student}
              value={student.userId}
              className={cx(styles.chartSelect)}
              onChange={(event) => setChosenStudent(event.target.value)}
            >
              {rows.map((row) => <MenuItem key={row.userId} value={row.userId}>{displayName(row)}</MenuItem>)}
            </TextField>
            {modules.length === 0
              ? <p className={cx(styles.emptyText)}>{CHARTS_SECTION_COPY.noModules}</p>
              : <ModuleProgressChart studentName={displayName(student)} modules={modules} />}
          </div>
        ) : null}
      </div>
    </section>
  );
}
