/*
* Funcionalidad: ActivateEvaluationDialog
* Descripción: Dialog "Activar evaluación" of the activations page: a checklist of the active student groups the caller manages (admins: every group; `GET /api/groups`), and the start and end date-time of the window as native datetime-local fields read in America/Bogota (UTC-5). Defaults to the next full hour for one week. On submit it validates (at least one group, valid dates, end after start) and sends the body with the window converted to UTC ISO; a failure from the backend (403, 409, 422 mapped to Spanish by the page) stays visible in the dialog. Mounted only while open, so every opening starts from a fresh form. Depends on MUI, the design-system components, @shared/lib, the assignment entities and copy, the staff groups hook and the assignments CSS Module.
* Versión: 1.0
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

import Alert from "@mui/material/Alert";
import Button from "@mui/material/Button";
import Checkbox from "@mui/material/Checkbox";
import Dialog from "@mui/material/Dialog";
import DialogActions from "@mui/material/DialogActions";
import DialogContent from "@mui/material/DialogContent";
import DialogTitle from "@mui/material/DialogTitle";
import FormControlLabel from "@mui/material/FormControlLabel";
import { useId, useState } from "react";
import { AsyncButton } from "@shared/design-system/components/async-button";
import { FormField } from "@shared/design-system/components/form-field";
import { cx } from "@shared/lib/class-names";
import { ASSIGNMENTS_COPY } from "../../entities/assignments-copy";
import { defaultActivationForm, toActivationBody, validateActivation } from "../../entities/evaluation-assignment.entity";
import type { ActivationBody, ActivationErrors, ActivationForm } from "../../entities/evaluation-assignment.entity";
import { useStaffGroups } from "../../hooks/use-staff-groups";
import styles from "../../../UI/assignments.module.css";

const COPY = ASSIGNMENTS_COPY.dialog;

export type ActivateEvaluationDialogProps = {
  pending: boolean
  // Resolves to an error message, or null once the evaluation was activated.
  onSubmit: (body: ActivationBody) => Promise<string | null>
  onClose: () => void
  now?: Date | undefined
};

export function ActivateEvaluationDialog({ pending, onSubmit, onClose, now }: ActivateEvaluationDialogProps) {
  const { groups, isLoading, error, reload } = useStaffGroups(true);
  const [form, setForm] = useState<ActivationForm>(() => defaultActivationForm(now ?? new Date()));
  const [errors, setErrors] = useState<ActivationErrors>({});
  const [submitError, setSubmitError] = useState<string | null>(null);
  const titleId = useId();
  const groupsErrorId = useId();

  const toggleGroup = (groupId: string, checked: boolean) => {
    const groupIds = checked ? [...form.groupIds, groupId] : form.groupIds.filter((id) => id !== groupId);

    setForm({ ...form, groupIds });
  };

  const submit = async() => {
    const nextErrors = validateActivation(form);
    const body = toActivationBody(form);

    setErrors(nextErrors);

    if (!body) {
      return;
    }

    setSubmitError(await onSubmit(body));
  };

  const renderGroups = () => {
    if (groups === null) {
      if (error && !isLoading) {
        return (
          <Alert severity="error" action={<Button color="inherit" size="small" onClick={() => void reload()}>{COPY.retry}</Button>}>
            {COPY.groupsError}
          </Alert>
        );
      }

      return <p className={cx(styles.muted)}>{COPY.groupsLoading}</p>;
    }

    if (groups.length === 0) {
      return <p className={cx(styles.muted)}>{COPY.noGroups}</p>;
    }

    return (
      <div className={cx(styles.groupList)}>
        {groups.map((group) => (
          <FormControlLabel
            key={group.id}
            label={`${group.name} (${COPY.groupMembers(group.membersCount)})`}
            control={(
              <Checkbox
                checked={form.groupIds.includes(group.id)}
                onChange={(event) => toggleGroup(group.id, event.target.checked)}
              />
            )}
          />
        ))}
      </div>
    );
  };

  return (
    <Dialog open fullWidth maxWidth="sm" onClose={pending ? undefined : onClose} aria-labelledby={titleId}>
      <DialogTitle id={titleId}>{COPY.title}</DialogTitle>
      <DialogContent>
        <div className={cx(styles.dialogBody)}>
          <fieldset className={cx(styles.groupFieldset)} aria-describedby={errors.groupIds ? groupsErrorId : undefined}>
            <legend className={cx(styles.groupLegend)}>{COPY.groups}</legend>
            {renderGroups()}
            {errors.groupIds ? <p id={groupsErrorId} className={cx(styles.fieldError)} role="alert">{errors.groupIds}</p> : null}
          </fieldset>
          <div className={cx(styles.dateRow)}>
            <FormField
              type="datetime-local"
              label={COPY.startsAt}
              value={form.startsAt}
              required
              error={errors.startsAt}
              helperText={COPY.timeZoneHint}
              className={cx(styles.dateField)}
              onChange={(event) => setForm({ ...form, startsAt: event.target.value })}
              slotProps={{ inputLabel: { shrink: true } }}
            />
            <FormField
              type="datetime-local"
              label={COPY.endsAt}
              value={form.endsAt}
              required
              error={errors.endsAt}
              helperText={COPY.timeZoneHint}
              className={cx(styles.dateField)}
              onChange={(event) => setForm({ ...form, endsAt: event.target.value })}
              slotProps={{ inputLabel: { shrink: true } }}
            />
          </div>
          {submitError ? <Alert severity="error">{submitError}</Alert> : null}
        </div>
      </DialogContent>
      <DialogActions>
        <Button disabled={pending} onClick={onClose}>{COPY.cancel}</Button>
        <AsyncButton variant="contained" loading={pending} disabled={pending} onClick={submit}>
          {COPY.submit}
        </AsyncButton>
      </DialogActions>
    </Dialog>
  );
}
