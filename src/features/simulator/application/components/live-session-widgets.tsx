/*
* Funcionalidad: Live session widgets
* Descripción: Session-bar and side widgets connected to the running session store (W2, Bloque 1): each one reads only
*   its slice with useSyncExternalStore, so the session page never re-renders per tick. SessionTimeControls shows the
*   simulated clock at whole-second resolution (one re-render per displayed second, not per snapshot); LiveCasePanel
*   rebuilds the live objectives only when the engine target statuses change; SessionAssistSlot renders a host assist
*   slot with the current simulated time. Depends on React, the session store hook and the simulator components.
* Versión: 0.1
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

import { memo, useMemo } from "react";
import type { ReactNode } from "react";
import type { EngineCase, TargetStatus } from "@shared/sim-engine";
import { sameData } from "@shared/ventilator-console";
import { useSimSessionSlice } from "../hooks/use-sim-session";
import type { SimSessionSnapshot, SimSessionStore } from "../hooks/use-sim-session";
import { buildObjectives } from "../session/sim-console-adapter";
import { CasePanel } from "./case-panel";
import { TimeControls } from "./time-controls";
import type { TimeControlsProps } from "./time-controls";

const MS_PER_SECOND = 1000;

/** The clock as shown (whole seconds): snapshots within the same second do not re-render the controls. */
const selectClockSeconds = (snapshot: SimSessionSnapshot): number => Math.floor(Math.max(0, snapshot.simTimeMs) / MS_PER_SECOND);
const selectSimTimeMs = (snapshot: SimSessionSnapshot): number => snapshot.simTimeMs;
const selectTargets = (snapshot: SimSessionSnapshot): readonly TargetStatus[] | null => snapshot.metrics?.targets ?? null;

export type SessionTimeControlsProps = Omit<TimeControlsProps, "simTimeMs"> & { store: SimSessionStore };

export const SessionTimeControls = memo(function SessionTimeControls({ store, ...props }: SessionTimeControlsProps) {
  const seconds = useSimSessionSlice(store, selectClockSeconds);

  return <TimeControls {...props} simTimeMs={seconds * MS_PER_SECOND} />;
});

export type LiveCasePanelProps = {
  store: SimSessionStore
  caseId: string
  engineCase: EngineCase
};

export const LiveCasePanel = memo(function LiveCasePanel({ store, caseId, engineCase }: LiveCasePanelProps) {
  const statuses = useSimSessionSlice(store, selectTargets, sameData);
  const objectives = useMemo(() => buildObjectives(engineCase.targets, statuses), [engineCase.targets, statuses]);

  return <CasePanel caseId={caseId} engineCase={engineCase} objectives={objectives} />;
});

export type SessionAssistSlotProps = {
  store: SimSessionStore
  render: (simTimeMs: number) => ReactNode
};

/** A host-provided assist slot that needs the simulated time: only this slot follows the clock. */
export const SessionAssistSlot = memo(function SessionAssistSlot({ store, render }: SessionAssistSlotProps) {
  const simTimeMs = useSimSessionSlice(store, selectSimTimeMs);

  return <>{render(simTimeMs)}</>;
});
