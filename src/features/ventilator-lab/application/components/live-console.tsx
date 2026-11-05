/*
* Funcionalidad: Live console
* Descripción: The shared VentilatorConsole (live variant) fed by the real-ventilator adapter (useRealConsoleAdapter: telemetry and alarm events of the joined room, reported settings, derived metrics) for one data source, the active reservation. `live` false (device without data, stale telemetry or the socket lost) shows the grey frozen curves under the overlay message and keeps the console read-only with the given reason. Loaded ONLY through the lazy boundary (lazy-live-console) so the console, the waveforms and the adapter stay in the /lab/live chunk. v1.1 (T7): `canControl` (only the operator, from the control state) enables the controls. v1.2 (T8): commands (useVentilatorCommands): the control limits (engine limits ∩ backend safety maxima), the editable parameters per mode (no pressure; no PEEP in PCV/PSV) and the mode options for the reported mode; CONFIRMAR maps the confirmation to POST /api/ventilator/commands and the per-parameter in-flight state comes from the 202 and `ventilator:command-status`; while a command is in flight or a 429 wait runs the console is read-only with that reason (one command at a time); the displayed values stay the ones the device reports. The command panel (notices, "Comandos recientes") sits under the console. Depends on React, the shared ventilator console, the real console adapter hook, the commands hook, the lab settings hook, the command panel and the CSS Module. v1.3 (T9): `pendingResetKey` drops the unconfirmed edits; with canControl false no new command is sent while an in-flight one keeps its status. v1.4 (T10): optional `header` content for the console header (the REC mark of the page). v1.5 (T8 review fix 2, W5): the operator gets «Usar los valores que informa el equipo» in the command panel while an unreported block can be lifted. v1.6 (W10, Bloque 1): optional `alarmLimits` shows the client alarm limits panel (real-alarm-limits) in the alarms bar; the console is now loaded by the real monitor of /simulador. v1.7 (Bloque 5, C8): `layout="july"` (the real monitor of Monitoreo, DISENO_BLOQUE5 §6.2 Real): the July three columns with `confirmSummary` (D19: Confirmar opens the summary of every change and only "Enviar al ventilador" sends the command; there is never a direct Real command), the host `header` (the Real strip), `leftTop`, `curvesToolbarStart`, `rightFooter` and value cards, and the command panel as the collapsed "Comandos recientes" disclosure under the curves (`curvesFooter`). `placeholder` renders while the adapter is not ready. The classic layout is unchanged. v1.8 (Ajustes A, A1): the July console now applies on its own by default; the real one keeps `applyMode="confirm"` until its own auto-send.
* Versión: 1.8
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

import type { ReactNode } from "react";
import { cx } from "@shared/lib/class-names";
import { VentilatorConsole } from "@shared/ventilator-console";
import type { ConsoleLayoutKind, MonitorCardsController } from "@shared/ventilator-console";
import { useLabSettings } from "../hooks/use-lab-settings";
import { useRealConsoleAdapter } from "../hooks/use-real-console-adapter";
import { useVentilatorCommands } from "../hooks/use-ventilator-commands";
import { CommandPanel } from "./command-panel";
import styles from "../../UI/lab-commands.module.css";

export type LiveConsoleProps = {
  /** Data source: the active reservation id. */
  sourceId: string
  live: boolean
  /** Overlay text while not live (default "Equipo sin datos"). */
  noDataMessage?: string
  readOnlyReason?: string
  /** Only the operator, and only while live (decided by the page). */
  canControl?: boolean
  /** T9: changing it drops the unconfirmed console edits (control lost, session revoked). */
  pendingResetKey?: string | number
  /** T10: content of the console header (e.g. the REC mark). */
  header?: ReactNode
  /** W10: offer the client alarm limits (AlarmLimitsPanel; the real monitor of /simulador). */
  alarmLimits?: boolean
  /** v1.7: `july` = the July Monitoreo layout with the summary before every command (D19). */
  layout?: ConsoleLayoutKind
  /** v1.7 (July): left column under the logos (mode selector, reservation status). */
  leftTop?: ReactNode
  /** v1.7 (July): first item of the curves toolbar (the signal chip). */
  curvesToolbarStart?: ReactNode
  /** v1.7 (July): bottom of the right column. */
  rightFooter?: ReactNode
  /** v1.7 (July): the value cards preference of the user. */
  cards?: MonitorCardsController | undefined
  /** v1.7: rendered while the console is loading or its adapter is not ready (e.g. the monitor top row). */
  placeholder?: ReactNode
};

export function LiveConsole({
  sourceId,
  live,
  noDataMessage,
  readOnlyReason,
  canControl = false,
  pendingResetKey,
  header,
  alarmLimits = false,
  layout = "classic",
  leftTop,
  curvesToolbarStart,
  rightFooter,
  cards,
  placeholder = null,
}: LiveConsoleProps) {
  const { settings } = useLabSettings();
  const commands = useVentilatorCommands({ reservationId: sourceId, canSend: canControl, settings });
  // One command at a time: while one is in flight (or a 429 wait runs) the operator's console is read-only.
  const busyReason = canControl ? commands.busyReason : null;
  const reason = readOnlyReason ?? busyReason ?? undefined;
  const adapter = useRealConsoleAdapter({
    sourceId,
    live,
    canControl: canControl && busyReason === null,
    limits: commands.limits,
    inFlight: commands.inFlight,
    onConfirm: commands.onConfirm,
    modeOptionsFor: commands.modeOptionsFor,
    alarmLimits,
    ...(pendingResetKey === undefined ? {} : { pendingResetKey }),
    ...(noDataMessage === undefined ? {} : { noDataMessage }),
    ...(reason === undefined ? {} : { readOnlyReason: reason }),
  });

  if (!adapter) {
    return <>{placeholder}</>;
  }

  const commandPanel = (
    <CommandPanel
      notice={commands.notice}
      busyReason={busyReason}
      recent={commands.recent}
      recentLoading={commands.recentLoading}
      recentFailed={commands.recentFailed}
      collapsible={layout === "july"}
      {...(canControl && commands.canUseReported ? { onUseReported: commands.onUseReported } : {})}
    />
  );

  if (layout === "july") {
    return (
      <VentilatorConsole
        adapter={adapter}
        variant="live"
        layout="july"
        applyMode="confirm"
        confirmSummary
        applicability={commands.applicability}
        header={header}
        leftTop={leftTop}
        curvesToolbarStart={curvesToolbarStart}
        curvesFooter={commandPanel}
        rightFooter={rightFooter}
        cards={cards}
      />
    );
  }

  return (
    <div className={cx(styles.layout)}>
      <VentilatorConsole adapter={adapter} variant="live" applicability={commands.applicability} header={header} />
      {commandPanel}
    </div>
  );
}
