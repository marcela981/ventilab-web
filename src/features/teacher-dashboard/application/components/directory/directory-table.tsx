/*
* Funcionalidad: DirectoryTable
* Descripción: Table of one page of the students directory (July's PanelStudents table): a labelled checkbox per row and a "select the whole page" checkbox (indeterminate when part of the page is selected); columns Nombre (name and email) · Código · Progreso (percentage and bar) · Grupos (active group chips or "Sin grupo") · Ver. Nombre and Progreso sort on the server: their header is a sort button and the sorted column carries aria-sort. The detail link (/teacher/students/[userId]?from=directory) exists only when the row's canView is true; a row outside the teacher's groups shows "Sin acceso" instead. Presentational. Depends on MUI, next/link, @shared/lib, the teacher dashboard routes, the students directory entity and CSS Module.
* Versión: 1.0
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

import Checkbox from "@mui/material/Checkbox";
import Chip from "@mui/material/Chip";
import LinearProgress from "@mui/material/LinearProgress";
import Table from "@mui/material/Table";
import TableBody from "@mui/material/TableBody";
import TableCell from "@mui/material/TableCell";
import TableHead from "@mui/material/TableHead";
import TableRow from "@mui/material/TableRow";
import TableSortLabel from "@mui/material/TableSortLabel";
import Link from "next/link";
import { cx } from "@shared/lib/class-names";
import { buildStudentDetailUrl, STUDENT_DETAIL_FROM_DIRECTORY } from "../../config/teacher-dashboard.routes";
import { rowDisplayName } from "../../entities/students-directory.entity";
import type { DirectoryRow, DirectorySort, DirectorySortKey } from "../../entities/students-directory.entity";
import styles from "../../../UI/students-directory.module.css";

// TODO(i18n): move to a teacher-dashboard namespace in src/i18n.
export const DIRECTORY_TABLE_COPY = {
  label: "Directorio de estudiantes",
  selectPage: "Seleccionar todos los estudiantes de esta página",
  selectRow: (name: string) => `Seleccionar a ${name}`,
  columns: {
    name: "Nombre",
    code: "Código",
    progress: "Progreso",
    groups: "Grupos",
    view: "Ver",
  },
  noCode: "—",
  noGroup: "Sin grupo",
  progressAria: (name: string) => `Progreso de ${name}`,
  view: "Ver",
  viewAria: (name: string) => `Ver el detalle de ${name}`,
  noAccess: "Sin acceso",
  noAccessHint: "No pertenece a tus grupos",
} as const;

const SORT_LABELS: Record<DirectorySortKey, string> = {
  name: DIRECTORY_TABLE_COPY.columns.name,
  progress: DIRECTORY_TABLE_COPY.columns.progress,
};

export type DirectoryTableProps = {
  rows: readonly DirectoryRow[]
  sort: DirectorySort
  selectedIds: ReadonlySet<string>
  onSort: (key: DirectorySortKey) => void
  onToggleRow: (row: DirectoryRow) => void
  onTogglePage: (select: boolean) => void
};

export function DirectoryTable({ rows, sort, selectedIds, onSort, onToggleRow, onTogglePage }: DirectoryTableProps) {
  const selectedOnPage = rows.filter((row) => selectedIds.has(row.id)).length;
  const allSelected = rows.length > 0 && selectedOnPage === rows.length;

  const sortHeader = (key: DirectorySortKey, numeric: boolean) => {
    const active = sort.key === key;

    return (
      <TableCell align={numeric ? "right" : "left"} sortDirection={active ? sort.direction : false}>
        <TableSortLabel active={active} direction={active ? sort.direction : "asc"} onClick={() => onSort(key)}>
          {SORT_LABELS[key]}
        </TableSortLabel>
      </TableCell>
    );
  };

  const renderRow = (row: DirectoryRow) => {
    const name = rowDisplayName(row);
    const selected = selectedIds.has(row.id);

    return (
      <TableRow key={row.id} selected={selected} data-testid={`directory-row-${row.id}`}>
        <TableCell padding="checkbox">
          <Checkbox
            checked={selected}
            onChange={() => onToggleRow(row)}
            slotProps={{ input: { "aria-label": DIRECTORY_TABLE_COPY.selectRow(name) } }}
          />
        </TableCell>
        <TableCell>
          <div className={cx(styles.studentCell)}>
            <span className={cx(styles.studentName)}>{name}</span>
            {row.name?.trim() ? <span className={cx(styles.meta)}>{row.email}</span> : null}
          </div>
        </TableCell>
        <TableCell>{row.studentCode ?? DIRECTORY_TABLE_COPY.noCode}</TableCell>
        <TableCell align="right">
          <div className={cx(styles.progressCell)}>
            <LinearProgress
              variant="determinate"
              value={row.progress}
              aria-label={DIRECTORY_TABLE_COPY.progressAria(name)}
              className={cx(styles.progressBar)}
            />
            <span>{`${row.progress}%`}</span>
          </div>
        </TableCell>
        <TableCell>
          {row.groups.length > 0 ? (
            <div className={cx(styles.groups)}>
              {row.groups.map((group) => <Chip key={group.id} size="small" variant="outlined" label={group.name} />)}
            </div>
          ) : <span className={cx(styles.meta)}>{DIRECTORY_TABLE_COPY.noGroup}</span>}
        </TableCell>
        <TableCell>
          {row.canView ? (
            <Link
              href={buildStudentDetailUrl(row.id, null, STUDENT_DETAIL_FROM_DIRECTORY)}
              aria-label={DIRECTORY_TABLE_COPY.viewAria(name)}
              className={cx(styles.link)}
            >
              {DIRECTORY_TABLE_COPY.view}
            </Link>
          ) : <span className={cx(styles.meta)} title={DIRECTORY_TABLE_COPY.noAccessHint}>{DIRECTORY_TABLE_COPY.noAccess}</span>}
        </TableCell>
      </TableRow>
    );
  };

  return (
    <div className={cx(styles.tableWrapper)}>
      <Table size="small" aria-label={DIRECTORY_TABLE_COPY.label}>
        <TableHead>
          <TableRow>
            <TableCell padding="checkbox">
              <Checkbox
                checked={allSelected}
                indeterminate={selectedOnPage > 0 && !allSelected}
                onChange={() => onTogglePage(!allSelected)}
                slotProps={{ input: { "aria-label": DIRECTORY_TABLE_COPY.selectPage } }}
              />
            </TableCell>
            {sortHeader("name", false)}
            <TableCell>{DIRECTORY_TABLE_COPY.columns.code}</TableCell>
            {sortHeader("progress", true)}
            <TableCell>{DIRECTORY_TABLE_COPY.columns.groups}</TableCell>
            <TableCell>{DIRECTORY_TABLE_COPY.columns.view}</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>{rows.map(renderRow)}</TableBody>
      </Table>
    </div>
  );
}
