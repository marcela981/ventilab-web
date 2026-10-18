/*
* Funcionalidad: Browser error reporting entry
* Descripción: startErrorReporting, called once by pages/_app.js after mount: without a DSN (NEXT_PUBLIC_SENTRY_DSN unset or empty, read through @shared/lib/env) it resolves false and loads nothing; with a DSN it imports the Sentry client chunk on demand and initializes it once (later calls reuse the first attempt). A failed chunk load or init is swallowed (reporting must never break the app) and resolves false. The loader is injectable for tests. Depends on @shared/lib/env and, lazily, ./sentry-client.
* Versión: 1.0
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

import { readPublicEnv } from "../env";
import type { PublicEnv } from "../env";
import type { SentryClientConfig } from "./sentry-client";

type SentryClientModule = {
  initSentryClient: (config: SentryClientConfig) => void
};

export type StartErrorReportingOptions = {
  env?: PublicEnv
  load?: () => Promise<SentryClientModule>
};

let started: Promise<boolean> | null = null;

const loadSentryClient = (): Promise<SentryClientModule> => import("./sentry-client");

export function startErrorReporting({ env = readPublicEnv(), load = loadSentryClient }: StartErrorReportingOptions = {}): Promise<boolean> {
  if (env.sentryDsn === "") {
    return Promise.resolve(false);
  }

  started ??= load()
    .then(({ initSentryClient }) => {
      initSentryClient({ dsn: env.sentryDsn, environment: env.environment });

      return true;
    })
    .catch(() => false);

  return started;
}

/** Test helper: forgets the previous start so the next call loads again. */
export function resetErrorReportingForTests(): void {
  started = null;
}
