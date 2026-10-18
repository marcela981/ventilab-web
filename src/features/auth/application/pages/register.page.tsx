/*
* Funcionalidad: RegisterPage
* Descripción: Student self-registration page of the backend session (rendered inside PublicLayout by the thin route pages/auth/register), built like the LoginPage: heading, the server error alert (role=alert), the local RegisterForm and a link back to the login. After a successful registration useRegister logs in and establishes the session; while the session loads, or once it is authenticated, the page shows a loading state and usePostLoginRedirect navigates to the safe returnTo or the role home (an already signed-in visitor is redirected the same way). When the redirect loop guard stops the redirects ("blocked") it shows an error with a "Cerrar sesión" button. Spanish copy, TODO(i18n). Depends on MUI, next/head, next/link, next/router, @shared/session, @shared/design-system and the auth hooks/components.
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
import { LoadingState } from "@shared/design-system/components/loading-state";
import { cx } from "@shared/lib/class-names";
import { LOGIN_PATH, useSession } from "@shared/session";
import { RegisterForm } from "../components/register-form";
import { REDIRECT_LOOP_MESSAGE } from "../entities/auth-error-messages";
import { resolveReturnTo } from "../entities/return-to";
import { usePostLoginRedirect } from "../hooks/use-post-login-redirect";
import { useRegister } from "../hooks/use-register";
import styles from "../../UI/login-page.module.css";

// TODO(i18n): move to an auth namespace in src/i18n.
const REGISTER_COPY = {
  documentTitle: "Crear cuenta | VentyLab",
  title: "Crear cuenta",
  subtitle: "Regístrate como estudiante para acceder a VentyLab.",
  loading: "Cargando sesión…",
  redirecting: "Redirigiendo…",
  hasAccount: "¿Ya tienes cuenta?",
  login: "Inicia sesión",
  signOut: "Cerrar sesión",
} as const;

export function RegisterPage() {
  const router = useRouter();
  const titleId = useId();
  const { status, signOut } = useSession();
  const returnTo = resolveReturnTo(router.query);
  const register = useRegister();
  const redirect = usePostLoginRedirect(returnTo, router.isReady && !register.pending);
  const redirecting = redirect === "redirecting";

  if (redirect === "blocked") {
    return (
      <section className={cx(styles.card)} aria-labelledby={titleId}>
        <Head>
          <title>{REGISTER_COPY.documentTitle}</title>
        </Head>
        <Typography id={titleId} component="h1" variant="h4" className={cx(styles.title)}>
          {REGISTER_COPY.title}
        </Typography>
        <Alert severity="error">{REDIRECT_LOOP_MESSAGE}</Alert>
        <Button variant="contained" onClick={() => void signOut()}>
          {REGISTER_COPY.signOut}
        </Button>
      </section>
    );
  }

  if (status === "loading" || redirecting) {
    return (
      <section className={cx(styles.card)} aria-label={REGISTER_COPY.title}>
        <Head>
          <title>{REGISTER_COPY.documentTitle}</title>
        </Head>
        <LoadingState label={redirecting ? REGISTER_COPY.redirecting : REGISTER_COPY.loading} />
      </section>
    );
  }

  return (
    <section className={cx(styles.card)} aria-labelledby={titleId}>
      <Head>
        <title>{REGISTER_COPY.documentTitle}</title>
      </Head>
      <header className={cx(styles.header)}>
        <Typography id={titleId} component="h1" variant="h4" className={cx(styles.title)}>
          {REGISTER_COPY.title}
        </Typography>
        <Typography variant="body1" className={cx(styles.subtitle)}>
          {REGISTER_COPY.subtitle}
        </Typography>
      </header>
      {register.error ? <Alert severity="error">{register.error}</Alert> : null}
      <RegisterForm
        pending={register.pending}
        onSubmit={(registration) => void register.submitRegistration(registration)}
        onEdit={register.clearError}
      />
      <nav aria-label="Ayuda de acceso" className={cx(styles.links)}>
        <span>
          {REGISTER_COPY.hasAccount}{" "}
          <Link href={LOGIN_PATH} className={cx(styles.link)}>
            {REGISTER_COPY.login}
          </Link>
        </span>
      </nav>
    </section>
  );
}
