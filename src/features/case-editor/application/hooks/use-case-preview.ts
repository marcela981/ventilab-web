/*
* Funcionalidad: useCasePreview
* Descripción: Local preview of a clinical case draft (T12): runs the vendored engine in the simulation Web Worker
*   (`createSimWorker` from @shared/sim-engine; physics never runs on the main thread) on the engine case built from
*   the current draft, without creating a session or sending anything to the server, and exposes it as a ventilator
*   console adapter with live waveforms (the shared console frame hub), metrics, patient vitals with trends, alarms
*   and the case targets as normal ranges, through the same engine ↔ console binding as the simulator session. A
*   CONFIRMAR becomes a PARAM_CHANGE in the worker only after the same client validation the engine runs; the console
*   shows a setting as applied once the worker acknowledges it (a refused change shows an error), and the draft is
*   never modified. Pause, resume and restart (a new worker from the start). The state of a run is keyed by its frame
*   hub, so a new case or a restart starts clean. The worker is created inside an effect (SSR-safe), stopped and
*   terminated on unmount or when the case changes; without Worker support the status is "unsupported". The worker
*   factory is injectable for tests. Depends on React, the sim-engine runtime and console binding, and the
*   ventilator-console types.
* Versión: 1.0
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createSimWorker, EngineValidationError, resolveVentilatorSettings, validateVentilatorSettings } from "@shared/sim-engine";
import type { EngineCase, EngineMetrics, SimBatch, SimWorkerClient, VentilatorSettings } from "@shared/sim-engine";
import {
  appendTrends,
  applicabilityFor,
  buildConsoleLimits,
  createConsoleFrameHub,
  MODE_OPTIONS,
  rangesFromTargets,
  toConsoleAlarms,
  toConsoleMetrics,
  toConsoleSettings,
  toPatientValues,
  toSettingsChanges,
} from "@shared/sim-engine/console-binding";
import type { ConsoleFrameHub, PatientTrends } from "@shared/sim-engine/console-binding";
import type { ConsoleAlarm, ConsoleConfirmation, ModeParameterTable, VentilatorConsoleAdapter } from "@shared/ventilator-console";

/** Fixed seed: the same draft previews the same way every time. */
export const PREVIEW_SEED = 1;

// TODO(i18n): move to a case-editor namespace in src/i18n.
export const PREVIEW_HOOK_COPY = {
  unsupported: "Este navegador no puede ejecutar la simulación (sin soporte de Web Workers).",
  workerFailed: "La vista previa se detuvo por un error interno del motor. Reinícialo para intentarlo de nuevo.",
  timing: "No se aplicó el cambio: con esa combinación el tiempo espiratorio queda demasiado corto. Ajusta Ti, la pausa o la FR.",
  invalid: "No se aplicó el cambio: la combinación de parámetros no es válida para el motor.",
  refused: "El motor rechazó el cambio; los ajustes siguen como estaban.",
} as const;

export type PreviewStatus = "starting" | "running" | "paused" | "error" | "unsupported";

export type CasePreviewDeps = { createWorker?: () => SimWorkerClient | null };

export type UseCasePreviewResult = {
  adapter: VentilatorConsoleAdapter | null
  applicability: ModeParameterTable | undefined
  status: PreviewStatus
  simTimeMs: number
  error: string | null
  changeError: string | null
  dismissChangeError: () => void
  pause: () => void
  resume: () => void
  restart: () => void
};

type Live = { metrics: EngineMetrics | null, alarms: readonly ConsoleAlarm[], trends: PatientTrends, simTimeMs: number };

const EMPTY_LIVE: Live = { metrics: null, alarms: [], trends: {}, simTimeMs: 0 };

/** Everything one run shows; keyed by its frame hub, so a new case or a restart starts from a clean state. */
type PreviewState = {
  hub: ConsoleFrameHub | null
  applied: VentilatorSettings | null
  live: Live
  status: PreviewStatus
  error: string | null
  changeError: string | null
};

function initialState(hub: ConsoleFrameHub | null, engineCase: EngineCase | null): PreviewState {
  return {
    hub,
    applied: engineCase ? resolveVentilatorSettings(engineCase.initialSettings) : null,
    live: EMPTY_LIVE,
    status: "starting",
    error: null,
    changeError: null,
  };
}

let changeCounter = 0;

function validationMessage(applied: VentilatorSettings, changes: Partial<VentilatorSettings>): string | null {
  try {
    validateVentilatorSettings(resolveVentilatorSettings({ ...applied, ...changes }));

    return null;
  } catch (error) {
    return error instanceof EngineValidationError && error.code === "INVALID_TIMING" ? PREVIEW_HOOK_COPY.timing : PREVIEW_HOOK_COPY.invalid;
  }
}

function nextLive(current: Live, batch: SimBatch): Live {
  if (batch.metrics) {
    return {
      metrics: batch.metrics,
      alarms: toConsoleAlarms(batch.alarms, batch.simTimeMs, current.alarms),
      trends: appendTrends(current.trends, toPatientValues(batch.metrics)),
      simTimeMs: batch.simTimeMs,
    };
  }

  return current.simTimeMs === batch.simTimeMs ? current : { ...current, simTimeMs: batch.simTimeMs };
}

/** Runs the engine case in the worker while it is not null; a new case (or restart) starts a new worker. */
export function useCasePreview(engineCase: EngineCase | null, deps: CasePreviewDeps = {}): UseCasePreviewResult {
  const [run, setRun] = useState(0);
  const hub = useMemo(() => (engineCase ? createConsoleFrameHub(`case-preview:${engineCase.id}:${run}`) : null), [engineCase, run]);
  const [stored, setStored] = useState<PreviewState>(() => initialState(hub, engineCase));
  const clientRef = useRef<SimWorkerClient | null>(null);
  const pendingRef = useRef(new Map<string, Partial<VentilatorSettings>>());
  const appliedRef = useRef<VentilatorSettings | null>(null);
  // Read once: a new factory identity on a later render must not restart the preview.
  const createWorkerRef = useRef(deps.createWorker ?? createSimWorker);
  // A new run (case or restart) resets during render, before its worker reports anything.
  const state = stored.hub === hub ? stored : initialState(hub, engineCase);

  if (stored !== state) {
    setStored(state);
  }

  useEffect(() => {
    if (!engineCase || !hub) {
      return undefined;
    }

    const pending = pendingRef.current;
    const update = (change: (current: PreviewState) => PreviewState): void => {
      setStored((current) => (current.hub === hub ? change(current) : current));
    };

    appliedRef.current = resolveVentilatorSettings(engineCase.initialSettings);
    pending.clear();

    const client = createWorkerRef.current();

    if (!client) {
      const timer = setTimeout(() => update((current) => ({ ...current, status: "unsupported", error: PREVIEW_HOOK_COPY.unsupported })), 0);

      return () => clearTimeout(timer);
    }

    clientRef.current = client;

    const handleBatch = (batch: SimBatch): void => {
      hub.emit(batch);

      let applied = appliedRef.current;

      batch.confirmedEvents.forEach(({ id }) => {
        const changes = pending.get(id);

        if (changes && applied) {
          applied = { ...applied, ...changes };
          pending.delete(id);
        }
      });
      batch.rejectedEvents.forEach(({ event }) => {
        if (event.id !== undefined) {
          pending.delete(event.id);
        }
      });
      appliedRef.current = applied;

      const refused = batch.rejectedEvents.length > 0;
      const status: PreviewStatus = batch.status === "paused" || batch.status === "stopped" ? "paused" : "running";

      update((current) => ({
        ...current,
        applied,
        status,
        live: nextLive(current.live, batch),
        changeError: refused ? PREVIEW_HOOK_COPY.refused : current.changeError,
      }));
    };

    const unsubscribe = client.subscribe((message) => {
      if (message.type === "ready") {
        client.send({ type: "start" });
      } else if (message.type === "batch") {
        handleBatch(message.batch);
      } else if (message.type === "error") {
        update((current) => ({ ...current, status: "error", error: PREVIEW_HOOK_COPY.workerFailed }));
      }
    });

    client.send({ type: "init", engineCase, seed: PREVIEW_SEED, options: { engineOptions: { timeMultiplier: 1 }, multiplier: 1 } });

    return () => {
      unsubscribe();
      client.send({ type: "stop" });
      client.terminate();
      clientRef.current = null;
    };
  }, [engineCase, hub]);

  const confirm = useCallback((confirmation: ConsoleConfirmation) => {
    const current = appliedRef.current;
    const client = clientRef.current;
    const changes = toSettingsChanges(confirmation);

    if (!current || !client || Object.keys(changes).length === 0) {
      return;
    }

    const message = validationMessage(current, changes);

    if (message) {
      setStored((previous) => ({ ...previous, changeError: message }));

      return;
    }

    changeCounter += 1;

    const id = `preview-${changeCounter}`;

    pendingRef.current.set(id, changes);
    setStored((previous) => ({ ...previous, changeError: null }));
    client.send({ type: "applyEvent", event: { type: "PARAM_CHANGE", changes, id } });
  }, []);

  const pause = useCallback(() => clientRef.current?.send({ type: "pause" }), []);
  const resume = useCallback(() => clientRef.current?.send({ type: "resume" }), []);
  const restart = useCallback(() => setRun((value) => value + 1), []);
  const dismissChangeError = useCallback(() => setStored((previous) => ({ ...previous, changeError: null })), []);
  const { applied, live, status } = state;

  const adapter = useMemo<VentilatorConsoleAdapter | null>(() => {
    if (!engineCase || !hub || !applied) {
      return null;
    }

    const values = toConsoleSettings(applied);

    return {
      frames: hub.source,
      settings: { current: values, applied: values },
      mode: { current: applied.mode, options: MODE_OPTIONS },
      metrics: toConsoleMetrics(live.metrics, applied),
      patient: { values: toPatientValues(live.metrics), trends: live.trends },
      alarms: live.alarms,
      permissions: { canControl: status === "running" || status === "paused" },
      limits: buildConsoleLimits(applied),
      onConfirm: confirm,
      ranges: rangesFromTargets(engineCase.targets),
      capabilities: { maneuvers: false },
    };
  }, [applied, confirm, engineCase, hub, live, status]);

  return {
    adapter,
    applicability: applied ? applicabilityFor(applied) : undefined,
    status,
    simTimeMs: live.simTimeMs,
    error: state.error,
    changeError: state.changeError,
    dismissChangeError,
    pause,
    resume,
    restart,
  };
}
