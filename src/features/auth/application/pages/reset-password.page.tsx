/*
* Funcionalidad: Reset password page
* Descripción: /auth/reset-password?token= (Ajustes D3): the auth card with the logo and the h1 "Restablecer contraseña". With the token of the emailed link, the new password form (POST /api/auth/password/reset); when it succeeds a notice and "Iniciar sesión" (every previous session was signed out by the server). Without a token, or with an invalid, expired or used one, a notice and "Pedir un enlace nuevo" (/auth/forgot-password). Messages live in an aria-live region. Depends on MUI, next/head, next/link, next/router, the design-system brand logo, @shared/session, the recovery forms, entities and hooks.
* Versión: 1.0
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
import { useRouter } from "next/router";
import { useId } from "react";
import { BrandLogo } from "@shared/design-system/components/brand-logo";
import { LoadingState } from "@shared/design-system/components/loading-state";
import { cx } from "@shared/lib/class-names";
import { LOGIN_PATH } from "@shared/session";
import { ResetPasswordForm } from "../components/password-recovery-forms";
import { PASSWORD_RESET_MESSAGES, readResetToken } from "../entities/password-reset.entity";
import { useResetPassword } from "../hooks/use-password-reset";
import styles from "../../UI/login-page.module.css";

const FORGOT_PASSWORD_PATH = "/auth/forgot-password";

// TODO(i18n): move to an auth namespace in src/i18n.
export const RESET_PASSWORD_COPY = {
  documentTitle: "Restablecer contraseña | VentyLab",
  title: "Restablecer contraseña",
  subtitle: "Elige una contraseña nueva para tu cuenta.",
  loading: "Cargando…",
  signIn: "Iniciar sesión",
  newLink: "Pedir un enlace nuevo",
  backToLogin: "Volver al inicio de sesión",
} as const;

export function ResetPasswordPage() {
  const router = useRouter();
  const titleId = useId();
  const reset = useResetPassword();
  const token = readResetToken(router.query);

  const body = (() => {
    if (!router.isReady) {
      return <LoadingState label={RESET_PASSWORD_COPY.loading} />;
    }
    if (reset.done) {
      return (
        <Button variant="contained" size="large" component={Link} href={LOGIN_PATH} className={cx(styles.primaryAction)}>
          {RESET_PASSWORD_COPY.signIn}
        </Button>
      );
    }
    if (!token || reset.tokenInvalid) {
      return (
        <Button variant="contained" size="large" component={Link} href={FORGOT_PASSWORD_PATH} className={cx(styles.primaryAction)}>
          {RESET_PASSWORD_COPY.newLink}
        </Button>
      );
    }
    return <ResetPasswordForm pending={reset.pending} onEdit={reset.clearError} onSubmit={(password) => void reset.submit(token, password)} />;
  })();

  return (
    <section className={cx(styles.card)} aria-labelledby={titleId}>
      <Head>
        <title>{RESET_PASSWORD_COPY.documentTitle}</title>
      </Head>
      <header className={cx(styles.header)}>
        <BrandLogo size="auth" priority />
        <Typography id={titleId} component="h1" variant="h4" className={cx(styles.title)}>
          {RESET_PASSWORD_COPY.title}
        </Typography>
        <Typography variant="body1" className={cx(styles.subtitle)}>
          {RESET_PASSWORD_COPY.subtitle}
        </Typography>
      </header>
      <div aria-live="polite" className={cx(styles.alerts)}>
        {reset.done ? <Alert severity="success">{PASSWORD_RESET_MESSAGES.done}</Alert> : null}
        {router.isReady && !token ? <Alert severity="warning">{PASSWORD_RESET_MESSAGES.missingToken}</Alert> : null}
        {reset.error ? <Alert severity="error">{reset.error}</Alert> : null}
      </div>
      {body}
      {reset.done ? null : (
        <nav aria-label="Ayuda de acceso" className={cx(styles.links)}>
          <Link href={LOGIN_PATH} className={cx(styles.link)}>
            {RESET_PASSWORD_COPY.backToLogin}
          </Link>
        </nav>
      )}
    </section>
  );
}
