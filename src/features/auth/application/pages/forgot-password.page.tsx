/*
* Funcionalidad: Forgot password page
* Descripción: /auth/forgot-password (Ajustes D3, real password recovery): the auth card with the logo, the h1 "Recuperar contraseña", a short explanation and the email form; sending answers with the same notice whatever the email (POST /api/auth/password/forgot never reveals whether an account exists) and then offers to send again; rate limit, network and server errors are shown in an aria-live region. Links back to the login and to the registration. v1.0 was an informational placeholder ("Funcionalidad en desarrollo"). Depends on MUI, next/head, next/link, the design-system brand logo, @shared/session, the recovery forms and hooks.
* Versión: 2.0
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

import Alert from "@mui/material/Alert";
import Button from "@mui/material/Button";
import Typography from "@mui/material/Typography";
import Head from "next/head";
import Link from "next/link";
import { useId, useState } from "react";
import { BrandLogo } from "@shared/design-system/components/brand-logo";
import { cx } from "@shared/lib/class-names";
import { LOGIN_PATH } from "@shared/session";
import { ForgotPasswordForm } from "../components/password-recovery-forms";
import { PASSWORD_RESET_MESSAGES } from "../entities/password-reset.entity";
import { useForgotPassword } from "../hooks/use-password-reset";
import styles from "../../UI/login-page.module.css";

const REGISTER_PATH = "/auth/register";

// TODO(i18n): move to an auth namespace in src/i18n.
export const FORGOT_PASSWORD_COPY = {
  documentTitle: "Recuperar contraseña | VentyLab",
  title: "Recuperar contraseña",
  subtitle: "Escribe el correo de tu cuenta y te enviaremos un enlace para elegir una contraseña nueva.",
  sendAgain: "Enviar otro enlace",
  backToLogin: "Volver al inicio de sesión",
  noAccount: "¿No tienes cuenta?",
  register: "Regístrate aquí",
} as const;

export function ForgotPasswordPage() {
  const titleId = useId();
  const request = useForgotPassword();
  // Key of the form: a new one after "Enviar otro enlace" (empty field).
  const [attempt, setAttempt] = useState(0);
  const sent = request.done;

  return (
    <section className={cx(styles.card)} aria-labelledby={titleId}>
      <Head>
        <title>{FORGOT_PASSWORD_COPY.documentTitle}</title>
      </Head>
      <header className={cx(styles.header)}>
        <BrandLogo size="auth" priority />
        <Typography id={titleId} component="h1" variant="h4" className={cx(styles.title)}>
          {FORGOT_PASSWORD_COPY.title}
        </Typography>
        <Typography variant="body1" className={cx(styles.subtitle)}>
          {FORGOT_PASSWORD_COPY.subtitle}
        </Typography>
      </header>
      <div aria-live="polite" className={cx(styles.alerts)}>
        {sent ? <Alert severity="success">{PASSWORD_RESET_MESSAGES.sent}</Alert> : null}
        {request.error ? <Alert severity="error">{request.error}</Alert> : null}
      </div>
      {sent ? (
        <Button variant="outlined" size="large" onClick={() => {
            setAttempt((count) => count + 1);
            request.reset();
          }}>
          {FORGOT_PASSWORD_COPY.sendAgain}
        </Button>
      ) : (
        <ForgotPasswordForm
          key={attempt}
          pending={request.pending}
          onEdit={request.clearError}
          onSubmit={(email) => void request.submit(email)}
        />
      )}
      <nav aria-label="Ayuda de acceso" className={cx(styles.links)}>
        <Link href={LOGIN_PATH} className={cx(styles.link)}>
          {FORGOT_PASSWORD_COPY.backToLogin}
        </Link>
        <span>
          {FORGOT_PASSWORD_COPY.noAccount}{" "}
          <Link href={REGISTER_PATH} className={cx(styles.link)}>
            {FORGOT_PASSWORD_COPY.register}
          </Link>
        </span>
      </nav>
    </section>
  );
}
