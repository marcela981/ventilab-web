/*
* Funcionalidad: useServerClockOffset / useTelemetryLatency
* Descripción: useServerClockOffset measures the server − client clock offset from the body `timestamp` of GET /api/reservations/current at the request midpoint (lab clock service, fastest of several samples): `pending` while measuring, `synced` with the offset, `unsynced` when the request fails or carries no server time. useTelemetryLatency computes the display-path latency of every `ventilator:telemetry` batch with that offset (telemetry-latency entity) into a session-wide tracker kept outside React and commits the current value and the session p95 at most every LATENCY_COMMIT_MS (no render per batch); without an offset it measures nothing (a skewed browser clock would show a false latency). A new session key (reservation) restarts the tracker. v1.1 (T6 review fix W2): an unsynced clock is measured again after CLOCK_RETRY_BASE_MS, doubling up to CLOCK_RETRY_MAX_MS, and the clock is measured again every time the socket authenticates again (after a disconnection the network path may have changed); while re-measuring the previous offset stays in use (a failed re-measure keeps it and retries with the backoff). v1.2 (T8 review fix): S4 a new socket authentication restarts the backoff (failure count reset) and the retries stop after CLOCK_MAX_ATTEMPTS failed rounds (a network path always slower than the 1 s round-trip bound would retry forever), leaving "reloj sin sincronizar" until the next authentication; S5 the session p95 deliberately includes the latency bursts after a reconnection (the backlog is part of what the operator saw). Depends on React, the shared realtime events, the lab clock service and the telemetry latency entity.
* Versión: 1.2
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

import { useEffect, useRef, useState } from "react";
import { useSocket, useSocketEvent } from "@shared/realtime";
import { fetchServerClockOffset } from "../../api/services/lab-clock.service";
import { batchLatencyMs, createLatencyTracker } from "../entities/telemetry-latency";
import type { LatencySnapshot } from "../entities/telemetry-latency";

/** Minimum interval between React commits of the latency values. */
export const LATENCY_COMMIT_MS = 500;

export type ServerClock =
  | { status: "pending", offsetMs: null }
  | { status: "synced", offsetMs: number }
  | { status: "unsynced", offsetMs: null };

const PENDING: ServerClock = { status: "pending", offsetMs: null };
const UNSYNCED: ServerClock = { status: "unsynced", offsetMs: null };

/** First wait before measuring an unsynced clock again; it doubles up to CLOCK_RETRY_MAX_MS. */
export const CLOCK_RETRY_BASE_MS = 1000;
export const CLOCK_RETRY_MAX_MS = 30_000;
/** Failed measurement rounds (each of CLOCK_SAMPLES requests) before giving up until the next socket authentication. */
export const CLOCK_MAX_ATTEMPTS = 6;

export type UseServerClockOffsetOptions = {
  /** Injected in tests; the lab clock service otherwise. */
  measure?: () => Promise<number | null>
};

const defaultMeasure = () => fetchServerClockOffset();

export function useServerClockOffset({ measure = defaultMeasure }: UseServerClockOffsetOptions = {}): ServerClock {
  const { status: realtimeStatus } = useSocket();
  const [clock, setClock] = useState<ServerClock>(PENDING);
  // Each value starts one measurement; bumped by a retry or by a new socket authentication (`fresh`: restart backoff).
  const [round, setRound] = useState<{ count: number, fresh: boolean }>({ count: 0, fresh: true });
  const [seenStatus, setSeenStatus] = useState(realtimeStatus);
  const failuresRef = useRef(0);
  const measureRef = useRef(measure);

  useEffect(() => {
    measureRef.current = measure;
  });

  // A new authenticated connection (not the first render) measures again from a fresh backoff.
  if (seenStatus !== realtimeStatus) {
    setSeenStatus(realtimeStatus);

    if (realtimeStatus === "authenticated") {
      setRound((value) => ({ count: value.count + 1, fresh: true }));
    }
  }

  useEffect(() => {
    let cancelled = false;
    let retryTimer: ReturnType<typeof setTimeout> | null = null;

    if (round.fresh) {
      failuresRef.current = 0;
    }

    const failed = () => {
      if (cancelled) {
        return;
      }

      // A previous offset stays in use; only a clock never synced shows "unsynced".
      setClock((previous) => (previous.status === "synced" ? previous : UNSYNCED));
      const wait = Math.min(CLOCK_RETRY_MAX_MS, CLOCK_RETRY_BASE_MS * 2 ** failuresRef.current);

      failuresRef.current += 1;

      // S4: a network path always slower than the round-trip bound would retry forever; give up until re-auth.
      if (failuresRef.current < CLOCK_MAX_ATTEMPTS) {
        retryTimer = setTimeout(() => setRound((value) => ({ count: value.count + 1, fresh: false })), wait);
      }
    };

    measureRef.current().then(
      (offsetMs) => {
        if (offsetMs === null) {
          failed();
        } else if (!cancelled) {
          failuresRef.current = 0;
          setClock({ status: "synced", offsetMs });
        }
      },
      failed,
    );

    return () => {
      cancelled = true;

      if (retryTimer !== null) {
        clearTimeout(retryTimer);
      }
    };
  }, [round]);

  return clock;
}

const EMPTY: LatencySnapshot = { currentMs: null, p95Ms: null, count: 0 };

type KeyedSnapshot = { sessionKey: string | null, snapshot: LatencySnapshot };

export function useTelemetryLatency(offsetMs: number | null, sessionKey: string | null): LatencySnapshot {
  // A new session (reservation) restarts the tracker.
  const [entry, setEntry] = useState(() => ({ sessionKey, tracker: createLatencyTracker() }));

  if (entry.sessionKey !== sessionKey) {
    setEntry({ sessionKey, tracker: createLatencyTracker() });
  }

  const { tracker } = entry;
  const dirtyRef = useRef(false);
  const [state, setState] = useState<KeyedSnapshot>({ sessionKey, snapshot: EMPTY });

  useSocketEvent("ventilator:telemetry", (batch) => {
    if (offsetMs === null) {
      return;
    }

    const latency = batchLatencyMs(batch.serverTs, Date.now(), offsetMs);

    if (latency !== null) {
      tracker.push(latency);
      dirtyRef.current = true;
    }
  });

  useEffect(() => {
    const timer = setInterval(() => {
      if (dirtyRef.current) {
        dirtyRef.current = false;
        setState({ sessionKey, snapshot: tracker.snapshot() });
      }
    }, LATENCY_COMMIT_MS);

    return () => clearInterval(timer);
  }, [tracker, sessionKey]);

  return state.sessionKey === sessionKey ? state.snapshot : EMPTY;
}
