/*
* Funcionalidad: StudentCodeDialog
* Descripción: Dialog of "Editar código" in /admin/users: one text field with the current student code (empty clears it), validated on the client with the backend rule (1 to 32 letters, digits or hyphens) before `PATCH /api/users/{id}/student-code`. A 409 (another user has the code) is shown under the field as "Código ya en uso"; a 400 with per-field errors (`data.errors`) shows the server message under the field; any other failure stays in the dialog as an alert. While the PATCH is pending, Escape and the backdrop do not close it. Depends on MUI, the design-system async button and form field, the admin console entities and CSS Module.
* Versión: 1.0
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
import { useId, useState } from "react";
import type { FormEvent } from "react";
import { toApiError } from "@shared/api-client/api-error";
import { AsyncButton } from "@shared/design-system/components/async-button";
import { FormField } from "@shared/design-system/components/form-field";
import { cx } from "@shared/lib/class-names";
import { getAdminConsoleErrorMessage, serverFieldErrors, STUDENT_CODE_IN_USE_CODE } from "../entities/admin-console-error-messages";
import { parseStudentCode, STUDENT_CODE_COPY, STUDENT_CODE_MAX_LENGTH } from "../entities/admin-users.entity";
import type { AdminUserRow } from "../entities/admin-users.entity";
import styles from "../../UI/admin-users.module.css";

// TODO(i18n): move to an admin-console namespace in src/i18n.
export const STUDENT_CODE_DIALOG_COPY = {
  title: (name: string) => `Código de estudiante de ${name}`,
  label: "Código de estudiante",
  help: "Déjalo vacío para quitar el código.",
  cancel: "Cancelar",
  save: "Guardar código",
} as const;

export type StudentCodeDialogProps = {
  user: AdminUserRow | null
  onConfirm: (user: AdminUserRow, studentCode: string | null) => Promise<void>
  onClose: () => void
};

type FormProps = {
  user: AdminUserRow
  onConfirm: StudentCodeDialogProps["onConfirm"]
  onClose: () => void
  titleId: string
  pending: boolean
  onPendingChange: (pending: boolean) => void
};

/** Message of a failed PATCH placed under the field when it is about the code; null when it belongs to the dialog. */
function fieldMessageOf(error: unknown): string | null {
  const apiError = toApiError(error);

  if (apiError.code === STUDENT_CODE_IN_USE_CODE || apiError.status === 409) {
    return STUDENT_CODE_COPY.inUse;
  }

  const fields = serverFieldErrors(apiError);
  const match = fields.find((item) => item.field === "studentCode") ?? fields[0];

  if (match) {
    return match.message;
  }

  return apiError.code === "users.student_code_invalid" ? getAdminConsoleErrorMessage(apiError) : null;
}

function StudentCodeForm({ user, onConfirm, onClose, titleId, pending, onPendingChange }: FormProps) {
  const [text, setText] = useState(user.studentCode ?? "");
  const [fieldError, setFieldError] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const parsed = parseStudentCode(text);
  const shownError = fieldError ?? parsed.error;
  const unchanged = parsed.error === null && parsed.value === user.studentCode;
  const name = user.name?.trim() || user.email;

  const submit = async(event?: FormEvent) => {
    event?.preventDefault();

    if (parsed.error || unchanged) {
      return;
    }

    onPendingChange(true);
    setError(null);
    setFieldError(null);

    try {
      await onConfirm(user, parsed.value);
    } catch (caught) {
      const message = fieldMessageOf(caught);

      if (message) {
        setFieldError(message);
      } else {
        setError(getAdminConsoleErrorMessage(caught));
      }
    } finally {
      onPendingChange(false);
    }
  };

  return (
    <form onSubmit={(event) => void submit(event)} noValidate>
      <DialogTitle id={titleId}>{STUDENT_CODE_DIALOG_COPY.title(name)}</DialogTitle>
      <DialogContent>
        <div className={cx(styles.dialogBody)}>
          <FormField
            label={STUDENT_CODE_DIALOG_COPY.label}
            value={text}
            disabled={pending}
            error={shownError ?? undefined}
            helperText={STUDENT_CODE_DIALOG_COPY.help}
            slotProps={{ htmlInput: { maxLength: STUDENT_CODE_MAX_LENGTH + 8 } }}
            onChange={(event) => {
              setText(event.target.value);
              setFieldError(null);
            }}
          />
          {error ? <Alert severity="error" role="alert">{error}</Alert> : null}
        </div>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={pending}>{STUDENT_CODE_DIALOG_COPY.cancel}</Button>
        <AsyncButton type="submit" variant="contained" loading={pending} disabled={parsed.error !== null || unchanged}>
          {STUDENT_CODE_DIALOG_COPY.save}
        </AsyncButton>
      </DialogActions>
    </form>
  );
}

export function StudentCodeDialog({ user, onConfirm, onClose }: StudentCodeDialogProps) {
  const titleId = useId();
  const [pending, setPending] = useState(false);

  // Escape and the backdrop must not close the dialog while the change is in flight.
  const close = () => {
    if (!pending) {
      onClose();
    }
  };

  return (
    <Dialog open={user !== null} onClose={close} aria-labelledby={titleId} fullWidth maxWidth="xs">
      {user ? (
        <StudentCodeForm
          key={user.id}
          user={user}
          onConfirm={onConfirm}
          onClose={close}
          titleId={titleId}
          pending={pending}
          onPendingChange={setPending}
        />
      ) : null}
    </Dialog>
  );
}
