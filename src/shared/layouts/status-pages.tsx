/*
* Funcionalidad: Status pages (404 and 500)
* Descripción: NotFoundPage and ServerErrorPage, the content of pages/404.tsx and pages/500.tsx rendered inside the public layout: status code, Spanish title and message, document title and a link back to the home of the signed-in role (DEFAULT_ROUTE_BY_ROLE) or to the login page when there is no session. The server error page also offers "Reintentar" (reloads the page). Depends on MUI, next/head, next/link, @shared/session and UI/status-page.module.css. v1.1 (B5): document titles through formatPageTitle of @shared/lib/page-title.
* Versión: 1.1
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

import Button from "@mui/material/Button";
import Typography from "@mui/material/Typography";
import Head from "next/head";
import Link from "next/link";
import { useId } from "react";
import { cx } from "@shared/lib/class-names";
import { formatPageTitle } from "@shared/lib/page-title";
import { DEFAULT_ROUTE_BY_ROLE, LOGIN_PATH } from "@shared/session/routes.config";
import { useSession } from "@shared/session/use-session";
import styles from "./UI/status-page.module.css";

export const STATUS_PAGES_COPY = {
  home: "Ir a mi inicio",
  login: "Iniciar sesión",
  retry: "Reintentar",
  notFound: {
    code: "404",
    documentTitle: formatPageTitle("Página no encontrada"),
    title: "Página no encontrada",
    message: "La dirección que buscas no existe o fue movida. Revisa el enlace o vuelve a tu inicio.",
  },
  serverError: {
    code: "500",
    documentTitle: formatPageTitle("Error del servidor"),
    title: "Algo salió mal",
    message: "Ocurrió un error inesperado al cargar la página. Intenta de nuevo en unos minutos.",
  },
} as const;

type StatusPageContent = {
  code: string
  documentTitle: string
  title: string
  message: string
};

type StatusPageProps = {
  content: StatusPageContent
  onRetry?: () => void
};

function HomeLink() {
  const { status, role } = useSession();
  const authenticated = status === "authenticated" && role !== null;
  const href = authenticated ? DEFAULT_ROUTE_BY_ROLE[role] : LOGIN_PATH;

  return (
    <Button variant="contained" size="large" component={Link} href={href}>
      {authenticated ? STATUS_PAGES_COPY.home : STATUS_PAGES_COPY.login}
    </Button>
  );
}

function StatusPage({ content, onRetry }: StatusPageProps) {
  const titleId = useId();

  return (
    <section className={cx(styles.card)} aria-labelledby={titleId}>
      <Head>
        <title>{content.documentTitle}</title>
      </Head>
      <Typography variant="h2" component="p" className={cx(styles.code)} aria-hidden="true">
        {content.code}
      </Typography>
      <Typography id={titleId} variant="h4" component="h1" className={cx(styles.title)}>
        {content.title}
      </Typography>
      <Typography variant="body1" className={cx(styles.message)}>
        {content.message}
      </Typography>
      <div className={cx(styles.actions)}>
        <HomeLink />
        {onRetry ? (
          <Button variant="outlined" size="large" onClick={onRetry}>
            {STATUS_PAGES_COPY.retry}
          </Button>
        ) : null}
      </div>
    </section>
  );
}

export function NotFoundPage() {
  return <StatusPage content={STATUS_PAGES_COPY.notFound} />;
}

function reloadPage() {
  window.location.reload();
}

export function ServerErrorPage() {
  return <StatusPage content={STATUS_PAGES_COPY.serverError} onRetry={reloadPage} />;
}
