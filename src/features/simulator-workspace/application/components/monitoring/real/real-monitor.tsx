/*
* Funcionalidad: Real monitor
* Descripción: Real view of the Monitoreo tab of /simulador while the lab connection is CONNECTED (W10, Bloque 1;
*   DISENO_BLOQUE1 §3 RealMonitor, FLUJOS_JULIO a.6, a.7 and b.5 step 4). Loaded lazily by the monitor guides, so the
*   real hooks only exist once the caller is connected; the console itself (shared VentilatorConsole fed by the real
*   adapter store, its curves, numeric monitor, alarms bar with the alarm limits panel, controls and the command panel
*   with the command states) is the lazy live console of ventilator-lab, a chunk of its own. Telemetry stays out of
*   React: the adapter commits at most every 250 ms, the latency every 500 ms and the stale timer only on a change.
*   Shows: the telemetry latency with its traffic light (p95 of the session; green < 70 ms, yellow 70–99 ms,
*   red ≥ 100 ms) measured on the server clock; the device state; the operator control bar (or "Opera: <nombre>"
*   when there is no control access); "Grabar sesión" for a caller with the control right; the "Equipo sin datos"
*   notice once no telemetry arrives for telemetry.staleAfterMs (2 s by default) or the device reports itself
*   disconnected; the reconnection notice while the socket is down. Only the operator gets an editable console, and
*   only while the device sends data; anyone else (observers, including the group members) sees it read-only with
*   the reason. Depends on React, the workspace lab connection, the ventilator-lab live and connection entry points
*   and the real monitor styles.
* Versión: 0.1
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

import { OperatorControlBar } from "@features/ventilator-lab/connection.entry";
import {
  CONTROL_COPY,
  LATENCY_THRESHOLD_MS,
  LATENCY_WARNING_MS,
  latencyLevel,
  LazyLiveConsole,
  RecIndicator,
  RecordingControl,
  useDeviceStatus,
  useLabSettings,
  useServerClockOffset,
  useSessionRecording,
  useTelemetryLatency,
  useTelemetryStale,
} from "@features/ventilator-lab/live.entry";
import type { ServerClock } from "@features/ventilator-lab/live.entry";
import { cx } from "@shared/lib/class-names";
import type { LabConnectionValue } from "../../../entities/lab-connection.entity";
import { useLabConnection } from "../../lab-connection-provider";
import styles from "../../../../UI/monitoring/real-monitor.module.css";

// TODO(i18n): move to a simulator namespace in src/i18n.
export const REAL_MONITOR_COPY = {
  title: "Ventilador físico",
  latency: "Latencia",
  latencyValue: (current: number, p95: number | null) => `${current} ms · p95 ${p95 ?? "—"} ms`,
  latencyEmpty: "—",
  latencyUnsynced: "— (reloj sin sincronizar)",
  latencyHint: `Umbral ${LATENCY_THRESHOLD_MS} ms: verde < ${LATENCY_WARNING_MS} ms, amarillo ${LATENCY_WARNING_MS}–${LATENCY_THRESHOLD_MS - 1} ms, rojo ≥ ${LATENCY_THRESHOLD_MS} ms (p95 de la sesión).`,
  device: "Equipo",
  deviceOnline: "En línea",
  deviceNoData: "Sin datos",
  waiting: "Esperando datos del ventilador físico...",
  noData: "Equipo sin datos",
  noDataNotice: (seconds: number) => `Equipo sin datos: sin señal del ventilador hace más de ${seconds} segundos.`,
  noDataReason: "Equipo sin datos: los ajustes mostrados son los últimos que informó el equipo; los controles se habilitan cuando vuelva a enviar datos.",
  socketLost: "Se perdió la conexión en tiempo real con el servidor. Reconectando…",
  socketLostOverlay: "Sin conexión con el servidor",
  socketLostReason: "Sin conexión en tiempo real: los ajustes mostrados son los últimos que informó el equipo; los controles se habilitan al reconectar.",
  observer: "Solo lectura: no tienes el control del equipo.",
} as const;

function LatencyBadge({ clock, sessionKey, live }: { clock: ServerClock, sessionKey: string, live: boolean }) {
  const latency = useTelemetryLatency(clock.offsetMs, sessionKey);
  // The session p95 decides the colour; without data the last value would read as current: nothing is shown.
  const level = live ? latencyLevel(latency.p95Ms ?? latency.currentMs) : "unknown";
  let value: string = REAL_MONITOR_COPY.latencyEmpty;

  if (live && clock.status === "unsynced") {
    value = REAL_MONITOR_COPY.latencyUnsynced;
  } else if (live && latency.currentMs !== null) {
    value = REAL_MONITOR_COPY.latencyValue(latency.currentMs, latency.p95Ms);
  }

  return (
    <div className={cx(styles.indicator)} title={REAL_MONITOR_COPY.latencyHint}>
      <p className={cx(styles.indicatorLabel)}>{REAL_MONITOR_COPY.latency}</p>
      <p className={cx(styles.latency)} data-level={level} data-testid="real-monitor-latency">
        <span className={cx(styles.latencyDot)} aria-hidden="true" />
        {value}
      </p>
    </div>
  );
}

/** Read-only reason of a caller that does not operate (null for the operator). */
function observerReason({ isOperator, operatorName, control }: LabConnectionValue): string | null {
  if (isOperator) {
    return null;
  }

  if (operatorName !== null) {
    return CONTROL_COPY.other(operatorName);
  }

  return control?.view.state?.canTake ? CONTROL_COPY.takeToOperate : REAL_MONITOR_COPY.observer;
}

function OperatorLine({ connection }: { connection: LabConnectionValue }) {
  const { control, operatorName, isOperator } = connection;

  if (control) {
    return (
      <OperatorControlBar
        view={control.view}
        operatorName={operatorName}
        onTake={control.take}
        onTakeover={control.takeover}
        onRelease={control.release}
        onDismissLoss={control.dismissLoss}
      />
    );
  }

  let text: string | null = null;

  if (isOperator) {
    text = CONTROL_COPY.self;
  } else if (operatorName !== null) {
    text = CONTROL_COPY.other(operatorName);
  }

  return text === null ? null : <p className={cx(styles.operator)} data-testid="real-monitor-operator">{text}</p>;
}

export function RealMonitor() {
  const connection = useLabConnection();
  const { reservation, socketOnline, isOperator, canControl } = connection;
  const { settings } = useLabSettings();
  const staleAfterMs = settings["telemetry.staleAfterMs"];
  const device = useDeviceStatus();
  const stale = useTelemetryStale(staleAfterMs, socketOnline);
  const clock = useServerClockOffset();
  const recording = useSessionRecording({ enabled: canControl });
  const live = socketOnline && device.kind === "online" && !stale;
  // "Equipo sin datos": no batch for staleAfterMs, or the device itself reported it has no data.
  const noData = socketOnline && (stale || (device.kind === "no-data" && device.reason !== "unknown"));

  if (reservation === null) {
    return <p className={cx(styles.muted)} role="status">{REAL_MONITOR_COPY.waiting}</p>;
  }

  let readOnlyReason: string | undefined;

  if (!socketOnline) {
    readOnlyReason = REAL_MONITOR_COPY.socketLostReason;
  } else if (!live) {
    readOnlyReason = REAL_MONITOR_COPY.noDataReason;
  } else {
    readOnlyReason = observerReason(connection) ?? undefined;
  }

  let noDataMessage: string = REAL_MONITOR_COPY.waiting;

  if (!socketOnline) {
    noDataMessage = REAL_MONITOR_COPY.socketLostOverlay;
  } else if (noData) {
    noDataMessage = REAL_MONITOR_COPY.noData;
  }

  return (
    <div className={cx(styles.monitor)} data-testid="real-monitor">
      <div className={cx(styles.bar)}>
        <h3 className={cx(styles.title)}>{REAL_MONITOR_COPY.title}</h3>
        <div className={cx(styles.indicators)}>
          <div className={cx(styles.indicator)}>
            <p className={cx(styles.indicatorLabel)}>{REAL_MONITOR_COPY.device}</p>
            <span className={cx(styles.deviceTag)} data-online={live}>
              {live ? REAL_MONITOR_COPY.deviceOnline : REAL_MONITOR_COPY.deviceNoData}
            </span>
          </div>
          <LatencyBadge clock={clock} sessionKey={reservation.id} live={live} />
        </div>
      </div>
      <OperatorLine connection={connection} />
      {canControl ? <RecordingControl recording={recording} /> : null}
      {recording.note ? <p className={cx(styles.muted)} role="status">{recording.note}</p> : null}
      {!socketOnline ? <p className={cx(styles.notice)} role="alert">{REAL_MONITOR_COPY.socketLost}</p> : null}
      {noData ? (
        <p className={cx(styles.notice)} role="alert" data-testid="real-monitor-no-data">
          {REAL_MONITOR_COPY.noDataNotice(Math.round(staleAfterMs / 1000))}
        </p>
      ) : null}
      <LazyLiveConsole
        sourceId={reservation.id}
        live={live}
        canControl={isOperator && live}
        pendingResetKey={isOperator ? "operator" : "viewer"}
        noDataMessage={noDataMessage}
        header={<RecIndicator phase={recording.state.phase} />}
        alarmLimits
        {...(readOnlyReason === undefined ? {} : { readOnlyReason })}
      />
    </div>
  );
}
