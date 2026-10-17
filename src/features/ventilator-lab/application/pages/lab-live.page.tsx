/*
* Funcionalidad: Lab live console page
* Descripción: /lab/live, the live console of the physical ventilator. Access comes from GET /api/reservations/current (live-session entity): a caller the backend lets control the active reservation (holder user, member of the holder group, teacher or admin) gets the console session; anyone else gets "Equipo ocupado" with the occupancy label exactly as the backend returned it and no curves (the room is not even joined); without an active reservation the caller's next reservation and a link to the calendar are shown. The session joins the ventilator room on every authenticated connection and reservation change (useVentilatorRoom) and shows a `ventilator:join-rejected` reason (then re-reads the active reservation); the console itself (shared VentilatorConsole + real adapter) is LAZY loaded so the console, waveforms and Chart code never reach other /lab pages. Connection states: device without data (`ventilator:disconnected`, unknown state, or no batch for telemetry.staleAfterMs) → grey frozen curves under "Equipo sin datos" and read-only controls, resuming on `ventilator:connected` or new frames; socket not authenticated → reconnection banner and read-only console. Header: reservation window, countdown to its end on the server clock, device state and the telemetry latency (current and session p95 against the 100 ms threshold; green < 70 ms, yellow 70–99 ms, red ≥ 100 ms) measured with the server clock offset. Realtime revalidation of the reservation reads and the preemption notice as on every /lab page. v1.1 (T7): the operator control bar (useOperatorControl: banner, take / takeover with confirmation / release, heartbeat, release on leaving); only the operator gets an editable console (still read-only without data or socket), anyone else sees the reason ("Opera: <name>" / "Toma el control para operar"); the no-data and socket-lost reasons say the settings shown are the last ones the device reported (T5 review fix S3). v1.2 (T6 review fix): the latency shows "—" (level unknown) while the socket is down or the device has no data / is stale; the clock is measured with several samples and again on reconnection; the p95 covers the whole session. v1.3 (T9): control revoked. The session reservation is kept while its end is explained: `ventilator:control-changed` reservation_preempted / reservation_ended, `reservation:preempted` (its preemption toast is replaced by the modal), the countdown reaching zero, or a re-read that no longer gives the caller that reservation open the blocking modal (reason, preemption reason, the next holder only as the backend projection gives it); the console stays visible read-only with its unconfirmed edits dropped, an in-flight command keeps its status, no new command, no room re-join and no release on leaving. "Entendido" re-reads GET /api/reservations/current: another active reservation with canControl → its console (read-only until the control is taken), otherwise /lab. A control loss while the reservation continues (takeover, presence timeout, release by staff) is a non-blocking notice in the control bar and drops the unconfirmed edits too. v1.4 (T10): "Grabar sesión" toggle (RecordingControl) for a caller with `canControl` of the session reservation while it is active (holder user, holder group member, teacher, admin: the backend recording rule), stop behind a confirmation, Spanish errors; the REC mark in the console header only in the tab that started the recording (no shared recording signal in the backend: gap) and the local state is lost on reload. v1.5 (T9 review fix): B1 the countdown exists, and can end the session, only on the synchronised server clock ("—" while it is pending or unsynced; the browser clock never decides); S2 a cancelled or rejected navigation to /lab after "Entendido" reopens the dialog and falls back to a full page load. Depends on MUI, next/head, next/link, next/router, the design-system states, the date format helper, the shared realtime hooks and server clock, the lab hooks, entities, components, routes and styles. v1.6 (T10 review fix S9): the recording note (this tab started a recording it may no longer control) is shown under the control bar. v1.7 (O1 notifications): focus mode (useFocusMode of the design system) while the console is open, so notification toasts do not interrupt the operation; the revoked modal stays the notice of a preemption of the session. v1.8 (O1 review): focus mode only while the live console session is shown (showSession), not on the busy, no-reservation, loading or error screens. v1.9 (B2 closure): the no-op expectOwnPreemption call for the session reservation is gone (focus mode already drops the notification toast on top of the revoked modal, and the backend no longer notifies the actor).
* Versión: 1.9
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

import Button from "@mui/material/Button";
import Head from "next/head";
import Link from "next/link";
import { useRouter } from "next/router";
import { useCallback, useEffect, useId, useState } from "react";
import { ErrorState } from "@shared/design-system/components/error-state";
import { PageHeader } from "@shared/design-system/components/page-header";
import { CardSkeleton } from "@shared/design-system/components/skeleton";
import { useFocusMode } from "@shared/design-system/components/use-focus-mode";
import { cx } from "@shared/lib/class-names";
import { formatDateRange } from "@shared/lib/format";
import { useSocket, useSocketEvent } from "@shared/realtime";
import { ControlRevokedDialog } from "../components/control-revoked-dialog";
import { LazyLiveConsole } from "../components/lazy-live-console";
import { OperatorControlBar } from "../components/operator-control-bar";
import { RecIndicator, RecordingControl } from "../components/recording-control";
import { LAB_RESERVATIONS_URL, LAB_URL } from "../config/lab.routes";
import {
  isReservationTimeUp,
  mergeRevocation,
  nextActionAfterRevocation,
  REVOCATION_COPY,
  revocationFromControlEvent,
  revocationFromPreemption,
  revocationFromRead,
  revocationModal,
} from "../entities/control-revocation.entity";
import type { Revocation } from "../entities/control-revocation.entity";
import { getLabErrorMessage } from "../entities/lab-error-messages";
import { formatReservationCountdown, joinRejectedMessage, resolveLiveAccess, sessionRemainingMs } from "../entities/live-session.entity";
import { controlPermissions, operatorDisplayName } from "../entities/operator-control.entity";
import { upcomingReservations } from "../entities/reservation.entity";
import { recordingAllowed } from "../entities/session-recording.entity";
import type { CurrentReservation, LabReservation } from "../entities/reservation.entity";
import { LATENCY_THRESHOLD_MS, LATENCY_WARNING_MS, latencyLevel } from "../entities/telemetry-latency";
import { useDeviceStatus } from "../hooks/use-device-status";
import { useCurrentReservation, useMyReservations } from "../hooks/use-lab-reservations";
import { useLabSettings } from "../hooks/use-lab-settings";
import { useOperatorControl } from "../hooks/use-operator-control";
import { usePreemptionNotice } from "../hooks/use-preemption-notice";
import { useReservationsRealtime } from "../hooks/use-reservations-realtime";
import { useSessionRecording } from "../hooks/use-session-recording";
import { useTelemetryLatency, useServerClockOffset } from "../hooks/use-telemetry-latency";
import type { ServerClock } from "../hooks/use-telemetry-latency";
import { useTelemetryStale } from "../hooks/use-telemetry-stale";
import { useVentilatorRoom } from "../hooks/use-ventilator-room";
import styles from "../../UI/lab-live.module.css";

// TODO(i18n): move to a ventilator-lab namespace in src/i18n.
export const LAB_LIVE_COPY = {
  documentTitle: "Consola en vivo | VentyLab",
  title: "Consola en vivo",
  subtitle: "Ventilador mecánico físico del laboratorio.",
  back: "Volver al laboratorio",
  loading: "Cargando la reserva activa…",
  error: "No se pudo cargar la reserva activa",
  busyTitle: "Equipo ocupado",
  busyDefault: "Ventilador en uso",
  busyHint: "La consola en vivo es solo para quien tiene la reserva activa (o su grupo), docentes y administradores.",
  noneTitle: "No hay una reserva activa",
  noneHint: "La consola se abre durante tu reserva del ventilador.",
  nextLabel: "Tu próxima reserva:",
  nextLoading: "Cargando tus reservas…",
  nextNone: "No tienes reservas próximas.",
  toCalendar: "Ir al calendario de reservas",
  remaining: "Tiempo restante",
  device: "Equipo",
  deviceOnline: "En línea",
  deviceNoData: "Sin datos",
  latency: "Latencia",
  latencyValue: (current: number, p95: number | null) => `${current} ms · p95 ${p95 ?? "—"} ms`,
  latencyEmpty: "—",
  latencyUnsynced: "— (reloj sin sincronizar)",
  latencyHint: `Umbral ${LATENCY_THRESHOLD_MS} ms: verde < ${LATENCY_WARNING_MS} ms, amarillo ${LATENCY_WARNING_MS}–${LATENCY_THRESHOLD_MS - 1} ms, rojo ≥ ${LATENCY_THRESHOLD_MS} ms (p95 de la sesión).`,
  socketLost: "Se perdió la conexión en tiempo real con el servidor. Reconectando…",
  socketLostOverlay: "Sin conexión con el servidor",
  socketLostReason: "Sin conexión en tiempo real: los ajustes mostrados son los últimos que informó el equipo; los controles se habilitan al reconectar.",
  noData: "Equipo sin datos",
  noDataReason: "Equipo sin datos: los ajustes mostrados son los últimos que informó el equipo; los controles se habilitan cuando vuelva a enviar datos.",
  joinRejected: (message: string) => `No se pudo entrar a la sala del ventilador. ${message}`,
} as const;

const TICK_MS = 1000;

function useClientNow(): number {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), TICK_MS);

    return () => clearInterval(timer);
  }, []);

  return now;
}

function BackButton() {
  return <Button component={Link} href={LAB_URL}>{LAB_LIVE_COPY.back}</Button>;
}

function BusyScreen({ label }: { label: string | null }) {
  const titleId = useId();

  return (
    <section className={cx(styles.card)} aria-labelledby={titleId}>
      <h2 id={titleId} className={cx(styles.cardTitle)}>{LAB_LIVE_COPY.busyTitle}</h2>
      <p className={cx(styles.label)}>{label ?? LAB_LIVE_COPY.busyDefault}</p>
      <p className={cx(styles.muted)}>{LAB_LIVE_COPY.busyHint}</p>
      <Button component={Link} href={LAB_RESERVATIONS_URL} variant="outlined">{LAB_LIVE_COPY.toCalendar}</Button>
    </section>
  );
}

function NoReservationScreen() {
  const titleId = useId();
  const mine = useMyReservations();
  const next = mine.data ? upcomingReservations(mine.data, new Date(), null)[0] ?? null : null;

  return (
    <section className={cx(styles.card)} aria-labelledby={titleId}>
      <h2 id={titleId} className={cx(styles.cardTitle)}>{LAB_LIVE_COPY.noneTitle}</h2>
      <p className={cx(styles.muted)}>{LAB_LIVE_COPY.noneHint}</p>
      {!mine.data && mine.isLoading ? <p className={cx(styles.muted)}>{LAB_LIVE_COPY.nextLoading}</p> : null}
      {mine.data && next ? (
        <p className={cx(styles.label)}>{`${LAB_LIVE_COPY.nextLabel} ${formatDateRange(next.startsAt, next.endsAt)}`}</p>
      ) : null}
      {mine.data && !next ? <p className={cx(styles.muted)}>{LAB_LIVE_COPY.nextNone}</p> : null}
      <Button component={Link} href={LAB_RESERVATIONS_URL} variant="contained">{LAB_LIVE_COPY.toCalendar}</Button>
    </section>
  );
}

function LatencyIndicator({ clock, sessionKey, live }: { clock: ServerClock, sessionKey: string, live: boolean }) {
  const latency = useTelemetryLatency(clock.offsetMs, sessionKey);
  // The session p95 decides the colour (a single slow batch does not paint it red). Without data (socket down, device
  // without data or stale) the last value would read as current: nothing is shown.
  const level = live ? latencyLevel(latency.p95Ms ?? latency.currentMs) : "unknown";
  let value: string = LAB_LIVE_COPY.latencyEmpty;

  if (!live) {
    value = LAB_LIVE_COPY.latencyEmpty;
  } else if (clock.status === "unsynced") {
    value = LAB_LIVE_COPY.latencyUnsynced;
  } else if (latency.currentMs !== null) {
    value = LAB_LIVE_COPY.latencyValue(latency.currentMs, latency.p95Ms);
  }

  return (
    <div className={cx(styles.indicator)} title={LAB_LIVE_COPY.latencyHint}>
      <p className={cx(styles.indicatorLabel)}>{LAB_LIVE_COPY.latency}</p>
      <p className={cx(styles.indicatorValue, styles.latency)} data-level={level} data-testid="lab-live-latency">{value}</p>
    </div>
  );
}

type LiveSessionProps = {
  reservation: LabReservation
  /** The session reservation ended or was preempted (T9): read-only, no join, no release on leaving. */
  ended: boolean
  /** T10: the caller may record this reservation now (recordingAllowed). */
  canRecord: boolean
  onRejected: () => void
  onTimeUp: () => void
};

function LiveSession({ reservation, ended, canRecord, onRejected, onTimeUp }: LiveSessionProps) {
  const { status: realtimeStatus } = useSocket();
  const { settings } = useLabSettings();
  const socketOnline = realtimeStatus === "authenticated";
  const room = useVentilatorRoom({ enabled: !ended, reservationId: reservation.id });
  const device = useDeviceStatus();
  const stale = useTelemetryStale(settings["telemetry.staleAfterMs"], socketOnline);
  const clock = useServerClockOffset();
  const now = useClientNow();
  const live = socketOnline && device.kind === "online" && !stale;
  // B1: only the synchronised server clock may end the session (null → "—" while pending or unsynced).
  const remaining = sessionRemainingMs(reservation.endsAt, now, clock);
  const timeUp = isReservationTimeUp(remaining);
  const { rejectedReason } = room;
  const control = useOperatorControl({ enabled: true, releaseOnLeaveEnabled: !ended });
  const operatorName = reservation.visibility === "full" ? operatorDisplayName(control.view.state?.operatorUserId, reservation) : null;
  const permissions = controlPermissions(control.view.state, operatorName, { live, socketOnline });
  const recording = useSessionRecording({ enabled: canRecord });
  // Only the operator can hold unconfirmed edits: leaving that role (control lost, session ended) drops them.
  let pendingResetKey = control.view.state?.isOperator ? "operator" : "viewer";

  if (ended) {
    pendingResetKey = "ended";
  }

  // A rejection usually means the reservation changed or ended: re-read it.
  useEffect(() => {
    if (rejectedReason !== null) {
      onRejected();
    }
  }, [rejectedReason, onRejected]);

  // The countdown on the server clock reached the end of the reservation.
  useEffect(() => {
    if (timeUp && !ended) {
      onTimeUp();
    }
  }, [timeUp, ended, onTimeUp]);

  let readOnlyReason: string | undefined;

  if (ended) {
    readOnlyReason = REVOCATION_COPY.readOnlyReason;
  } else if (!socketOnline) {
    readOnlyReason = LAB_LIVE_COPY.socketLostReason;
  } else if (!live) {
    readOnlyReason = LAB_LIVE_COPY.noDataReason;
  } else if (permissions.readOnlyReason !== null) {
    readOnlyReason = permissions.readOnlyReason;
  }

  return (
    <div className={cx(styles.session)}>
      <div className={cx(styles.sessionBar)}>
        <div>
          <h1 className={cx(styles.sessionTitle)}>{LAB_LIVE_COPY.title}</h1>
          <p className={cx(styles.sessionWindow)}>{formatDateRange(reservation.startsAt, reservation.endsAt)}</p>
        </div>
        <div className={cx(styles.indicators)}>
          <div className={cx(styles.indicator)}>
            <p className={cx(styles.indicatorLabel)}>{LAB_LIVE_COPY.remaining}</p>
            <p className={cx(styles.indicatorValue)} role="timer" aria-label={LAB_LIVE_COPY.remaining}>
              {remaining === null ? "—" : formatReservationCountdown(Math.max(0, remaining))}
            </p>
          </div>
          <div className={cx(styles.indicator)}>
            <p className={cx(styles.indicatorLabel)}>{LAB_LIVE_COPY.device}</p>
            <span className={cx(styles.deviceTag)} data-online={live}>
              {live ? LAB_LIVE_COPY.deviceOnline : LAB_LIVE_COPY.deviceNoData}
            </span>
          </div>
          <LatencyIndicator clock={clock} sessionKey={reservation.id} live={live} />
        </div>
      </div>
      <OperatorControlBar
        view={control.view}
        operatorName={operatorName}
        onTake={control.take}
        onTakeover={control.takeover}
        onRelease={control.release}
        onDismissLoss={control.dismissLoss}
      />
      {canRecord ? <RecordingControl recording={recording} /> : null}
      {recording.note ? <p className={cx(styles.recordingHint)} role="status" data-testid="lab-live-recording-note">{recording.note}</p> : null}
      {!socketOnline ? <p className={cx(styles.banner)} role="alert">{LAB_LIVE_COPY.socketLost}</p> : null}
      {socketOnline && rejectedReason !== null ? (
        <p className={cx(styles.banner)} data-tone="error" role="alert">
          {LAB_LIVE_COPY.joinRejected(joinRejectedMessage(rejectedReason))}
        </p>
      ) : null}
      <LazyLiveConsole
        sourceId={reservation.id}
        live={live}
        canControl={permissions.canControl && !ended}
        pendingResetKey={pendingResetKey}
        header={<RecIndicator phase={recording.state.phase} />}
        noDataMessage={socketOnline ? LAB_LIVE_COPY.noData : LAB_LIVE_COPY.socketLostOverlay}
        {...(readOnlyReason === undefined ? {} : { readOnlyReason })}
      />
    </div>
  );
}

/** The console session shown: its reservation and, once it ended, why (kept until the user acknowledges). */
type SessionState = { reservation: LabReservation, ended: Revocation | null };

type Acknowledgement = { pending: boolean, error: string | null };

const IDLE_ACK: Acknowledgement = { pending: false, error: null };

/** Session after a (re-)read: start one, keep it fresh, or end it when the read no longer gives it to the caller. */
function sessionAfterRead(
  session: SessionState | null,
  current: CurrentReservation | null,
  consoleReservation: LabReservation | null,
): SessionState | null {
  if (session === null) {
    return consoleReservation ? { reservation: consoleReservation, ended: null } : null;
  }

  if (session.ended !== null || current === null) {
    return session;
  }

  const revocation = revocationFromRead(current, session.reservation.id);

  if (revocation) {
    return { ...session, ended: revocation };
  }

  return consoleReservation && consoleReservation !== session.reservation ? { reservation: consoleReservation, ended: null } : session;
}

export function LabLivePage() {
  useReservationsRealtime();
  usePreemptionNotice();
  const router = useRouter();
  const current = useCurrentReservation();
  const access = current.data ? resolveLiveAccess(current.data) : null;
  const consoleReservation = access?.kind === "console" ? access.reservation : null;
  const { reload, read } = current;
  const [session, setSession] = useState<SessionState | null>(null);
  const [ack, setAck] = useState<Acknowledgement>(IDLE_ACK);
  const [leaving, setLeaving] = useState(false);
  const sessionId = session?.reservation.id ?? null;
  const ended = session?.ended ?? null;
  const next = sessionAfterRead(session, current.data, consoleReservation);

  // Derived from the latest read during render (no effect): start, refresh or end the session.
  if (next !== session) {
    setSession(next);
  }

  const onRejected = useCallback(() => {
    void reload().catch(() => undefined);
  }, [reload]);

  const end = useCallback((revocation: Revocation | null) => {
    if (revocation === null) {
      return;
    }

    setSession((previous) => (previous ? { ...previous, ended: mergeRevocation(previous.ended, revocation) } : previous));
    // Who holds the ventilator now (shown in the modal as the backend projects it).
    void reload().catch(() => undefined);
  }, [reload, setSession]);

  const onTimeUp = useCallback(() => end({ reason: "time_up", detail: null }), [end]);

  useSocketEvent("ventilator:control-changed", (event) => {
    if (sessionId !== null) {
      end(revocationFromControlEvent(event, sessionId));
    }
  });

  useSocketEvent("reservation:preempted", (event) => {
    if (sessionId !== null) {
      end(revocationFromPreemption(event, sessionId));
    }
  });

  // S2: the Pages Router resolves false on a cancelled navigation and may reject (aborted, chunk failure): never strand
  // the user on the ended session — reopen the dialog and fall back to a full page load.
  const leaveTo = async(url: string) => {
    let navigated = false;

    try {
      navigated = await router.push(url);
    } catch {
      navigated = false;
    }

    if (!navigated) {
      setLeaving(false);
      window.location.assign(url);
    }
  };

  const acknowledge = async() => {
    if (!session) {
      return;
    }

    setAck({ pending: true, error: null });

    try {
      const fresh = await read();

      if (nextActionAfterRevocation(fresh, session.reservation.id) === "watch" && fresh.reservation) {
        setSession({ reservation: fresh.reservation, ended: null });
        setAck(IDLE_ACK);
      } else {
        setLeaving(true);
        void leaveTo(LAB_URL);
      }
    } catch {
      setAck({ pending: false, error: REVOCATION_COPY.readError });
    }
  };

  const showSession = session !== null && (ended !== null || consoleReservation !== null);

  useFocusMode(showSession);

  return (
    <div className={cx(showSession ? styles.consolePage : styles.page)}>
      <Head>
        <title>{LAB_LIVE_COPY.documentTitle}</title>
      </Head>
      {showSession ? null : (
        <PageHeader title={LAB_LIVE_COPY.title} subtitle={LAB_LIVE_COPY.subtitle} actions={<BackButton />} />
      )}
      {!current.data && current.isLoading ? <CardSkeleton label={LAB_LIVE_COPY.loading} /> : null}
      {!current.data && !current.isLoading && current.error ? (
        <ErrorState title={LAB_LIVE_COPY.error} description={getLabErrorMessage(current.error)} onRetry={() => void reload()} />
      ) : null}
      {!showSession && access?.kind === "busy" ? <BusyScreen label={access.label} /> : null}
      {!showSession && access?.kind === "none" ? <NoReservationScreen /> : null}
      {showSession ? (
        <LiveSession
          key={session.reservation.id}
          reservation={session.reservation}
          ended={ended !== null}
          canRecord={recordingAllowed({
            canControl: current.data?.canControl ?? false,
            sessionReservationId: session.reservation.id,
            currentReservationId: current.data?.reservation?.id ?? null,
            ended: ended !== null,
          })}
          onRejected={onRejected}
          onTimeUp={onTimeUp}
        />
      ) : null}
      {session && ended ? (
        <ControlRevokedDialog
          open={!leaving}
          modal={revocationModal(ended, current.data, session.reservation.id)}
          pending={ack.pending}
          error={ack.error}
          onAcknowledge={() => void acknowledge()}
        />
      ) : null}
    </div>
  );
}
