/*
* Funcionalidad: GroupFormDialog
* Descripción: Dialog form to create or edit a student group: name (required), description, semester, academic year and student limit (empty = no limit; otherwise an integer >= 1). Validates on submit with validateGroupDraft and shows per-field errors (noValidate, labelled fields), shows a server error inline (alert) and blocks closing while saving. The parent mounts it per opening, so the draft starts from initialDraft. Depends on MUI, the group entity and the group detail CSS Module.
* Versión: 1.0
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

import Alert from "@mui/material/Alert";
import Button from "@mui/material/Button";
import CircularProgress from "@mui/material/CircularProgress";
import Dialog from "@mui/material/Dialog";
import DialogActions from "@mui/material/DialogActions";
import DialogContent from "@mui/material/DialogContent";
import DialogTitle from "@mui/material/DialogTitle";
import TextField from "@mui/material/TextField";
import { useId, useState } from "react";
import type { FormEvent } from "react";
import { cx } from "@shared/lib/class-names";
import { validateGroupDraft } from "../entities/group.entity";
import type { GroupDraft, GroupDraftErrors, GroupDraftField } from "../entities/group.entity";
import styles from "../../UI/group-detail.module.css";

// TODO(i18n): move to a groups namespace in src/i18n.
const FORM_COPY = {
  name: "Nombre del grupo",
  description: "Descripción",
  semester: "Semestre",
  academicYear: "Año académico",
  maxStudents: "Límite de estudiantes",
  maxStudentsHelp: "Déjalo vacío si el grupo no tiene límite.",
  cancel: "Cancelar",
} as const;

type TextFieldName = keyof Omit<GroupDraft, "type">;

export type GroupFormDialogProps = {
  title: string
  submitLabel: string
  initialDraft: GroupDraft
  pending: boolean
  error: string | null
  onSubmit: (draft: GroupDraft) => void
  onCancel: () => void
};

export function GroupFormDialog({ title, submitLabel, initialDraft, pending, error, onSubmit, onCancel }: GroupFormDialogProps) {
  const titleId = useId();
  const [draft, setDraft] = useState<GroupDraft>(initialDraft);
  const [fieldErrors, setFieldErrors] = useState<GroupDraftErrors>({});

  const change = (field: TextFieldName, value: string) => {
    setDraft((current) => ({ ...current, [field]: value }));

    if (field === "name" || field === "maxStudents") {
      setFieldErrors((current) => {
        const next = { ...current };

        delete next[field as GroupDraftField];

        return next;
      });
    }
  };

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const errors = validateGroupDraft(draft);

    setFieldErrors(errors);

    if (Object.keys(errors).length === 0) {
      onSubmit(draft);
    }
  };

  const field = (name: TextFieldName, label: string, extra: { multiline?: boolean, required?: boolean, numeric?: boolean } = {}) => {
    const fieldError = name === "name" || name === "maxStudents" ? fieldErrors[name] : undefined;
    const helper = fieldError ?? (name === "maxStudents" ? FORM_COPY.maxStudentsHelp : undefined);

    return (
      <TextField
        name={name}
        label={label}
        value={draft[name]}
        onChange={(event) => change(name, event.target.value)}
        error={Boolean(fieldError)}
        {...(helper ? { helperText: helper } : {})}
        {...(extra.multiline ? { multiline: true, minRows: 2 } : {})}
        {...(extra.numeric ? { slotProps: { htmlInput: { inputMode: "numeric" as const } } } : {})}
        required={extra.required ?? false}
        disabled={pending}
        fullWidth
      />
    );
  };

  return (
    <Dialog open onClose={() => (pending ? undefined : onCancel())} aria-labelledby={titleId} fullWidth maxWidth="sm">
      <form noValidate onSubmit={submit}>
        <DialogTitle id={titleId}>{title}</DialogTitle>
        <DialogContent>
          <div className={cx(styles.form)}>
            {error ? <Alert severity="error">{error}</Alert> : null}
            {field("name", FORM_COPY.name, { required: true })}
            {field("description", FORM_COPY.description, { multiline: true })}
            <div className={cx(styles.formRow)}>
              {field("semester", FORM_COPY.semester)}
              {field("academicYear", FORM_COPY.academicYear)}
            </div>
            {field("maxStudents", FORM_COPY.maxStudents, { numeric: true })}
          </div>
        </DialogContent>
        <DialogActions>
          <Button onClick={onCancel} disabled={pending}>{FORM_COPY.cancel}</Button>
          <Button
            type="submit"
            variant="contained"
            disabled={pending}
            startIcon={pending ? <CircularProgress size={16} color="inherit" aria-hidden="true" /> : null}
          >
            {submitLabel}
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
}
