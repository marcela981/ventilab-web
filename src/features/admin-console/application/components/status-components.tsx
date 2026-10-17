/*
* Funcionalidad: System status components
* Descripción: Building blocks of /admin/status: StatusBadge (state label with the service health tone tokens), ComponentCard (title, state badge and a detail list), the cards of each component of `GET /api/system/status` (database reachability and ping, MQTT broker connection and messages per second, physical ventilator online and active reservation, media storage, server process with versions, uptime, memory and event loop lag), AiProvidersCard (per-provider rows: configured, available, circuit breaker, calls, error rate, p95 latency, last success and last error; admins get "Probar proveedor" with its result) and TelemetryMetricsCard (admin only: `GET /api/ventilator/telemetry/metrics` rates, device latency and end-to-end latency p50/p95, lost and invalid messages). Every value is formatted as returned. Depends on MUI, @shared/lib, the admin console DTOs, entities, hooks types and CSS Module.
* Versión: 1.0
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

import Button from "@mui/material/Button";
import type { ReactNode } from "react";
import { cx } from "@shared/lib/class-names";
import { formatDateTime } from "@shared/lib/format";
import type { SystemComponentName } from "@shared/realtime/realtime.entity";
import type { TelemetryMetricsDTO } from "../../api/dtos/admin-console.dto";
import { formatCount, formatMib, formatMs, formatPerSecond, formatRate, formatUptime, MISSING_VALUE } from "../entities/admin-format";
import { BREAKER_LABELS, COMPONENT_STATE_LABELS, COMPONENT_TITLES, componentStateTone } from "../entities/system-status.entity";
import type { ComponentState, StatusTone, SystemStatus } from "../entities/system-status.entity";
import type { ProbeState } from "../hooks/use-system-status";
import styles from "../../UI/admin-operations.module.css";

// TODO(i18n): move to an admin-console namespace in src/i18n.
export const STATUS_COMPONENTS_COPY = {
  yes: "Sí",
  no: "No",
  unknown: "Sin dato",
  reachable: "Responde",
  latency: "Latencia del ping",
  enabled: "Configurado",
  connected: "Conectado",
  messagesPerSecond: "Mensajes por segundo",
  lastMessage: "Último mensaje",
  online: "Enviando telemetría",
  activeReservation: "Reserva activa",
  storageNote: "Proveedor de almacenamiento de medios.",
  appVersion: "Versión de la aplicación",
  appCommit: "Commit",
  engineVersion: "Versión del motor de simulación",
  uptime: "Tiempo encendido",
  rss: "Memoria residente",
  heap: "Heap en uso",
  eventLoopLag: "Retraso del event loop",
  window: (minutes: number) => `Latencia y tasa de error de los últimos ${minutes} min.`,
  providersCaption: "Estado de cada proveedor de IA",
  provider: "Proveedor",
  configured: "Credenciales",
  available: "Disponible",
  breaker: "Circuit breaker",
  calls: "Llamadas",
  errorRate: "Tasa de error",
  latencyP95: "Latencia p95",
  lastSuccess: "Último éxito",
  lastError: "Último error",
  probe: "Probar proveedor",
  probeAria: (provider: string) => `Probar proveedor ${provider}`,
  probing: "Probando…",
  probeOk: (model: string, latency: string) => `Responde (${model}, ${latency}).`,
  probeFailed: (model: string, latency: string, code: string) => `Falló (${model}, ${latency}, ${code}).`,
  noProviders: "No hay proveedores de IA registrados.",
  telemetryTitle: "Métricas de telemetría del ventilador",
  telemetryNote: (since: string) => `Ventana de medición desde ${since}.`,
  batchesPerSecond: "Lotes emitidos por segundo",
  deviceLatency: (pct: string) => `Latencia del dispositivo ${pct}`,
  totalLatency: (pct: string) => `Latencia MQTT → navegador ${pct}`,
  lostMessages: "Mensajes perdidos",
  invalidMessages: "Mensajes inválidos",
  telemetryError: "No se pudieron cargar las métricas de telemetría.",
} as const;

const yesNo = (value: boolean | null | undefined): string => {
  if (value === null || value === undefined) {
    return STATUS_COMPONENTS_COPY.unknown;
  }

  return value ? STATUS_COMPONENTS_COPY.yes : STATUS_COMPONENTS_COPY.no;
};

const dateOrMissing = (value: string | null | undefined): string => (value ? formatDateTime(value) : MISSING_VALUE);

export function StatusBadge({ tone, label, large = false }: { tone: StatusTone, label: string, large?: boolean }) {
  return <span className={cx(styles.badge, large && styles.badgeLarge)} data-tone={tone}>{label}</span>;
}

type Detail = [string, ReactNode];

export type ComponentCardProps = {
  component: SystemComponentName
  state: ComponentState
  details: readonly Detail[]
  note?: string
  wide?: boolean
  children?: ReactNode
};

export function ComponentCard({ component, state, details, note, wide = false, children }: ComponentCardProps) {
  const tone = componentStateTone(state);
  const titleId = `status-${component}`;

  return (
    <section className={cx(styles.componentCard, wide && styles.componentWide)} data-tone={tone} aria-labelledby={titleId} data-component={component}>
      <div className={cx(styles.componentHeader)}>
        <h3 id={titleId} className={cx(styles.componentTitle)}>{COMPONENT_TITLES[component]}</h3>
        <StatusBadge tone={tone} label={COMPONENT_STATE_LABELS[state]} />
      </div>
      {note ? <p className={cx(styles.note)}>{note}</p> : null}
      {details.length > 0 ? (
        <dl className={cx(styles.detailList)}>
          {details.map(([label, value]) => (
            <div key={label} className={cx(styles.detailRow)}>
              <dt>{label}</dt>
              <dd>{value}</dd>
            </div>
          ))}
        </dl>
      ) : null}
      {children}
    </section>
  );
}

export function BasicComponentCards({ components }: { components: SystemStatus["components"] }) {
  const { database, mqttBroker, ventilator, storage, process } = components;

  return (
    <>
      <ComponentCard
        component="database"
        state={database.state}
        details={[[STATUS_COMPONENTS_COPY.reachable, yesNo(database.reachable)], [STATUS_COMPONENTS_COPY.latency, formatMs(database.latencyMs)]]}
      />
      <ComponentCard
        component="mqttBroker"
        state={mqttBroker.state}
        details={[
          [STATUS_COMPONENTS_COPY.enabled, yesNo(mqttBroker.enabled)],
          [STATUS_COMPONENTS_COPY.connected, yesNo(mqttBroker.connected)],
          [STATUS_COMPONENTS_COPY.messagesPerSecond, formatPerSecond(mqttBroker.messagesPerSecond)],
          [STATUS_COMPONENTS_COPY.lastMessage, dateOrMissing(mqttBroker.lastMessageAt)],
        ]}
      />
      <ComponentCard
        component="ventilator"
        state={ventilator.state}
        details={[[STATUS_COMPONENTS_COPY.online, yesNo(ventilator.online)], [STATUS_COMPONENTS_COPY.activeReservation, yesNo(ventilator.activeReservation)]]}
      />
      <ComponentCard component="storage" state={storage.state} details={[]} note={STATUS_COMPONENTS_COPY.storageNote} />
      <ComponentCard
        component="process"
        state={process.state}
        details={[
          [STATUS_COMPONENTS_COPY.appVersion, process.appVersion],
          [STATUS_COMPONENTS_COPY.appCommit, process.appCommit ?? MISSING_VALUE],
          [STATUS_COMPONENTS_COPY.engineVersion, process.engineVersion],
          [STATUS_COMPONENTS_COPY.uptime, formatUptime(process.uptimeSeconds)],
          [STATUS_COMPONENTS_COPY.rss, formatMib(process.rssBytes)],
          [STATUS_COMPONENTS_COPY.heap, formatMib(process.heapUsedBytes)],
          [STATUS_COMPONENTS_COPY.eventLoopLag, formatMs(process.eventLoopLagMs)],
        ]}
      />
    </>
  );
}

export type AiProvidersCardProps = {
  aiProviders: SystemStatus["components"]["aiProviders"]
  canProbe: boolean
  probes: Readonly<Record<string, ProbeState>>
  onProbe: (provider: string) => void
};

function ProbeOutcome({ state }: { state: ProbeState | undefined }) {
  if (!state || state.pending) {
    return null;
  }

  if (state.errorMessage) {
    return <p className={cx(styles.probeResult)} data-ok="false" role="status">{state.errorMessage}</p>;
  }

  if (!state.result) {
    return null;
  }

  const { ok, model, latencyMs, errorCode } = state.result;

  return (
    <p className={cx(styles.probeResult)} data-ok={ok ? "true" : "false"} role="status">
      {ok
        ? STATUS_COMPONENTS_COPY.probeOk(model, formatMs(latencyMs))
        : STATUS_COMPONENTS_COPY.probeFailed(model, formatMs(latencyMs), errorCode ?? MISSING_VALUE)}
    </p>
  );
}

export function AiProvidersCard({ aiProviders, canProbe, probes, onProbe }: AiProvidersCardProps) {
  return (
    <ComponentCard component="aiProviders" state={aiProviders.state} details={[]} note={STATUS_COMPONENTS_COPY.window(aiProviders.windowMinutes)} wide>
      {aiProviders.providers.length === 0 ? <p className={cx(styles.note)}>{STATUS_COMPONENTS_COPY.noProviders}</p> : (
        <div className={cx(styles.tableContainer)}>
          <table className={cx(styles.table)}>
            <caption className={cx(styles.visuallyHidden)}>{STATUS_COMPONENTS_COPY.providersCaption}</caption>
            <thead>
              <tr>
                <th scope="col">{STATUS_COMPONENTS_COPY.provider}</th>
                <th scope="col">{STATUS_COMPONENTS_COPY.configured}</th>
                <th scope="col">{STATUS_COMPONENTS_COPY.available}</th>
                <th scope="col">{STATUS_COMPONENTS_COPY.breaker}</th>
                <th scope="col" className={cx(styles.numeric)}>{STATUS_COMPONENTS_COPY.calls}</th>
                <th scope="col" className={cx(styles.numeric)}>{STATUS_COMPONENTS_COPY.errorRate}</th>
                <th scope="col" className={cx(styles.numeric)}>{STATUS_COMPONENTS_COPY.latencyP95}</th>
                <th scope="col">{STATUS_COMPONENTS_COPY.lastSuccess}</th>
                <th scope="col">{STATUS_COMPONENTS_COPY.lastError}</th>
                {canProbe ? <th scope="col">{STATUS_COMPONENTS_COPY.probe}</th> : null}
              </tr>
            </thead>
            <tbody>
              {aiProviders.providers.map((provider) => {
                const probe = probes[provider.provider];

                return (
                  <tr key={provider.provider}>
                    <th scope="row" className={cx(styles.mono)}>{provider.provider}</th>
                    <td>{yesNo(provider.configured)}</td>
                    <td>{yesNo(provider.available)}</td>
                    <td>{BREAKER_LABELS[provider.breaker]}</td>
                    <td className={cx(styles.numeric)}>{formatCount(provider.calls)}</td>
                    <td className={cx(styles.numeric)}>{formatRate(provider.errorRate)}</td>
                    <td className={cx(styles.numeric)}>{formatMs(provider.latencyP95Ms)}</td>
                    <td>{dateOrMissing(provider.lastSuccessAt)}</td>
                    <td>
                      {dateOrMissing(provider.lastErrorAt)}
                      {provider.lastErrorCode ? <span className={cx(styles.secondary, styles.mono)}>{provider.lastErrorCode}</span> : null}
                    </td>
                    {canProbe ? (
                      <td>
                        <Button
                          size="small"
                          variant="outlined"
                          disabled={probe?.pending ?? false}
                          onClick={() => onProbe(provider.provider)}
                          aria-label={STATUS_COMPONENTS_COPY.probeAria(provider.provider)}
                        >
                          {probe?.pending ? STATUS_COMPONENTS_COPY.probing : STATUS_COMPONENTS_COPY.probe}
                        </Button>
                        <ProbeOutcome state={probe} />
                      </td>
                    ) : null}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </ComponentCard>
  );
}

export type TelemetryMetricsCardProps = {
  metrics: TelemetryMetricsDTO | null
  failed: boolean
};

export function TelemetryMetricsCard({ metrics, failed }: TelemetryMetricsCardProps) {
  if (failed) {
    return <p className={cx(styles.note)}>{STATUS_COMPONENTS_COPY.telemetryError}</p>;
  }

  if (!metrics) {
    return null;
  }

  const details: Detail[] = [
    [STATUS_COMPONENTS_COPY.messagesPerSecond, formatPerSecond(metrics.messagesPerSecond)],
    [STATUS_COMPONENTS_COPY.batchesPerSecond, formatPerSecond(metrics.batchesPerSecond)],
    [STATUS_COMPONENTS_COPY.deviceLatency("p50"), formatMs(metrics.deviceLatencyMs.p50)],
    [STATUS_COMPONENTS_COPY.deviceLatency("p95"), formatMs(metrics.deviceLatencyMs.p95)],
    [STATUS_COMPONENTS_COPY.totalLatency("p50"), formatMs(metrics.totalMs.p50)],
    [STATUS_COMPONENTS_COPY.totalLatency("p95"), formatMs(metrics.totalMs.p95)],
    [STATUS_COMPONENTS_COPY.lostMessages, formatCount(metrics.lostMessages)],
    [STATUS_COMPONENTS_COPY.invalidMessages, formatCount(metrics.invalidMessages)],
  ];

  return (
    <section className={cx(styles.componentCard, styles.componentWide)} aria-labelledby="status-telemetry">
      <h3 id="status-telemetry" className={cx(styles.componentTitle)}>{STATUS_COMPONENTS_COPY.telemetryTitle}</h3>
      <p className={cx(styles.note)}>{STATUS_COMPONENTS_COPY.telemetryNote(formatDateTime(metrics.since))}</p>
      <dl className={cx(styles.detailList)}>
        {details.map(([label, value]) => (
          <div key={label} className={cx(styles.detailRow)}>
            <dt>{label}</dt>
            <dd>{value}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
}
