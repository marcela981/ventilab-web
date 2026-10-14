/*
* Funcionalidad: LoginForm
* Descripción: Local login form: labelled email and password fields (autocomplete hints, password visibility toggle with an accessible label), client-side validation with per-field messages (validateCredentials) before submitting, and a submit button disabled while a login is pending. Server errors are shown by the page. Spanish copy, TODO(i18n). Depends on MUI, the auth entities and UI/login-form.module.css.
* Versión: 1.0
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

import Visibility from "@mui/icons-material/Visibility";
import VisibilityOff from "@mui/icons-material/VisibilityOff";
import Button from "@mui/material/Button";
import IconButton from "@mui/material/IconButton";
import InputAdornment from "@mui/material/InputAdornment";
import TextField from "@mui/material/TextField";
import { useState } from "react";
import type { ChangeEvent, FormEvent } from "react";
import { cx } from "@shared/lib/class-names";
import { validateCredentials } from "../entities/auth.entity";
import type { LoginCredentials, LoginFieldErrors } from "../entities/auth.entity";
import styles from "../../UI/login-form.module.css";

export type LoginFormProps = {
  pending: boolean
  onSubmit: (credentials: LoginCredentials) => void
  onEdit?: () => void
};

function noop() {}

export function LoginForm({ pending, onSubmit, onEdit = noop }: LoginFormProps) {
  const [credentials, setCredentials] = useState<LoginCredentials>({ email: "", password: "" });
  const [fieldErrors, setFieldErrors] = useState<LoginFieldErrors>({});
  const [showPassword, setShowPassword] = useState(false);

  const handleChange = (field: keyof LoginCredentials) => (event: ChangeEvent<HTMLInputElement>) => {
    const { value } = event.target;

    setCredentials((current) => ({ ...current, [field]: value }));
    setFieldErrors((current) => {
      const next = { ...current };

      delete next[field];

      return next;
    });
    onEdit();
  };

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const errors = validateCredentials(credentials);

    setFieldErrors(errors);

    if (Object.keys(errors).length === 0) {
      onSubmit(credentials);
    }
  };

  return (
    <form className={cx(styles.form)} noValidate onSubmit={handleSubmit} aria-label="Iniciar sesión con correo">
      <TextField
        id="login-email"
        label="Correo electrónico"
        type="email"
        name="email"
        autoComplete="email"
        required
        fullWidth
        value={credentials.email}
        onChange={handleChange("email")}
        error={Boolean(fieldErrors.email)}
        helperText={fieldErrors.email ?? " "}
        disabled={pending}
      />
      <TextField
        id="login-password"
        label="Contraseña"
        type={showPassword ? "text" : "password"}
        name="password"
        autoComplete="current-password"
        required
        fullWidth
        value={credentials.password}
        onChange={handleChange("password")}
        error={Boolean(fieldErrors.password)}
        helperText={fieldErrors.password ?? " "}
        disabled={pending}
        slotProps={{
          input: {
            endAdornment: (
              <InputAdornment position="end">
                <IconButton
                  aria-label={showPassword ? "Ocultar contraseña" : "Mostrar contraseña"}
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
      <Button type="submit" variant="contained" size="large" fullWidth disabled={pending} className={cx(styles.submit)}>
        {pending ? "Iniciando sesión…" : "Iniciar sesión"}
      </Button>
    </form>
  );
}
