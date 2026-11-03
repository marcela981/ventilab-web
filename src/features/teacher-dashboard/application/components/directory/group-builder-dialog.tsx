/*
* Funcionalidad: GroupBuilderDialog
* Descripción: "Conformar Grupo" dialog of the students directory (July's GroupBuilderModal texts and steps): "Nombre del grupo" (required) and "Semestre (opcional)", the selected students as "Integrantes" chips, "Cancelar" and "Crear Grupo". Creating runs useGroupBuilder: when every student was added it shows "¡Grupo creado correctamente!" and closes after 1.8 s (as July); when some failed it shows July's exact `Grupo creado, pero ${n} estudiante(s) no pudieron agregarse.` with the reason of each student below and stays open until "Cerrar" (deviation: July closed on its own and hid the reasons); a failed creation shows the error and can be retried. MUI Dialog traps the focus and gives it back to the opener; onExited lets the container move it when the opener is gone. Closing is ignored while saving. onClose reports whether a group was created. Depends on MUI, React, the design-system form field, the group builder hook and entity and the students directory CSS Module.
* Versión: 1.0
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

import Alert from "@mui/material/Alert";
import Button from "@mui/material/Button";
import Chip from "@mui/material/Chip";
import CircularProgress from "@mui/material/CircularProgress";
import Dialog from "@mui/material/Dialog";
import DialogActions from "@mui/material/DialogActions";
import DialogContent from "@mui/material/DialogContent";
import DialogTitle from "@mui/material/DialogTitle";
import { useEffect, useId, useState } from "react";
import type { FormEvent } from "react";
import { FormField } from "@shared/design-system/components/form-field";
import { cx } from "@shared/lib/class-names";
import { GROUP_BUILDER_COPY } from "../../entities/group-builder.entity";
import { useGroupBuilder } from "../../hooks/use-group-builder";
import type { GroupMemberCandidate } from "../../hooks/use-group-builder";
import styles from "../../../UI/students-directory.module.css";

/** July closed the dialog 1.8 s after a full success. */
export const SUCCESS_CLOSE_DELAY_MS = 1800;

export type GroupBuilderDialogProps = {
  open: boolean
  members: readonly GroupMemberCandidate[]
  /** `created` is true when the group exists (full or partial success). */
  onClose: (created: boolean) => void
  onExited?: () => void
};

export function GroupBuilderDialog({ open, members, onClose, onExited }: GroupBuilderDialogProps) {
  const titleId = useId();
  const formId = useId();
  const { state, create, reset } = useGroupBuilder();
  const [name, setName] = useState("");
  const [semester, setSemester] = useState("");
  const [wasOpen, setWasOpen] = useState(open);
  const saving = state.status === "saving";
  const created = state.status === "created" || state.status === "partial";

  // Every opening starts with an empty form.
  if (open !== wasOpen) {
    setWasOpen(open);

    if (open) {
      setName("");
      setSemester("");
      reset();
    }
  }

  useEffect(() => {
    if (state.status !== "created") {
      return undefined;
    }

    const timer = setTimeout(() => onClose(true), SUCCESS_CLOSE_DELAY_MS);

    return () => clearTimeout(timer);
  }, [state.status, onClose]);

  const close = () => {
    if (!saving) {
      onClose(created);
    }
  };

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!name.trim() || saving || created || members.length === 0) {
      return;
    }

    void create({ name, semester, members });
  };

  const locked = saving || created;

  return (
    <Dialog
      open={open}
      onClose={close}
      aria-labelledby={titleId}
      maxWidth="sm"
      fullWidth
      {...(onExited ? { slotProps: { transition: { onExited } } } : {})}
    >
      <DialogTitle id={titleId}>
        {GROUP_BUILDER_COPY.title}
        <span className={cx(styles.dialogSubtitle)}>{` · ${GROUP_BUILDER_COPY.selectedCount(members.length)}`}</span>
      </DialogTitle>
      <DialogContent>
        <form id={formId} className={cx(styles.dialogContent)} onSubmit={submit} noValidate>
          {state.status === "created" ? <Alert severity="success" role="status">{GROUP_BUILDER_COPY.success}</Alert> : null}
          {state.status === "partial" ? (
            <Alert severity="warning" role="alert">
              {GROUP_BUILDER_COPY.partialFailure(state.failures.length)}
              <ul className={cx(styles.failureList)} aria-label={GROUP_BUILDER_COPY.failureList}>
                {state.failures.map((failure) => (
                  <li key={failure.id}>{GROUP_BUILDER_COPY.failureItem(failure.name, failure.reason)}</li>
                ))}
              </ul>
            </Alert>
          ) : null}
          {state.status === "error" ? (
            <Alert severity="error" role="alert">{`${GROUP_BUILDER_COPY.createFailed} ${state.message}`}</Alert>
          ) : null}
          <FormField
            label={GROUP_BUILDER_COPY.name}
            placeholder={GROUP_BUILDER_COPY.namePlaceholder}
            size="small"
            fullWidth
            required
            autoFocus
            value={name}
            disabled={locked}
            onChange={(event) => setName(event.target.value)}
          />
          <FormField
            label={GROUP_BUILDER_COPY.semester}
            placeholder={GROUP_BUILDER_COPY.semesterPlaceholder}
            size="small"
            fullWidth
            value={semester}
            disabled={locked}
            onChange={(event) => setSemester(event.target.value)}
          />
          <div>
            <h3 className={cx(styles.membersTitle)}>{GROUP_BUILDER_COPY.members}</h3>
            {members.length === 0 ? <p className={cx(styles.dialogSubtitle)}>{GROUP_BUILDER_COPY.noMembers}</p> : (
              <ul className={cx(styles.chips)} aria-label={GROUP_BUILDER_COPY.members}>
                {members.map((member) => <li key={member.id}><Chip size="small" label={member.name} /></li>)}
              </ul>
            )}
          </div>
        </form>
      </DialogContent>
      <DialogActions>
        {created ? (
          // The submit button is gone: the focus moves to "Cerrar" so it never falls out of the dialog.
          <Button autoFocus onClick={close}>{GROUP_BUILDER_COPY.close}</Button>
        ) : (
          <>
            <Button onClick={close} disabled={saving}>{GROUP_BUILDER_COPY.cancel}</Button>
            <Button
              type="submit"
              form={formId}
              variant="contained"
              disabled={!name.trim() || saving || members.length === 0}
              startIcon={saving ? <CircularProgress size={16} color="inherit" aria-hidden="true" /> : null}
            >
              {saving ? GROUP_BUILDER_COPY.creating : GROUP_BUILDER_COPY.create}
            </Button>
          </>
        )}
      </DialogActions>
    </Dialog>
  );
}
