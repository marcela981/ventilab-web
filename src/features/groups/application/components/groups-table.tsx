/*
* Funcionalidad: GroupsTable
* Descripción: Table of one page of groups (caption "Grupos"): name as row header with the parent group of a subgroup, type, active state chip, member count (with the student limit), simulator leader and academic period. v1.1 (T11b): the name links to the group detail (/groups/[groupId]). Depends on next/link, MUI, the group entity and the groups CSS Module.
* Versión: 1.1
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

import Chip from "@mui/material/Chip";
import Table from "@mui/material/Table";
import TableBody from "@mui/material/TableBody";
import TableCell from "@mui/material/TableCell";
import TableContainer from "@mui/material/TableContainer";
import TableHead from "@mui/material/TableHead";
import TableRow from "@mui/material/TableRow";
import Link from "next/link";
import { cx } from "@shared/lib/class-names";
import { GROUP_TYPE_LABELS, personName } from "../entities/group.entity";
import type { Group } from "../entities/group.entity";
import styles from "../../UI/groups.module.css";

// TODO(i18n): move to a groups namespace in src/i18n.
const TABLE_COPY = {
  label: "Grupos",
  name: "Nombre",
  type: "Tipo",
  status: "Estado",
  members: "Integrantes",
  leader: "Líder",
  period: "Periodo",
  active: "Activo",
  inactive: "Inactivo",
  subgroupOf: "Subgrupo de",
  none: "—",
} as const;

function membersText(group: Group): string {
  return group.maxStudents === null ? String(group.membersCount) : `${group.membersCount} / ${group.maxStudents}`;
}

function periodText(group: Group): string {
  const parts = [group.semester, group.academicYear].filter((part): part is string => Boolean(part));

  return parts.length > 0 ? parts.join(" · ") : TABLE_COPY.none;
}

export type GroupsTableProps = {
  groups: readonly Group[]
};

export function GroupsTable({ groups }: GroupsTableProps) {
  return (
    <TableContainer className={cx(styles.tableContainer)}>
      <Table aria-label={TABLE_COPY.label} size="small">
        <TableHead>
          <TableRow>
            <TableCell>{TABLE_COPY.name}</TableCell>
            <TableCell>{TABLE_COPY.type}</TableCell>
            <TableCell>{TABLE_COPY.status}</TableCell>
            <TableCell align="right">{TABLE_COPY.members}</TableCell>
            <TableCell>{TABLE_COPY.leader}</TableCell>
            <TableCell>{TABLE_COPY.period}</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {groups.map((group) => (
            <TableRow key={group.id}>
              <TableCell component="th" scope="row">
                <Link href={`/groups/${encodeURIComponent(group.id)}`} className={cx(styles.groupName, styles.groupLink)}>
                  {group.name}
                </Link>
                {group.parentGroupName ? (
                  <span className={styles.secondary}>{`${TABLE_COPY.subgroupOf} ${group.parentGroupName}`}</span>
                ) : null}
              </TableCell>
              <TableCell>{GROUP_TYPE_LABELS[group.type]}</TableCell>
              <TableCell>
                <Chip
                  label={group.isActive ? TABLE_COPY.active : TABLE_COPY.inactive}
                  size="small"
                  variant={group.isActive ? "outlined" : "filled"}
                />
              </TableCell>
              <TableCell align="right">{membersText(group)}</TableCell>
              <TableCell>{group.leader ? personName(group.leader) : TABLE_COPY.none}</TableCell>
              <TableCell>{periodText(group)}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </TableContainer>
  );
}
