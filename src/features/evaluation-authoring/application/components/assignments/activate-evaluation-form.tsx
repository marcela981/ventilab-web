/*
* Funcionalidad: ActivateEvaluationForm
* Descripción: Inline form "Nueva asignación" of the "Asignación a grupos" section of the builder (extracted from the former "Activar evaluación" dialog; Bloque 3, W6): a checklist of the active student groups the caller manages (admins: every group; `GET /api/groups`), and the start and end date-time of the window as native datetime-local fields read in America/Bogota (UTC-5). Defaults to the next full hour for one week. On submit it validates (at least one group, valid dates, end after start, end in the future) and sends the body with the window converted to UTC ISO; a failure from the backend (403, 409, 422) is shown inside the form. The parent remounts it (key) after a successful assignment to start a clean form. Depends on React, MUI, the design-system form field and async button, @shared/lib, the assignment entities, the staff groups hook and the assignments CSS Module.
* Versión: 2.0
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

import Alert from "@mui/material/Alert";
import Button from "@mui/material/Button";
import Checkbox from "@mui/material/Checkbox";
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

const COPY = ASSIGNMENTS_COPY.form;

export type ActivateEvaluationFormProps = {
  pending: boolean
  // Resolves to an error message, or null once the evaluation was assigned.
  onSubmit: (body: ActivationBody) => Promise<string | null>
  now?: Date | undefined
};

export function ActivateEvaluationForm({ pending, onSubmit, now }: ActivateEvaluationFormProps) {
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
    const submittedAt = now ?? new Date();
    const nextErrors = validateActivation(form, submittedAt);
    const body = toActivationBody(form, submittedAt);

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
    <div className={cx(styles.inlineForm)} role="group" aria-labelledby={titleId}>
      <h3 id={titleId} className={cx(styles.inlineFormTitle)}>{COPY.title}</h3>
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
      <div className={cx(styles.inlineFormActions)}>
        <AsyncButton variant="contained" loading={pending} disabled={pending} onClick={submit}>
          {COPY.submit}
        </AsyncButton>
      </div>
    </div>
  );
}
