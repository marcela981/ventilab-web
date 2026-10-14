/*
* Funcionalidad: GroupInfo
* Descripción: Facts of one group as a description list: type, status, description, academic period, members with the student limit, parent group, simulator leader (student groups) and creator. Depends on MUI, the group entity and the group detail CSS Module.
* Versión: 1.0
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

import Chip from "@mui/material/Chip";
import type { ReactNode } from "react";
import { cx } from "@shared/lib/class-names";
import { GROUP_TYPE_LABELS, personName } from "../entities/group.entity";
import type { Group } from "../entities/group.entity";
import styles from "../../UI/group-detail.module.css";

// TODO(i18n): move to a groups namespace in src/i18n.
const INFO_COPY = {
  type: "Tipo",
  status: "Estado",
  active: "Activo",
  inactive: "Inactivo",
  description: "Descripción",
  period: "Periodo",
  members: "Integrantes",
  noLimit: "sin límite",
  parent: "Subgrupo de",
  leader: "Líder del simulador",
  noLeader: "Sin líder asignado",
  creator: "Creado por",
  none: "—",
} as const;

function periodText(group: Group): string {
  const parts = [group.semester, group.academicYear].filter((part): part is string => Boolean(part));

  return parts.length > 0 ? parts.join(" · ") : INFO_COPY.none;
}

function membersText(group: Group): string {
  return `${group.membersCount} / ${group.maxStudents === null ? INFO_COPY.noLimit : group.maxStudents}`;
}

type Fact = [term: string, value: ReactNode];

export type GroupInfoProps = {
  group: Group
};

export function GroupInfo({ group }: GroupInfoProps) {
  const status = (
    <Chip
      label={group.isActive ? INFO_COPY.active : INFO_COPY.inactive}
      size="small"
      variant={group.isActive ? "outlined" : "filled"}
    />
  );
  const facts: Fact[] = [
    [INFO_COPY.type, GROUP_TYPE_LABELS[group.type]],
    [INFO_COPY.status, status],
    [INFO_COPY.description, group.description ?? INFO_COPY.none],
    [INFO_COPY.period, periodText(group)],
    [INFO_COPY.members, membersText(group)],
  ];

  if (group.parentGroupName) {
    facts.push([INFO_COPY.parent, group.parentGroupName]);
  }

  if (group.type === "STUDENT") {
    facts.push([INFO_COPY.leader, group.leader ? personName(group.leader) : INFO_COPY.noLeader]);
  }

  facts.push([INFO_COPY.creator, group.creator ? personName(group.creator) : INFO_COPY.none]);

  return (
    <dl className={cx(styles.facts)}>
      {facts.map(([term, value]) => (
        <div key={term} className={cx(styles.fact)}>
          <dt className={cx(styles.term)}>{term}</dt>
          <dd className={cx(styles.value)}>{value}</dd>
        </div>
      ))}
    </dl>
  );
}
