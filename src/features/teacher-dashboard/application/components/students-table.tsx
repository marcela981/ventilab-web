/*
* Funcionalidad: StudentsTable
* Descripción: Students table of /teacher from the group dashboard rows: student (link to the detail page with the group), overall progress, average grade, simulation (sessions, average score, average time to stabilize), AI usage per use case (calls and helpful percentage exactly as returned, never summed) and ventilator hours. Columns sort by their API value (TableSortLabel) and a text filter keeps the rows whose name or email matches. A row is highlighted (warning border, tint and the "En riesgo" label) when the API flags it (`atRisk`); the label lists the API reasons in Spanish (Reprobó evaluaciones with the failed evaluation titles, Avance bajo, Inactivo) and a short legend states the passing grade and the risk thresholds the API used (a 0 threshold is shown as off). Each row expands to its section, level and module progress (curriculum titles) and its published evaluations. v1.1 (O3 review): the legend says that only the latest published attempt of each evaluation counts. v1.2 (closure B2): the client risk rule (assessStudentRisk) is gone; risk, reasons and failed evaluations come from the API row, thresholds from the dashboard. Depends on MUI, next/link, @shared/lib/format, the teacher dashboard entities, routes and CSS Module.
* Versión: 1.2
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

import KeyboardArrowDownIcon from "@mui/icons-material/KeyboardArrowDown";
import KeyboardArrowUpIcon from "@mui/icons-material/KeyboardArrowUp";
import Chip from "@mui/material/Chip";
import IconButton from "@mui/material/IconButton";
import LinearProgress from "@mui/material/LinearProgress";
import Table from "@mui/material/Table";
import TableBody from "@mui/material/TableBody";
import TableCell from "@mui/material/TableCell";
import TableHead from "@mui/material/TableHead";
import TableRow from "@mui/material/TableRow";
import TableSortLabel from "@mui/material/TableSortLabel";
import TextField from "@mui/material/TextField";
import Link from "next/link";
import { Fragment, useMemo, useState } from "react";
import { cx } from "@shared/lib/class-names";
import { formatDate, formatGrade } from "@shared/lib/format";
import { buildStudentDetailUrl } from "../config/teacher-dashboard.routes";
import { levelTitle, moduleTitle, sectionTitle } from "../entities/curriculum-titles.entity";
import type { CurriculumTitles } from "../entities/curriculum-titles.entity";
import {
  AI_USE_CASE_LABELS,
  formatHours,
  formatPercent,
  formatScore,
  formatSeconds,
  labelOf,
  MISSING,
  RISK_REASON_LABELS,
} from "../entities/teacher-dashboard-labels";
import { DEFAULT_SORT, displayName, failedEvaluationTitles, filterRows, sortRows, toggleSort } from "../entities/teacher-dashboard.entity";
import type { ProgressItem, RiskThresholds, SortKey, SortState, StudentRow } from "../entities/teacher-dashboard.entity";
import styles from "../../UI/teacher-dashboard.module.css";

// TODO(i18n): move to a teacher-dashboard namespace in src/i18n.
export const STUDENTS_TABLE_COPY = {
  title: "Estudiantes",
  filter: "Buscar por nombre o correo",
  legend: "Resaltado: estudiante en riesgo según la plataforma.",
  legendLabel: "Criterios de riesgo",
  legendPassing: (grade: string) => `Nota de aprobación ${grade}`,
  legendFailed: (count: number) => (count === 0 ? "Reprobó evaluaciones: al menos una" : `Reprobó evaluaciones: más de ${count}`),
  legendProgress: (percent: string) => `Avance bajo: menos de ${percent}`,
  legendInactive: (days: number) => `Inactivo: más de ${days} ${days === 1 ? "día" : "días"} sin actividad`,
  legendOff: (rule: string) => `${rule}: desactivado`,
  atRisk: "En riesgo",
  failedDetail: (titles: readonly string[]) => (titles.length > 0 ? `: ${titles.join(", ")}` : ""),
  columns: {
    name: "Estudiante",
    progress: "Progreso",
    averageGrade: "Promedio",
    simulationSessions: "Sesiones de simulación",
    simulationScore: "Puntaje promedio",
    stabilizeTime: "Tiempo a estabilizar",
    aiUsage: "Uso de IA",
    ventilatorHours: "Horas en el ventilador",
    detail: "Detalle",
  },
  expand: (name: string) => `Ver el detalle de ${name}`,
  collapse: (name: string) => `Ocultar el detalle de ${name}`,
  progressAria: (name: string) => `Progreso general de ${name}`,
  aiUsageItem: (label: string, calls: number, helpful: string) => `${label}: ${calls} ${calls === 1 ? "llamada" : "llamadas"} · útil ${helpful}`,
  noAiUsage: "Sin uso",
  sections: "Secciones",
  levels: "Niveles",
  modules: "Módulos",
  evaluations: "Evaluaciones publicadas",
  noItems: "Sin datos.",
  passed: "Aprobada",
  failed: "Reprobada",
  gradeLine: (grade: string, attempt: number, date: string) => `Nota ${grade} · intento ${attempt} · ${date}`,
  noMatches: "Ningún estudiante coincide con la búsqueda.",
  empty: "El grupo no tiene estudiantes.",
} as const;

type SortableColumn = { key: SortKey, label: string, numeric: boolean };

const SORTABLE_COLUMNS: readonly SortableColumn[] = [
  { key: "name", label: STUDENTS_TABLE_COPY.columns.name, numeric: false },
  { key: "progress", label: STUDENTS_TABLE_COPY.columns.progress, numeric: true },
  { key: "averageGrade", label: STUDENTS_TABLE_COPY.columns.averageGrade, numeric: true },
  { key: "simulationSessions", label: STUDENTS_TABLE_COPY.columns.simulationSessions, numeric: true },
  { key: "simulationScore", label: STUDENTS_TABLE_COPY.columns.simulationScore, numeric: true },
  { key: "stabilizeTime", label: STUDENTS_TABLE_COPY.columns.stabilizeTime, numeric: true },
];

const COLUMN_COUNT = 9;

/** Legend items: the passing grade and each risk rule with the threshold the API used (0 turns progress and inactivity off). */
export function riskLegendItems(passingGrade: number, thresholds: RiskThresholds): string[] {
  return [
    STUDENTS_TABLE_COPY.legendPassing(formatGrade(passingGrade)),
    STUDENTS_TABLE_COPY.legendFailed(thresholds.maxFailedEvaluations),
    thresholds.minProgressPct > 0
      ? STUDENTS_TABLE_COPY.legendProgress(formatPercent(thresholds.minProgressPct))
      : STUDENTS_TABLE_COPY.legendOff(RISK_REASON_LABELS.LOW_PROGRESS),
    thresholds.inactivityDays > 0
      ? STUDENTS_TABLE_COPY.legendInactive(thresholds.inactivityDays)
      : STUDENTS_TABLE_COPY.legendOff(RISK_REASON_LABELS.INACTIVE),
  ];
}

/** Spanish reasons of an at-risk row; the failed evaluations reason names the API failed evaluations. */
export function riskReasonsText(row: StudentRow): string {
  return row.riskReasons
    .map((reason) => (reason === "FAILED_EVALUATIONS"
      ? `${RISK_REASON_LABELS.FAILED_EVALUATIONS}${STUDENTS_TABLE_COPY.failedDetail(failedEvaluationTitles(row))}`
      : RISK_REASON_LABELS[reason]))
    .join(" · ");
}

function percentValue(item: ProgressItem): number {
  // Display only: the bar takes the API percentage, bounded to its 0–100 range.
  return Math.min(100, Math.max(0, item.percentage));
}

function ProgressList({ title, items, titleOf }: { title: string, items: readonly ProgressItem[], titleOf: (id: string | null) => string }) {
  return (
    <div>
      <h3 className={cx(styles.subTitle)}>{title}</h3>
      {items.length === 0 ? <p className={cx(styles.emptyText)}>{STUDENTS_TABLE_COPY.noItems}</p> : (
        <ul className={cx(styles.list)}>
          {items.map((item, index) => (
            <li key={item.id ?? `missing-${index}`} className={cx(styles.listItem)}>
              <span className={cx(styles.itemTitle)}>{titleOf(item.id)}</span>
              <span className={cx(styles.itemMeta)}>{`${formatPercent(item.percentage)} · ${item.completedLessons}/${item.totalLessons}`}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function RowDetail({ row, titles }: { row: StudentRow, titles: CurriculumTitles }) {
  return (
    <div className={cx(styles.detailGrid)}>
      <ProgressList title={STUDENTS_TABLE_COPY.sections} items={row.progress.sections} titleOf={(id) => sectionTitle(titles, id)} />
      <ProgressList title={STUDENTS_TABLE_COPY.levels} items={row.progress.levels} titleOf={(id) => levelTitle(titles, id)} />
      <ProgressList title={STUDENTS_TABLE_COPY.modules} items={row.progress.modules} titleOf={(id) => moduleTitle(titles, id)} />
      <div>
        <h3 className={cx(styles.subTitle)}>{STUDENTS_TABLE_COPY.evaluations}</h3>
        {row.evaluations.length === 0 ? <p className={cx(styles.emptyText)}>{STUDENTS_TABLE_COPY.noItems}</p> : (
          <ul className={cx(styles.list)}>
            {row.evaluations.map((grade) => (
              <li key={`${grade.evaluationId}-${grade.attemptNumber}`} className={cx(styles.listItem)}>
                <span className={cx(styles.itemTitle)}>{grade.evaluationTitle}</span>
                <span className={cx(styles.itemMeta)}>
                  {STUDENTS_TABLE_COPY.gradeLine(formatGrade(grade.grade), grade.attemptNumber, formatDate(grade.publishedAt))}
                  {" · "}
                  <span className={cx(grade.passed ? styles.passed : styles.failed)}>
                    {grade.passed ? STUDENTS_TABLE_COPY.passed : STUDENTS_TABLE_COPY.failed}
                  </span>
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

function AiUsageCell({ row }: { row: StudentRow }) {
  if (row.aiUsage.length === 0) {
    return <span className={cx(styles.itemMeta)}>{STUDENTS_TABLE_COPY.noAiUsage}</span>;
  }

  return (
    <ul className={cx(styles.aiList)}>
      {row.aiUsage.map((usage) => (
        <li key={usage.useCase}>
          {STUDENTS_TABLE_COPY.aiUsageItem(labelOf(AI_USE_CASE_LABELS, usage.useCase), usage.calls, formatPercent(usage.helpfulPercentage))}
        </li>
      ))}
    </ul>
  );
}

export type StudentsTableProps = {
  rows: readonly StudentRow[]
  groupId: string
  titles: CurriculumTitles
  passingGrade: number
  thresholds: RiskThresholds
};

export function StudentsTable({ rows, groupId, titles, passingGrade, thresholds }: StudentsTableProps) {
  const [filter, setFilter] = useState("");
  const [sort, setSort] = useState<SortState>(DEFAULT_SORT);
  const [expanded, setExpanded] = useState<string | null>(null);
  const visible = useMemo(() => sortRows(filterRows(rows, filter), sort), [rows, filter, sort]);

  const header = (column: SortableColumn) => (
    <TableCell key={column.key} align={column.numeric ? "right" : "left"} sortDirection={sort.key === column.key ? sort.direction : false}>
      <TableSortLabel
        active={sort.key === column.key}
        direction={sort.key === column.key ? sort.direction : "asc"}
        onClick={() => setSort((current) => toggleSort(current, column.key))}
      >
        {column.label}
      </TableSortLabel>
    </TableCell>
  );

  const renderRow = (row: StudentRow) => {
    const name = displayName(row);
    const isOpen = expanded === row.userId;
    const reasons = row.atRisk ? riskReasonsText(row) : "";

    return (
      <Fragment key={row.userId}>
        <TableRow className={cx(row.atRisk && styles.riskRow)} data-risk={row.atRisk ? "true" : "false"}>
          <TableCell>
            <div className={cx(styles.studentCell)}>
              <Link href={buildStudentDetailUrl(row.userId, groupId)} className={cx(styles.link)}>{name}</Link>
              {row.name ? <span className={cx(styles.itemMeta)}>{row.email}</span> : null}
              {row.atRisk ? (
                <>
                  <Chip
                    size="small"
                    color="warning"
                    variant="outlined"
                    label={STUDENTS_TABLE_COPY.atRisk}
                    title={reasons}
                    className={cx(styles.riskLabel)}
                  />
                  {reasons ? <span className={cx(styles.itemMeta)}>{reasons}</span> : null}
                </>
              ) : null}
            </div>
          </TableCell>
          <TableCell align="right">
            <div className={cx(styles.progressCell)}>
              <span>{formatPercent(row.progress.overall.percentage)}</span>
              <LinearProgress
                variant="determinate"
                value={percentValue(row.progress.overall)}
                aria-label={STUDENTS_TABLE_COPY.progressAria(name)}
                className={cx(styles.progressBar)}
              />
            </div>
          </TableCell>
          <TableCell align="right">{row.averageGrade === null ? MISSING : formatGrade(row.averageGrade)}</TableCell>
          <TableCell align="right">{row.simulation.sessionCount}</TableCell>
          <TableCell align="right">{formatScore(row.simulation.averageScore)}</TableCell>
          <TableCell align="right">{formatSeconds(row.simulation.averageTimeToStabilizeSeconds)}</TableCell>
          <TableCell><AiUsageCell row={row} /></TableCell>
          <TableCell align="right">{formatHours(row.ventilatorHours)}</TableCell>
          <TableCell align="center">
            <IconButton
              size="small"
              aria-expanded={isOpen}
              aria-label={isOpen ? STUDENTS_TABLE_COPY.collapse(name) : STUDENTS_TABLE_COPY.expand(name)}
              onClick={() => setExpanded(isOpen ? null : row.userId)}
            >
              {isOpen ? <KeyboardArrowUpIcon /> : <KeyboardArrowDownIcon />}
            </IconButton>
          </TableCell>
        </TableRow>
        {isOpen ? (
          <TableRow>
            <TableCell colSpan={COLUMN_COUNT} className={cx(styles.detailCell)}>
              <RowDetail row={row} titles={titles} />
            </TableCell>
          </TableRow>
        ) : null}
      </Fragment>
    );
  };

  return (
    <section aria-label={STUDENTS_TABLE_COPY.title} className={cx(styles.section)}>
      <div className={cx(styles.sectionHeader)}>
        <h2 className={cx(styles.sectionTitle)}>{STUDENTS_TABLE_COPY.title}</h2>
        <TextField
          size="small"
          type="search"
          label={STUDENTS_TABLE_COPY.filter}
          value={filter}
          className={cx(styles.filter)}
          onChange={(event) => setFilter(event.target.value)}
        />
      </div>
      <p className={cx(styles.legend)}>
        <span aria-hidden="true" className={cx(styles.legendSwatch)} />
        {STUDENTS_TABLE_COPY.legend}
      </p>
      <ul className={cx(styles.legendList)} aria-label={STUDENTS_TABLE_COPY.legendLabel}>
        {riskLegendItems(passingGrade, thresholds).map((item) => <li key={item}>{item}</li>)}
      </ul>
      {rows.length === 0 ? <p className={cx(styles.emptyText)}>{STUDENTS_TABLE_COPY.empty}</p> : (
        <div className={cx(styles.tableWrapper)}>
          <Table size="small" aria-label={STUDENTS_TABLE_COPY.title}>
            <TableHead>
              <TableRow>
                {SORTABLE_COLUMNS.map(header)}
                <TableCell>{STUDENTS_TABLE_COPY.columns.aiUsage}</TableCell>
                {header({ key: "ventilatorHours", label: STUDENTS_TABLE_COPY.columns.ventilatorHours, numeric: true })}
                <TableCell align="center">{STUDENTS_TABLE_COPY.columns.detail}</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {visible.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={COLUMN_COUNT}>{STUDENTS_TABLE_COPY.noMatches}</TableCell>
                </TableRow>
              ) : visible.map(renderRow)}
            </TableBody>
          </Table>
        </div>
      )}
    </section>
  );
}
