/*
* Funcionalidad: GroupFormDialog
* Descripción: Dialog form to create or edit a student group: name (required), description, semester, academic year and student limit (empty = no limit; otherwise an integer >= 1). Validates on submit with validateGroupDraft and shows per-field errors (noValidate, labelled fields), shows a server error inline (alert) and blocks closing while saving. The parent mounts it per opening, so the draft starts from initialDraft. v1.1 (T11c): optional typeOptions; with more than one type (admins creating a group) a labelled native select "Tipo de grupo" sets the draft type. v1.2 (T6b): text fields are design-system FormFields and the submit is an AsyncButton (centered spinner + aria-busy while saving). Depends on MUI, @shared/design-system, the group entity and the group detail CSS Module. v1.3 (B4, D7): the student limit help adds INTEGER_HELPER_TEXT.
* Versión: 1.3
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

import Alert from "@mui/material/Alert";
import Button from "@mui/material/Button";
import Dialog from "@mui/material/Dialog";
import DialogActions from "@mui/material/DialogActions";
import DialogContent from "@mui/material/DialogContent";
import DialogTitle from "@mui/material/DialogTitle";
import TextField from "@mui/material/TextField";
import { useId, useState } from "react";
import type { FormEvent } from "react";
import { AsyncButton } from "@shared/design-system/components/async-button";
import { FormField } from "@shared/design-system/components/form-field";
import { cx } from "@shared/lib/class-names";
import { INTEGER_HELPER_TEXT } from "@shared/lib/parse-decimal";
import { GROUP_TYPE_LABELS, validateGroupDraft } from "../entities/group.entity";
import type { GroupDraft, GroupDraftErrors, GroupDraftField, GroupType } from "../entities/group.entity";
import styles from "../../UI/group-detail.module.css";

// TODO(i18n): move to a groups namespace in src/i18n.
const FORM_COPY = {
  name: "Nombre del grupo",
  description: "Descripción",
  semester: "Semestre",
  academicYear: "Año académico",
  maxStudents: "Límite de estudiantes",
  maxStudentsHelp: `Déjalo vacío si el grupo no tiene límite. ${INTEGER_HELPER_TEXT}`,
  type: "Tipo de grupo",
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
  // More than one type shows the type selector (admins create student and teacher groups).
  typeOptions?: readonly GroupType[]
};

export function GroupFormDialog({ title, submitLabel, initialDraft, pending, error, onSubmit, onCancel, typeOptions = [] }: GroupFormDialogProps) {
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
    const helper = name === "maxStudents" ? FORM_COPY.maxStudentsHelp : undefined;

    return (
      <FormField
        name={name}
        label={label}
        value={draft[name]}
        onChange={(event) => change(name, event.target.value)}
        error={fieldError}
        helperText={helper}
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
            {typeOptions.length > 1 ? (
              <TextField
                select
                name="type"
                label={FORM_COPY.type}
                value={draft.type}
                onChange={(event) => setDraft((current) => ({ ...current, type: event.target.value as GroupType }))}
                slotProps={{ select: { native: true }, inputLabel: { shrink: true } }}
                disabled={pending}
                fullWidth
              >
                {typeOptions.map((type) => (
                  <option key={type} value={type}>
                    {GROUP_TYPE_LABELS[type]}
                  </option>
                ))}
              </TextField>
            ) : null}
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
          <AsyncButton type="submit" variant="contained" loading={pending}>
            {submitLabel}
          </AsyncButton>
        </DialogActions>
      </form>
    </Dialog>
  );
}
