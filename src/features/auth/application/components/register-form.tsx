/*
* Funcionalidad: RegisterForm
* Descripción: Local registration form: labelled name, email, password and password confirmation fields (autocomplete hints, one password visibility toggle with an accessible label for both password fields, the password rule as helper text), client-side validation with per-field Spanish messages (validateRegistration) before submitting, and a submit AsyncButton disabled and busy while the registration is pending. Server errors are shown by the page. Spanish copy, TODO(i18n). Depends on MUI, @shared/design-system, the register entities and UI/login-form.module.css (same form layout as the login).
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
import type { ChangeEvent, FormEvent } from "react";
import { AsyncButton } from "@shared/design-system/components/async-button";
import { FormField } from "@shared/design-system/components/form-field";
import { cx } from "@shared/lib/class-names";
import { PASSWORD_HINT, validateRegistration } from "../entities/register.entity";
import type { RegisterFieldErrors, RegistrationData } from "../entities/register.entity";
import styles from "../../UI/login-form.module.css";

export type RegisterFormProps = {
  pending: boolean
  onSubmit: (registration: RegistrationData) => void
  onEdit?: () => void
};

const EMPTY_REGISTRATION: RegistrationData = { name: "", email: "", password: "", confirmPassword: "" };

function noop() {}

export function RegisterForm({ pending, onSubmit, onEdit = noop }: RegisterFormProps) {
  const [registration, setRegistration] = useState<RegistrationData>(EMPTY_REGISTRATION);
  const [fieldErrors, setFieldErrors] = useState<RegisterFieldErrors>({});
  const [showPassword, setShowPassword] = useState(false);

  const handleChange = (field: keyof RegistrationData) => (event: ChangeEvent<HTMLInputElement>) => {
    const { value } = event.target;

    setRegistration((current) => ({ ...current, [field]: value }));
    setFieldErrors((current) => {
      const next = { ...current };

      delete next[field];

      return next;
    });
    onEdit();
  };

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const errors = validateRegistration(registration);

    setFieldErrors(errors);

    if (Object.keys(errors).length === 0) {
      onSubmit(registration);
    }
  };

  const passwordType = showPassword ? "text" : "password";

  return (
    <form className={cx(styles.form)} noValidate onSubmit={handleSubmit} aria-label="Crear cuenta con correo">
      <FormField
        id="register-name"
        label="Nombre completo"
        name="name"
        autoComplete="name"
        required
        fullWidth
        value={registration.name}
        onChange={handleChange("name")}
        error={fieldErrors.name}
        helperText=" "
        disabled={pending}
      />
      <FormField
        id="register-email"
        label="Correo electrónico"
        type="email"
        name="email"
        autoComplete="email"
        required
        fullWidth
        value={registration.email}
        onChange={handleChange("email")}
        error={fieldErrors.email}
        helperText=" "
        disabled={pending}
      />
      <FormField
        id="register-password"
        label="Contraseña"
        type={passwordType}
        name="password"
        autoComplete="new-password"
        required
        fullWidth
        value={registration.password}
        onChange={handleChange("password")}
        error={fieldErrors.password}
        helperText={PASSWORD_HINT}
        disabled={pending}
        slotProps={{
          input: {
            endAdornment: (
              <InputAdornment position="end">
                <IconButton
                  aria-label={showPassword ? "Ocultar contraseñas" : "Mostrar contraseñas"}
                  aria-pressed={showPassword}
                  onClick={() => setShowPassword((visible) => !visible)}
                  edge="end"
                  disabled={pending}
                >
                  {showPassword ? <VisibilityOff /> : <Visibility />}
                </IconButton>
              </InputAdornment>
            ),
          },
        }}
      />
      <FormField
        id="register-confirm-password"
        label="Confirmar contraseña"
        type={passwordType}
        name="confirmPassword"
        autoComplete="new-password"
        required
        fullWidth
        value={registration.confirmPassword}
        onChange={handleChange("confirmPassword")}
        error={fieldErrors.confirmPassword}
        helperText=" "
        disabled={pending}
      />
      <AsyncButton type="submit" variant="contained" size="large" fullWidth loading={pending} className={cx(styles.submit)}>
        Crear cuenta
      </AsyncButton>
    </form>
  );
}
