/*
* Funcionalidad: LoginPage
* Descripción: Login page of the backend session (rendered inside PublicLayout by the thin route pages/auth/login): heading, an expired-session notice (`?expired=1`, sent by the legacy session expiry), the server error alert (role=alert), the local LoginForm, the Google sign-in block and links to password recovery and registration. While the session loads, or once it is authenticated, it shows a loading state and usePostLoginRedirect navigates to the safe returnTo (returnTo/returnUrl/callbackUrl) or the role home; during a login it waits until useLogin finished the NextAuth coexistence bridge (v1.1). v1.2 (T9 follow-up): when the redirect loop guard stops the redirects ("blocked") it shows an error with a "Cerrar sesión" button instead of looping. Spanish copy, TODO(i18n). Depends on MUI, next/head, next/link, next/router, @shared/session, @shared/design-system and the auth hooks/components.
* Versión: 1.2
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

import Alert from "@mui/material/Alert";
import Button from "@mui/material/Button";
import Divider from "@mui/material/Divider";
import Typography from "@mui/material/Typography";
import Head from "next/head";
import Link from "next/link";
import { useRouter } from "next/router";
import { useId } from "react";
import { LoadingState } from "@shared/design-system/components/loading-state";
import { cx } from "@shared/lib/class-names";
import { useSession } from "@shared/session";
import { GoogleSignInButton } from "../components/google-sign-in-button";
import { LoginForm } from "../components/login-form";
import { REDIRECT_LOOP_MESSAGE } from "../entities/auth-error-messages";
import { readGoogleClientId } from "../entities/google-config";
import { resolveReturnTo } from "../entities/return-to";
import { useLogin } from "../hooks/use-login";
import { usePostLoginRedirect } from "../hooks/use-post-login-redirect";
import styles from "../../UI/login-page.module.css";

// TODO(i18n): move to an auth namespace in src/i18n.
const LOGIN_COPY = {
  documentTitle: "Iniciar sesión | VentyLab",
  title: "Iniciar sesión",
  subtitle: "Accede a VentyLab con tu cuenta.",
  expired: "Tu sesión expiró. Inicia sesión de nuevo para continuar.",
  divider: "o",
  loading: "Cargando sesión…",
  redirecting: "Redirigiendo…",
  forgotPassword: "¿Olvidaste tu contraseña?",
  noAccount: "¿No tienes cuenta?",
  register: "Regístrate",
  signOut: "Cerrar sesión",
} as const;

export function LoginPage() {
  const router = useRouter();
  const titleId = useId();
  const { status, signOut } = useSession();
  const returnTo = resolveReturnTo(router.query);
  const login = useLogin();
  const redirect = usePostLoginRedirect(returnTo, router.isReady && !login.pending);
  const redirecting = redirect === "redirecting";
  const expired = router.query.expired === "1";

  if (redirect === "blocked") {
    return (
      <section className={cx(styles.card)} aria-labelledby={titleId}>
        <Head>
          <title>{LOGIN_COPY.documentTitle}</title>
        </Head>
        <Typography id={titleId} component="h1" variant="h4" className={cx(styles.title)}>
          {LOGIN_COPY.title}
        </Typography>
        <Alert severity="error">{REDIRECT_LOOP_MESSAGE}</Alert>
        <Button variant="contained" onClick={() => void signOut()}>
          {LOGIN_COPY.signOut}
        </Button>
      </section>
    );
  }

  if (status === "loading" || redirecting) {
    return (
      <section className={cx(styles.card)} aria-label={LOGIN_COPY.title}>
        <Head>
          <title>{LOGIN_COPY.documentTitle}</title>
        </Head>
        <LoadingState label={redirecting ? LOGIN_COPY.redirecting : LOGIN_COPY.loading} />
      </section>
    );
  }

  return (
    <section className={cx(styles.card)} aria-labelledby={titleId}>
      <Head>
        <title>{LOGIN_COPY.documentTitle}</title>
      </Head>
      <header className={cx(styles.header)}>
        <Typography id={titleId} component="h1" variant="h4" className={cx(styles.title)}>
          {LOGIN_COPY.title}
        </Typography>
        <Typography variant="body1" className={cx(styles.subtitle)}>
          {LOGIN_COPY.subtitle}
        </Typography>
      </header>
      {expired && !login.error ? <Alert severity="info">{LOGIN_COPY.expired}</Alert> : null}
      {login.error ? <Alert severity="error">{login.error}</Alert> : null}
      <LoginForm pending={login.pending} onSubmit={(credentials) => void login.submitCredentials(credentials)} onEdit={login.clearError} />
      <Divider className={cx(styles.divider)}>{LOGIN_COPY.divider}</Divider>
      <GoogleSignInButton
        clientId={readGoogleClientId()}
        pending={login.pending}
        onCredential={(idToken) => void login.submitGoogleCredential(idToken)}
      />
      <nav aria-label="Ayuda de acceso" className={cx(styles.links)}>
        <Link href="/auth/forgot-password" className={cx(styles.link)}>
          {LOGIN_COPY.forgotPassword}
        </Link>
        <span>
          {LOGIN_COPY.noAccount}{" "}
          <Link href="/auth/register" className={cx(styles.link)}>
            {LOGIN_COPY.register}
          </Link>
        </span>
      </nav>
    </section>
  );
}
