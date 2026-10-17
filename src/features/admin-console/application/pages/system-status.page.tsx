/*
* Funcionalidad: SystemStatusPage
* Descripción: Page /admin/status (TEACHER and ADMIN): the global state of `GET /api/system/status` (OK / DEGRADED / DOWN badge), the "última actualización" checkedAt and one card per component (database, MQTT broker, physical ventilator, AI providers with per-provider rows, media storage, server process with appVersion, appCommit and engineVersion), each with its state badge (service health tokens). Live: `system:status-changed` updates the cached states at once and revalidates; polling every 60 s is only a fallback. Admins also get the ventilator telemetry metrics (`GET /api/ventilator/telemetry/metrics`) and "Probar proveedor" per AI provider (`POST /api/system/probe/ai/{provider}`, 3 per minute; a 429 tells how long to wait). Teachers see it read-only: no probe buttons and no telemetry metrics (role from useSession). Depends on next/head, the design-system components, the session, the admin console components, entities, hooks and CSS Module.
* Versión: 1.0
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

import Head from "next/head";
import { ErrorState } from "@shared/design-system/components/error-state";
import { PageHeader } from "@shared/design-system/components/page-header";
import { CardSkeleton } from "@shared/design-system/components/skeleton";
import { cx } from "@shared/lib/class-names";
import { formatDateTime } from "@shared/lib/format";
import { useSession } from "@shared/session/use-session";
import { AiProvidersCard, BasicComponentCards, StatusBadge, TelemetryMetricsCard } from "../components/status-components";
import { getAdminConsoleErrorMessage } from "../entities/admin-console-error-messages";
import { GLOBAL_STATE_LABELS, globalStateTone } from "../entities/system-status.entity";
import { useAiProbe, useSystemStatus, useTelemetryMetrics } from "../hooks/use-system-status";
import styles from "../../UI/admin-operations.module.css";

// TODO(i18n): move to an admin-console namespace in src/i18n.
export const SYSTEM_STATUS_COPY = {
  documentTitle: "Estado del sistema | VentyLab",
  title: "Estado del sistema",
  subtitle: "Salud de los servicios de la plataforma, calculada por el servidor. Se actualiza en vivo.",
  overall: "Estado general",
  checkedAt: (date: string) => `Última actualización: ${date}.`,
  live: "Los cambios llegan en tiempo real; si la conexión se pierde, se consulta cada minuto.",
  loading: "Cargando el estado del sistema…",
  errorTitle: "No se pudo cargar el estado del sistema",
  componentsTitle: "Componentes",
} as const;

export function SystemStatusPage() {
  const { role } = useSession();
  const isAdmin = role === "ADMIN";
  const { status, error, isLoading, reload } = useSystemStatus();
  const telemetry = useTelemetryMetrics(isAdmin);
  const { probes, probe } = useAiProbe();

  const renderContent = () => {
    if (error && !status) {
      return <ErrorState title={SYSTEM_STATUS_COPY.errorTitle} description={getAdminConsoleErrorMessage(error)} onRetry={() => void reload()} />;
    }

    if (!status) {
      return isLoading ? <CardSkeleton label={SYSTEM_STATUS_COPY.loading} /> : null;
    }

    return (
      <>
        {error ? <ErrorState title={SYSTEM_STATUS_COPY.errorTitle} description={getAdminConsoleErrorMessage(error)} onRetry={() => void reload()} /> : null}
        <section className={cx(styles.section)} aria-labelledby="status-overall">
          <h2 id="status-overall" className={cx(styles.sectionTitle)}>{SYSTEM_STATUS_COPY.overall}</h2>
          <div className={cx(styles.overall)}>
            <StatusBadge tone={globalStateTone(status.state)} label={GLOBAL_STATE_LABELS[status.state]} large />
            <p className={cx(styles.note)}>{SYSTEM_STATUS_COPY.checkedAt(formatDateTime(status.checkedAt))}</p>
          </div>
          <p className={cx(styles.note)}>{SYSTEM_STATUS_COPY.live}</p>
        </section>
        <section className={cx(styles.section)} aria-labelledby="status-components">
          <h2 id="status-components" className={cx(styles.sectionTitle)}>{SYSTEM_STATUS_COPY.componentsTitle}</h2>
          <div className={cx(styles.componentGrid)}>
            <BasicComponentCards components={status.components} />
            <AiProvidersCard aiProviders={status.components.aiProviders} canProbe={isAdmin} probes={probes} onProbe={(provider) => void probe(provider)} />
            {isAdmin ? <TelemetryMetricsCard metrics={telemetry.metrics} failed={telemetry.error !== null} /> : null}
          </div>
        </section>
      </>
    );
  };

  return (
    <div className={cx(styles.page)}>
      <Head>
        <title>{SYSTEM_STATUS_COPY.documentTitle}</title>
      </Head>
      <PageHeader title={SYSTEM_STATUS_COPY.title} subtitle={SYSTEM_STATUS_COPY.subtitle} />
      <div className={cx(styles.content)}>{renderContent()}</div>
    </div>
  );
}
