/*
* Funcionalidad: Password recovery forms
* Descripción: The two forms of the password recovery (Ajustes D3), presentational and validated before submitting with the registration rules: ForgotPasswordForm ("Correo electrónico", "Enviar enlace") and ResetPasswordForm ("Nueva contraseña" with the strength hint and a show/hide toggle, "Confirmar contraseña", "Restablecer contraseña"). Field errors are attached to their inputs (FormField helper text) and editing a field clears its error and the request error. Depends on MUI, the design-system form field and async button and ../entities/register.entity.
* Versión: 1.0
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

import Visibility from "@mui/icons-material/Visibility";
import VisibilityOff from "@mui/icons-material/VisibilityOff";
import IconButton from "@mui/material/IconButton";
import InputAdornment from "@mui/material/InputAdornment";
import { useState } from "react";
import type { FormEvent } from "react";
import { AsyncButton } from "@shared/design-system/components/async-button";
import { FormField } from "@shared/design-system/components/form-field";
import { cx } from "@shared/lib/class-names";
import { emailFieldError, newPasswordErrors, PASSWORD_HINT } from "../entities/register.entity";
import styles from "../../UI/login-form.module.css";

// TODO(i18n): move to an auth namespace in src/i18n.
export const RECOVERY_FORM_COPY = {
  forgotForm: "Recuperar contraseña con el correo",
  email: "Correo electrónico",
  send: "Enviar enlace",
  resetForm: "Elegir una contraseña nueva",
  newPassword: "Nueva contraseña",
  confirmPassword: "Confirmar contraseña",
  reset: "Restablecer contraseña",
  showPasswords: "Mostrar contraseñas",
  hidePasswords: "Ocultar contraseñas",
} as const;

function noop() {}

export type ForgotPasswordFormProps = {
  pending: boolean
  onSubmit: (email: string) => void
  onEdit?: () => void
};

export function ForgotPasswordForm({ pending, onSubmit, onEdit = noop }: ForgotPasswordFormProps) {
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | undefined>(undefined);

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const fieldError = emailFieldError(email);
    setError(fieldError);
    if (!fieldError) onSubmit(email);
  };

  return (
    <form className={cx(styles.form)} noValidate onSubmit={handleSubmit} aria-label={RECOVERY_FORM_COPY.forgotForm}>
      <FormField
        id="forgot-email"
        label={RECOVERY_FORM_COPY.email}
        type="email"
        name="email"
        autoComplete="email"
        required
        fullWidth
        value={email}
        onChange={(event) => {
          setEmail(event.target.value);
          setError(undefined);
          onEdit();
        }}
        error={error}
        helperText=" "
        disabled={pending}
      />
      <AsyncButton type="submit" variant="contained" size="large" fullWidth loading={pending} className={cx(styles.submit)}>
        {RECOVERY_FORM_COPY.send}
      </AsyncButton>
    </form>
  );
}

export type ResetPasswordFormProps = {
  pending: boolean
  onSubmit: (newPassword: string) => void
  onEdit?: () => void
};

export function ResetPasswordForm({ pending, onSubmit, onEdit = noop }: ResetPasswordFormProps) {
  const [values, setValues] = useState({ password: "", confirmPassword: "" });
  const [errors, setErrors] = useState<ReturnType<typeof newPasswordErrors>>({});
  const [showPassword, setShowPassword] = useState(false);
  const type = showPassword ? "text" : "password";

  const change = (field: "password" | "confirmPassword") => (value: string) => {
    setValues((current) => ({ ...current, [field]: value }));
    setErrors((current) => ({ ...current, [field]: undefined }));
    onEdit();
  };

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const nextErrors = newPasswordErrors(values.password, values.confirmPassword);
    setErrors(nextErrors);
    if (!nextErrors.password && !nextErrors.confirmPassword) onSubmit(values.password);
  };

  return (
    <form className={cx(styles.form)} noValidate onSubmit={handleSubmit} aria-label={RECOVERY_FORM_COPY.resetForm}>
      <FormField
        id="reset-password"
        label={RECOVERY_FORM_COPY.newPassword}
        type={type}
        name="password"
        autoComplete="new-password"
        required
        fullWidth
        value={values.password}
        onChange={(event) => change("password")(event.target.value)}
        error={errors.password}
        helperText={PASSWORD_HINT}
        disabled={pending}
        slotProps={{
          input: {
            endAdornment: (
              <InputAdornment position="end">
                <IconButton
                  aria-label={showPassword ? RECOVERY_FORM_COPY.hidePasswords : RECOVERY_FORM_COPY.showPasswords}
                  aria-pressed={showPassword}
                  onClick={() => setShowPassword((visible) => !visible)}
                  edge="end"
                  disabled={pending}
                  className={cx(styles.visibility)}
                >
                  {showPassword ? <VisibilityOff /> : <Visibility />}
                </IconButton>
              </InputAdornment>
            ),
          },
        }}
      />
      <FormField
        id="reset-confirm-password"
        label={RECOVERY_FORM_COPY.confirmPassword}
        type={type}
        name="confirmPassword"
        autoComplete="new-password"
        required
        fullWidth
        value={values.confirmPassword}
        onChange={(event) => change("confirmPassword")(event.target.value)}
        error={errors.confirmPassword}
        helperText=" "
        disabled={pending}
      />
      <AsyncButton type="submit" variant="contained" size="large" fullWidth loading={pending} className={cx(styles.submit)}>
        {RECOVERY_FORM_COPY.reset}
      </AsyncButton>
    </form>
  );
}
