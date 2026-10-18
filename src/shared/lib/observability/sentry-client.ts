/*
* Funcionalidad: Sentry browser client
* Descripción: Initializes @sentry/browser for the browser error capture (global errors and unhandled rejections, through the default integrations). Only loaded with a dynamic import by startErrorReporting when NEXT_PUBLIC_SENTRY_DSN is set, so the SDK never reaches the first load JS otherwise. No personal data: sendDefaultPii off, no tracing, no session replay, and every event and breadcrumb goes through scrubEvent/scrubValue (e-mails, tokens and credentials removed). @sentry/browser instead of @sentry/nextjs: the Next SDK wraps next.config and adds build plugins and server/edge instrumentation this Pages Router client does not need; same major (10) as the backend @sentry/nestjs. Depends on @sentry/browser and ./scrub-event.
* Versión: 1.0
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

import { init } from "@sentry/browser";
import { scrubEvent, scrubValue } from "./scrub-event";

export type SentryClientConfig = {
  dsn: string
  environment: string
};

export function initSentryClient({ dsn, environment }: SentryClientConfig): void {
  init({
    dsn,
    environment,
    sendDefaultPii: false,
    tracesSampleRate: 0,
    beforeSend: (event) => scrubEvent(event),
    beforeBreadcrumb: (breadcrumb) => scrubValue(breadcrumb),
  });
}
