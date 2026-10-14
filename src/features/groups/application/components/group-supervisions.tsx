/*
* Funcionalidad: GroupSupervisions
* Descripción: Supervisions panel of a teacher group (admin view only): lists the student groups it supervises (`GET /api/groups/{id}/supervisions`; name links to the group detail, "Inactivo" chip) with a "Quitar supervisión" button per group, and adds a supervision by picking a student group from `GET /api/groups` that is not supervised yet (labelled native select + "Agregar supervisión"). The parent runs the mutations (remove behind a ConfirmDialog) and reports the result; a successful add clears the selection. Loading and error states (with retry) for both reads. Depends on MUI, next/link, @shared/design-system, useGroupSupervisions, useGroups, the group entity, the groups error messages and the group detail CSS Module.
* Versión: 1.0
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

import AddLinkIcon from "@mui/icons-material/AddLink";
import Button from "@mui/material/Button";
import Chip from "@mui/material/Chip";
import TextField from "@mui/material/TextField";
import Link from "next/link";
import { useMemo, useState } from "react";
import { ErrorState } from "@shared/design-system/components/error-state";
import { cx } from "@shared/lib/class-names";
import { supervisableGroups } from "../entities/group.entity";
import type { Group, GroupSupervision } from "../entities/group.entity";
import { getGroupErrorMessage } from "../entities/groups-error-messages";
import { useGroupSupervisions } from "../hooks/use-group-supervisions";
import { useGroups } from "../hooks/use-groups";
import styles from "../../UI/group-detail.module.css";

// TODO(i18n): move to a groups namespace in src/i18n.
const SUPERVISION_COPY = {
  list: "Grupos de estudiantes supervisados",
  loading: "Cargando supervisiones…",
  loadError: "No se pudieron cargar las supervisiones",
  empty: "Este grupo docente todavía no supervisa grupos de estudiantes.",
  inactive: "Inactivo",
  remove: "Quitar supervisión",
  add: "Agregar supervisión",
  select: "Grupo de estudiantes",
  placeholder: "Selecciona un grupo",
  inactiveSuffix: " (inactivo)",
  groupsLoading: "Cargando grupos de estudiantes…",
  groupsError: "No se pudieron cargar los grupos de estudiantes",
  noCandidates: "No quedan grupos de estudiantes por supervisar.",
} as const;

export type GroupSupervisionsProps = {
  teacherGroupId: string
  disabled: boolean
  // Resolves true when the supervision was added.
  onAdd: (studentGroup: Pick<Group, "id" | "name">) => Promise<boolean>
  onRemove: (supervision: GroupSupervision) => void
};

type AddSupervisionProps = {
  supervisions: readonly GroupSupervision[]
  disabled: boolean
  onAdd: GroupSupervisionsProps["onAdd"]
};

function AddSupervision({ supervisions, disabled, onAdd }: AddSupervisionProps) {
  const { groups, isLoading, error, reload } = useGroups();
  const [selectedId, setSelectedId] = useState("");
  const candidates = useMemo(() => (groups ? supervisableGroups(groups, supervisions) : []), [groups, supervisions]);
  const selected = candidates.find((group) => group.id === selectedId);

  if (!groups && error) {
    return <ErrorState title={SUPERVISION_COPY.groupsError} description={getGroupErrorMessage(error)} onRetry={() => void reload()} />;
  }

  if (!groups) {
    return <p className={cx(styles.muted)} role="status">{isLoading ? SUPERVISION_COPY.groupsLoading : ""}</p>;
  }

  if (candidates.length === 0) {
    return <p className={cx(styles.muted)}>{SUPERVISION_COPY.noCandidates}</p>;
  }

  const add = async() => {
    if (selected && await onAdd(selected)) {
      setSelectedId("");
    }
  };

  return (
    <div className={cx(styles.formRow)}>
      <TextField
        select
        label={SUPERVISION_COPY.select}
        value={selected ? selectedId : ""}
        onChange={(event) => setSelectedId(event.target.value)}
        slotProps={{ select: { native: true }, inputLabel: { shrink: true } }}
        disabled={disabled}
        size="small"
      >
        <option value="">{SUPERVISION_COPY.placeholder}</option>
        {candidates.map((group) => (
          <option key={group.id} value={group.id}>
            {`${group.name}${group.isActive ? "" : SUPERVISION_COPY.inactiveSuffix}`}
          </option>
        ))}
      </TextField>
      <Button startIcon={<AddLinkIcon />} onClick={() => void add()} disabled={disabled || !selected}>
        {SUPERVISION_COPY.add}
      </Button>
    </div>
  );
}

export function GroupSupervisions({ teacherGroupId, disabled, onAdd, onRemove }: GroupSupervisionsProps) {
  const { supervisions, isLoading, error, reload } = useGroupSupervisions(teacherGroupId);

  if (!supervisions && error) {
    return <ErrorState title={SUPERVISION_COPY.loadError} description={getGroupErrorMessage(error)} onRetry={() => void reload()} />;
  }

  if (!supervisions) {
    return <p className={cx(styles.muted)} role="status">{isLoading ? SUPERVISION_COPY.loading : ""}</p>;
  }

  return (
    <>
      {supervisions.length === 0 ? (
        <p className={cx(styles.muted)}>{SUPERVISION_COPY.empty}</p>
      ) : (
        <ul className={cx(styles.list)} aria-label={SUPERVISION_COPY.list}>
          {supervisions.map((supervision) => {
            const { id, name, isActive } = supervision.studentGroup;

            return (
              <li key={id} className={cx(styles.item)}>
                <span className={cx(styles.person)}>
                  <Link href={`/groups/${id}`} className={cx(styles.groupLink)}>{name}</Link>
                </span>
                {isActive ? null : <Chip label={SUPERVISION_COPY.inactive} size="small" variant="outlined" />}
                <Button
                  size="small"
                  color="error"
                  onClick={() => onRemove(supervision)}
                  disabled={disabled}
                  aria-label={`${SUPERVISION_COPY.remove} de ${name}`}
                >
                  {SUPERVISION_COPY.remove}
                </Button>
              </li>
            );
          })}
        </ul>
      )}
      <AddSupervision supervisions={supervisions} disabled={disabled} onAdd={onAdd} />
    </>
  );
}
