/*
* Funcionalidad: ChangePasswordForm
* Descripción: "Cambiar contraseña" card of the profile page (julio ChangePasswordForm.jsx structure and texts): current password, new password with the live requirement checklist of the backend policy (8 to 128 characters, lowercase, uppercase, number; each item announces whether it is met) and confirmation; per-field errors, one error alert and a success notice. Google sign-in accounts (`hasPassword === false`) get the notice "Tu cuenta usa Google; la contraseña se gestiona en Google." instead of the form. Spanish copy, TODO(i18n). Depends on MUI, MUI icons, @shared/design-system, useChangePassword, the password entity and UI/change-password-form.module.css.
* Versión: 1.0
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

import CheckIcon from "@mui/icons-material/Check";
import CloseIcon from "@mui/icons-material/Close";
import Alert from "@mui/material/Alert";
import Typography from "@mui/material/Typography";
import { useId } from "react";
import type { ChangeEvent, FormEvent } from "react";
import { AsyncButton } from "@shared/design-system/components/async-button";
import { FormField } from "@shared/design-system/components/form-field";
import { cx } from "@shared/lib/class-names";
import { getPasswordRequirements, PASSWORD_MESSAGES } from "../entities/password.entity";
import type { PasswordField } from "../entities/password.entity";
import { useChangePassword } from "../hooks/use-change-password";
import styles from "../../UI/change-password-form.module.css";

// TODO(i18n): move to a profile namespace in src/i18n. Texts from julio (ChangePasswordForm.jsx).
const PASSWORD_COPY = {
  title: "Cambiar contraseña",
  subtitle: "Actualiza tu contraseña periódicamente para mantener tu cuenta segura",
  current: "Contraseña actual",
  next: "Nueva contraseña",
  confirm: "Confirmar nueva contraseña",
  requirements: "Requisitos de contraseña:",
  met: "cumplido",
  unmet: "pendiente",
  submit: "Cambiar contraseña",
} as const;

export type ChangePasswordFormProps = {
  hasPassword: boolean
};

export function ChangePasswordForm({ hasPassword }: ChangePasswordFormProps) {
  const titleId = useId();
  const { draft, fieldErrors, message, changed, submitting, setField, submit } = useChangePassword();

  const handleChange = (field: PasswordField) => (event: ChangeEvent<HTMLInputElement>) => {
    setField(field, event.target.value);
  };

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    void submit();
  };

  return (
    <section className={cx(styles.card)} aria-labelledby={titleId}>
      <Typography id={titleId} component="h2" variant="h6">
        {PASSWORD_COPY.title}
      </Typography>
      {hasPassword ? (
        <>
          <Typography variant="body2" className={cx(styles.subtitle)}>
            {PASSWORD_COPY.subtitle}
          </Typography>
          <form className={cx(styles.form)} noValidate onSubmit={handleSubmit} aria-labelledby={titleId}>
            <FormField
              id="profile-current-password"
              label={PASSWORD_COPY.current}
              name="currentPassword"
              type="password"
              autoComplete="current-password"
              required
              fullWidth
              value={draft.currentPassword}
              onChange={handleChange("currentPassword")}
              error={fieldErrors.currentPassword}
              helperText=" "
              disabled={submitting}
            />
            <FormField
              id="profile-new-password"
              label={PASSWORD_COPY.next}
              name="newPassword"
              type="password"
              autoComplete="new-password"
              required
              fullWidth
              value={draft.newPassword}
              onChange={handleChange("newPassword")}
              error={fieldErrors.newPassword}
              helperText=" "
              disabled={submitting}
            />
            <div className={cx(styles.requirements)}>
              <Typography variant="caption" component="p" className={cx(styles.requirementsTitle)}>
                {PASSWORD_COPY.requirements}
              </Typography>
              <ul className={cx(styles.requirementList)}>
                {getPasswordRequirements(draft.newPassword).map((requirement) => (
                  <li
                    key={requirement.key}
                    className={cx(styles.requirement, requirement.met && styles.requirementMet)}
                    data-met={requirement.met}
                  >
                    {requirement.met
                      ? <CheckIcon fontSize="small" aria-hidden="true" />
                      : <CloseIcon fontSize="small" aria-hidden="true" />}
                    <span>{requirement.label}</span>
                    <span className={cx(styles.srOnly)}>{` (${requirement.met ? PASSWORD_COPY.met : PASSWORD_COPY.unmet})`}</span>
                  </li>
                ))}
              </ul>
            </div>
            <FormField
              id="profile-confirm-password"
              label={PASSWORD_COPY.confirm}
              name="confirmPassword"
              type="password"
              autoComplete="new-password"
              required
              fullWidth
              value={draft.confirmPassword}
              onChange={handleChange("confirmPassword")}
              error={fieldErrors.confirmPassword}
              helperText=" "
              disabled={submitting}
            />
            {message ? <Alert severity="error">{message}</Alert> : null}
            {changed ? <Alert severity="success" role="status">{PASSWORD_MESSAGES.success}</Alert> : null}
            <div className={cx(styles.actions)}>
              <AsyncButton type="submit" variant="contained" loading={submitting}>
                {PASSWORD_COPY.submit}
              </AsyncButton>
            </div>
          </form>
        </>
      ) : (
        <Alert severity="info">{PASSWORD_MESSAGES.googleAccount}</Alert>
      )}
    </section>
  );
}
