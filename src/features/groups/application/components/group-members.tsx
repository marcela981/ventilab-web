/*
* Funcionalidad: GroupMembers
* Descripción: Members list of a group (labelled list): name, email, a "Líder" chip for the simulator leader and, when the user can manage the group, "Hacer líder" (student groups, non-leaders) and "Quitar" buttons whose accessible names include the member. The confirmations live in the detail page. Depends on MUI, the group entity and the group detail CSS Module.
* Versión: 1.0
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

import Button from "@mui/material/Button";
import Chip from "@mui/material/Chip";
import { cx } from "@shared/lib/class-names";
import { MEMBER_ROLE_LABELS, personName } from "../entities/group.entity";
import type { GroupMember } from "../entities/group.entity";
import styles from "../../UI/group-detail.module.css";

// TODO(i18n): move to a groups namespace in src/i18n.
const MEMBERS_COPY = {
  label: "Integrantes del grupo",
  empty: "Este grupo todavía no tiene integrantes.",
  makeLeader: "Hacer líder",
  remove: "Quitar",
} as const;

export type GroupMembersProps = {
  members: readonly GroupMember[]
  canManage: boolean
  canLead: boolean
  disabled: boolean
  onMakeLeader: (member: GroupMember) => void
  onRemove: (member: GroupMember) => void
};

export function GroupMembers({ members, canManage, canLead, disabled, onMakeLeader, onRemove }: GroupMembersProps) {
  if (members.length === 0) {
    return <p className={cx(styles.muted)}>{MEMBERS_COPY.empty}</p>;
  }

  return (
    <ul className={cx(styles.list)} aria-label={MEMBERS_COPY.label}>
      {members.map((member) => {
        const name = personName(member);
        const isLeader = member.memberRole === "LEADER";

        return (
          <li key={member.userId} className={cx(styles.item)}>
            <span className={cx(styles.person)}>
              <span className={cx(styles.personName)}>{name}</span>
              <span className={cx(styles.muted)}>{member.email}</span>
            </span>
            {isLeader ? <Chip label={MEMBER_ROLE_LABELS.LEADER} size="small" variant="outlined" /> : null}
            {canManage ? (
              <span className={cx(styles.itemActions)}>
                {canLead && !isLeader ? (
                  <Button
                    size="small"
                    onClick={() => onMakeLeader(member)}
                    disabled={disabled}
                    aria-label={`${MEMBERS_COPY.makeLeader}: ${name}`}
                  >
                    {MEMBERS_COPY.makeLeader}
                  </Button>
                ) : null}
                <Button
                  size="small"
                  color="error"
                  onClick={() => onRemove(member)}
                  disabled={disabled}
                  aria-label={`${MEMBERS_COPY.remove} a ${name}`}
                >
                  {MEMBERS_COPY.remove}
                </Button>
              </span>
            ) : null}
          </li>
        );
      })}
    </ul>
  );
}
