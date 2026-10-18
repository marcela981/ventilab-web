/*
* Funcionalidad: ForgotPasswordPage
* Descripción: Informational password recovery page rendered inside the public layout (pages/auth/forgot-password). Password reset by email is not implemented in the backend, so it explains the alternatives (Google sign-in, ask an administrator) and links back to the login and to the registration. Calls no endpoint. Ported from the legacy MUI `sx` page (B3.7) to CSS Modules. Depends on MUI, next/link and @shared/session.
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
import { useId } from "react";
import { cx } from "@shared/lib/class-names";
import { LOGIN_PATH } from "@shared/session";
import styles from "../../UI/auth-info-page.module.css";

const REGISTER_PATH = "/auth/register";

// TODO(i18n): move to an auth namespace in src/i18n.
export const FORGOT_PASSWORD_COPY = {
  documentTitle: "Recuperar contraseña | VentyLab",
  title: "Recuperar contraseña",
  noticeTitle: "Funcionalidad en desarrollo",
  notice: "La recuperación de contraseña estará disponible próximamente. Por ahora, puedes:",
  options: [
    "Iniciar sesión con Google (no requiere contraseña).",
    "Contactar al administrador para restablecer tu contraseña.",
  ],
  backToLogin: "Volver al inicio de sesión",
  noAccount: "¿No tienes cuenta?",
  register: "Regístrate aquí",
} as const;

export function ForgotPasswordPage() {
  const titleId = useId();

  return (
    <section className={cx(styles.card)} aria-labelledby={titleId}>
      <Head>
        <title>{FORGOT_PASSWORD_COPY.documentTitle}</title>
      </Head>
      <header className={cx(styles.header)}>
        <Typography id={titleId} component="h1" variant="h4" className={cx(styles.title)}>
          {FORGOT_PASSWORD_COPY.title}
        </Typography>
      </header>
      <Alert severity="info">
        <strong>{FORGOT_PASSWORD_COPY.noticeTitle}</strong>
        <Typography variant="body2">{FORGOT_PASSWORD_COPY.notice}</Typography>
        <ul className={cx(styles.list)}>
          {FORGOT_PASSWORD_COPY.options.map((item) => <li key={item}>{item}</li>)}
        </ul>
      </Alert>
      <div className={cx(styles.actions)}>
        <Button variant="contained" size="large" component={Link} href={LOGIN_PATH}>
          {FORGOT_PASSWORD_COPY.backToLogin}
        </Button>
      </div>
      <nav aria-label="Ayuda de acceso" className={cx(styles.links)}>
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
