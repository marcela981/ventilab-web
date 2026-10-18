/*
* Funcionalidad: AccessDeniedPage
* Descripción: Page shown when the user opens a resource their role cannot see, rendered inside the public layout (pages/auth/access-denied). Reads the backend session (@shared/session): while it loads it shows LoadingState; an authenticated user sees their name and role and a button to their role home (DEFAULT_ROUTE_BY_ROLE), a visitor a button to the login. The optional `reason` query is shown as a warning. Ported from the legacy MUI `sx` page (B3.7) to CSS Modules; the placeholder "contact support" action is dropped. Depends on MUI, next/router, next/link, the design-system LoadingState and @shared/session.
* Versión: 1.0
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

import BlockIcon from "@mui/icons-material/Block";
import Alert from "@mui/material/Alert";
import Button from "@mui/material/Button";
import Typography from "@mui/material/Typography";
import Head from "next/head";
import Link from "next/link";
import { useRouter } from "next/router";
import { useId } from "react";
import { LoadingState } from "@shared/design-system/components/loading-state";
import { cx } from "@shared/lib/class-names";
import { DEFAULT_ROUTE_BY_ROLE, LOGIN_PATH, useSession } from "@shared/session";
import type { Role } from "@shared/session";
import styles from "../../UI/auth-info-page.module.css";

// TODO(i18n): move to an auth namespace in src/i18n.
export const ACCESS_DENIED_COPY = {
  documentTitle: "Acceso denegado | VentyLab",
  title: "Acceso denegado",
  subtitle: "No tienes permisos suficientes para acceder a este recurso.",
  loading: "Cargando sesión…",
  signedInAs: "Has iniciado sesión como:",
  role: "Rol actual:",
  reason: "Motivo:",
  helpTitle: "¿Qué puedes hacer?",
  help: [
    "Verifica que estás usando la cuenta correcta.",
    "Regresa a la página anterior.",
    "Contacta al administrador si crees que esto es un error.",
  ],
  back: "Volver atrás",
  home: "Ir a mi inicio",
  login: "Iniciar sesión",
} as const;

export const ROLE_NAMES: Readonly<Record<Role, string>> = {
  STUDENT: "Estudiante",
  TEACHER: "Docente",
  ADMIN: "Administrador",
};

function readReason(value: string | string[] | undefined): string | null {
  const reason = Array.isArray(value) ? value[0] : value;

  return reason && reason.trim() !== "" ? reason : null;
}

export function AccessDeniedPage() {
  const router = useRouter();
  const titleId = useId();
  const { status, user, role } = useSession();
  const reason = readReason(router.query.reason);

  if (status === "loading") {
    return (
      <section className={cx(styles.card)} aria-label={ACCESS_DENIED_COPY.title}>
        <Head>
          <title>{ACCESS_DENIED_COPY.documentTitle}</title>
        </Head>
        <LoadingState label={ACCESS_DENIED_COPY.loading} />
      </section>
    );
  }

  const authenticated = status === "authenticated" && role !== null;

  return (
    <section className={cx(styles.card)} aria-labelledby={titleId}>
      <Head>
        <title>{ACCESS_DENIED_COPY.documentTitle}</title>
      </Head>
      <header className={cx(styles.header)}>
        <span className={cx(styles.icon, styles.iconDanger)} aria-hidden="true">
          <BlockIcon fontSize="large" />
        </span>
        <Typography id={titleId} component="h1" variant="h4" className={cx(styles.title)}>
          {ACCESS_DENIED_COPY.title}
        </Typography>
        <Typography variant="body1" className={cx(styles.subtitle)}>
          {ACCESS_DENIED_COPY.subtitle}
        </Typography>
      </header>
      {authenticated ? (
        <div className={cx(styles.summary)}>
          <Typography variant="body2">{ACCESS_DENIED_COPY.signedInAs}</Typography>
          <Typography variant="body1" className={cx(styles.summaryName)}>
            {user?.name ?? user?.email}
          </Typography>
          <Typography variant="caption">
            {ACCESS_DENIED_COPY.role} <strong>{ROLE_NAMES[role]}</strong>
          </Typography>
        </div>
      ) : null}
      {reason ? (
        <Alert severity="warning">
          <strong>{ACCESS_DENIED_COPY.reason}</strong> {reason}
        </Alert>
      ) : null}
      <Alert severity="info">
        <strong>{ACCESS_DENIED_COPY.helpTitle}</strong>
        <ul className={cx(styles.list)}>
          {ACCESS_DENIED_COPY.help.map((item) => <li key={item}>{item}</li>)}
        </ul>
      </Alert>
      <div className={cx(styles.actions)}>
        <Button variant="contained" size="large" onClick={() => router.back()}>
          {ACCESS_DENIED_COPY.back}
        </Button>
        {authenticated ? (
          <Button variant="outlined" size="large" component={Link} href={DEFAULT_ROUTE_BY_ROLE[role]}>
            {ACCESS_DENIED_COPY.home}
          </Button>
        ) : (
          <Button variant="outlined" size="large" component={Link} href={LOGIN_PATH}>
            {ACCESS_DENIED_COPY.login}
          </Button>
        )}
      </div>
    </section>
  );
}
