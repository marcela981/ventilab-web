/*
* Funcionalidad: MyGroupDetails
* Descripción: Card of the student's own group: the group name as heading, the simulator leader ("Sin líder asignado" when none), the member names in a labelled list with a "Líder" chip on the leader, and the supervising teacher groups in a labelled list (or a note when none). Read only. Depends on MUI, the group entity and the groups CSS Module.
* Versión: 1.0
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

import Chip from "@mui/material/Chip";
import Typography from "@mui/material/Typography";
import { useId } from "react";
import { cx } from "@shared/lib/class-names";
import { MEMBER_ROLE_LABELS, personName } from "../entities/group.entity";
import type { MyStudentGroup } from "../entities/group.entity";
import styles from "../../UI/my-group.module.css";

// TODO(i18n): move to a groups namespace in src/i18n.
const DETAILS_COPY = {
  leader: "Líder del simulador",
  noLeader: "Sin líder asignado",
  members: "Integrantes",
  supervisors: "Grupos docentes que lo supervisan",
  noSupervisors: "Ningún grupo docente supervisa este grupo todavía.",
} as const;

export type MyGroupDetailsProps = {
  group: MyStudentGroup
};

export function MyGroupDetails({ group }: MyGroupDetailsProps) {
  const titleId = useId();
  const membersId = useId();
  const supervisorsId = useId();

  return (
    <section className={cx(styles.card)} aria-labelledby={titleId}>
      <Typography id={titleId} component="h2" variant="h5">
        {group.name}
      </Typography>
      <dl className={cx(styles.facts)}>
        <dt className={cx(styles.term)}>{DETAILS_COPY.leader}</dt>
        <dd className={cx(styles.value)}>{group.leader ? personName(group.leader) : DETAILS_COPY.noLeader}</dd>
      </dl>
      <Typography id={membersId} component="h3" variant="h6">
        {`${DETAILS_COPY.members} (${group.members.length})`}
      </Typography>
      <ul className={cx(styles.list)} aria-labelledby={membersId}>
        {group.members.map((member) => (
          <li key={member.userId} className={cx(styles.item)}>
            <span>{personName(member)}</span>
            {member.memberRole === "LEADER" ? <Chip label={MEMBER_ROLE_LABELS.LEADER} size="small" variant="outlined" /> : null}
          </li>
        ))}
      </ul>
      <Typography id={supervisorsId} component="h3" variant="h6">
        {DETAILS_COPY.supervisors}
      </Typography>
      {group.supervisingGroups.length > 0 ? (
        <ul className={cx(styles.list)} aria-labelledby={supervisorsId}>
          {group.supervisingGroups.map((supervisor) => (
            <li key={supervisor.id} className={cx(styles.item)}>
              {supervisor.name}
            </li>
          ))}
        </ul>
      ) : (
        <Typography variant="body2" className={cx(styles.muted)}>
          {DETAILS_COPY.noSupervisors}
        </Typography>
      )}
    </section>
  );
}
