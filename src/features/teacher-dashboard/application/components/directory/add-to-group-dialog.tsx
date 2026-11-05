/*
* Funcionalidad: AddToGroupDialog
* Descripción: Dialog "Agregar a grupo existente" of the students directory and the student detail (ajustes D2): a native select of the student groups the teacher manages (`GET /api/groups?type=STUDENT`, the teacher scope of the backend; admins see every student group), the students as chips and "Agregar", which adds each one (useAddToGroup, 4 at a time) and reports who could not be added and why (for example, already in another active student group). A full success closes the dialog after 1.8 s like "Conformar Grupo". Depends on MUI, the design-system form field, useTeacherGroups, useAddToGroup, the group builder entity and the students directory CSS Module.
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
import { ADD_TO_GROUP_COPY, GROUP_BUILDER_COPY } from "../../entities/group-builder.entity";
import { useAddToGroup } from "../../hooks/use-group-builder";
import type { GroupMemberCandidate } from "../../hooks/use-group-builder";
import { useTeacherGroups } from "../../hooks/use-teacher-groups";
import { SUCCESS_CLOSE_DELAY_MS } from "./group-builder-dialog";
import styles from "../../../UI/students-directory.module.css";

const NATIVE_SELECT = { select: { native: true }, inputLabel: { shrink: true } } as const;

export type AddToGroupDialogProps = {
  open: boolean
  members: readonly GroupMemberCandidate[]
  /** `added` is true when at least one student was added. */
  onClose: (added: boolean) => void
  onExited?: () => void
};

export function AddToGroupDialog({ open, members, onClose, onExited }: AddToGroupDialogProps) {
  const titleId = useId();
  const formId = useId();
  const { groups, isLoading, error } = useTeacherGroups();
  const { state, add, reset } = useAddToGroup();
  const [groupId, setGroupId] = useState("");
  const [wasOpen, setWasOpen] = useState(open);
  const saving = state.status === "saving";
  const done = state.status === "added" || state.status === "partial";
  const added = state.status === "added" || (state.status === "partial" && state.failures.length < members.length);
  const groupName = groups?.find((group) => group.id === groupId)?.name ?? "";

  if (open !== wasOpen) {
    setWasOpen(open);

    if (open) {
      setGroupId("");
      reset();
    }
  }

  useEffect(() => {
    if (state.status !== "added") {
      return undefined;
    }

    const timer = setTimeout(() => onClose(true), SUCCESS_CLOSE_DELAY_MS);

    return () => clearTimeout(timer);
  }, [state.status, onClose]);

  const close = () => {
    if (!saving) {
      onClose(added);
    }
  };

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!groupId || saving || done || members.length === 0) {
      return;
    }

    void add(groupId, members);
  };

  const renderGroupField = () => {
    if (error) {
      return <Alert severity="error" role="alert">{ADD_TO_GROUP_COPY.loadGroupsFailed}</Alert>;
    }

    if (!groups) {
      return <p className={cx(styles.dialogSubtitle)} role="status">{isLoading ? ADD_TO_GROUP_COPY.loadingGroups : ""}</p>;
    }

    if (groups.length === 0) {
      return <p className={cx(styles.dialogSubtitle)}>{ADD_TO_GROUP_COPY.noGroups}</p>;
    }

    return (
      <FormField
        select
        label={ADD_TO_GROUP_COPY.group}
        size="small"
        fullWidth
        required
        autoFocus
        value={groupId}
        disabled={saving || done}
        onChange={(event) => setGroupId(event.target.value)}
        slotProps={NATIVE_SELECT}
      >
        <option value="">{ADD_TO_GROUP_COPY.chooseGroup}</option>
        {groups.map((group) => <option key={group.id} value={group.id}>{group.name}</option>)}
      </FormField>
    );
  };

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
        {ADD_TO_GROUP_COPY.title}
        <span className={cx(styles.dialogSubtitle)}>{` · ${GROUP_BUILDER_COPY.selectedCount(members.length)}`}</span>
      </DialogTitle>
      <DialogContent>
        <form id={formId} className={cx(styles.dialogContent)} onSubmit={submit} noValidate>
          {state.status === "added" ? <Alert severity="success" role="status">{ADD_TO_GROUP_COPY.success(groupName)}</Alert> : null}
          {state.status === "partial" ? (
            <Alert severity="warning" role="alert">
              {ADD_TO_GROUP_COPY.partialFailure(state.failures.length)}
              <ul className={cx(styles.failureList)} aria-label={ADD_TO_GROUP_COPY.failureList}>
                {state.failures.map((failure) => (
                  <li key={failure.id}>{GROUP_BUILDER_COPY.failureItem(failure.name, failure.reason)}</li>
                ))}
              </ul>
            </Alert>
          ) : null}
          {renderGroupField()}
          <div>
            <h3 className={cx(styles.membersTitle)}>{ADD_TO_GROUP_COPY.members}</h3>
            {members.length === 0 ? <p className={cx(styles.dialogSubtitle)}>{GROUP_BUILDER_COPY.noMembers}</p> : (
              <ul className={cx(styles.chips)} aria-label={ADD_TO_GROUP_COPY.members}>
                {members.map((member) => <li key={member.id}><Chip size="small" label={member.name} /></li>)}
              </ul>
            )}
          </div>
        </form>
      </DialogContent>
      <DialogActions>
        {done ? (
          <Button autoFocus onClick={close}>{ADD_TO_GROUP_COPY.close}</Button>
        ) : (
          <>
            <Button onClick={close} disabled={saving}>{ADD_TO_GROUP_COPY.cancel}</Button>
            <Button
              type="submit"
              form={formId}
              variant="contained"
              disabled={!groupId || saving || members.length === 0}
              startIcon={saving ? <CircularProgress size={16} color="inherit" aria-hidden="true" /> : null}
            >
              {saving ? ADD_TO_GROUP_COPY.adding : ADD_TO_GROUP_COPY.add}
            </Button>
          </>
        )}
      </DialogActions>
    </Dialog>
  );
}
