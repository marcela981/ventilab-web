/*
* Funcionalidad: Live console
* Descripción: The shared VentilatorConsole (live variant) fed by the real-ventilator adapter (useRealConsoleAdapter: telemetry and alarm events of the joined room, reported settings, derived metrics) for one data source, the active reservation. `live` false (device without data, stale telemetry or the socket lost) shows the grey frozen curves under the overlay message and keeps the console read-only with the given reason. Loaded ONLY through the lazy boundary (lazy-live-console) so the console, the waveforms and the adapter stay in the /lab/live chunk. v1.1 (T7): `canControl` (only the operator, from the control state) enables the controls. v1.2 (T8): commands (useVentilatorCommands): the control limits (engine limits ∩ backend safety maxima), the editable parameters per mode (no pressure; no PEEP in PCV/PSV) and the mode options for the reported mode; CONFIRMAR maps the confirmation to POST /api/ventilator/commands and the per-parameter in-flight state comes from the 202 and `ventilator:command-status`; while a command is in flight or a 429 wait runs the console is read-only with that reason (one command at a time); the displayed values stay the ones the device reports. The command panel (notices, "Comandos recientes") sits under the console. Depends on React, the shared ventilator console, the real console adapter hook, the commands hook, the lab settings hook, the command panel and the CSS Module. v1.3 (T9): `pendingResetKey` drops the unconfirmed edits; with canControl false no new command is sent while an in-flight one keeps its status. v1.4 (T10): optional `header` content for the console header (the REC mark of the page). v1.5 (T8 review fix 2, W5): the operator gets «Usar los valores que informa el equipo» in the command panel while an unreported block can be lifted.
* Versión: 1.5
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

import type { ReactNode } from "react";
import { cx } from "@shared/lib/class-names";
import { VentilatorConsole } from "@shared/ventilator-console";
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
};

export function LiveConsole({ sourceId, live, noDataMessage, readOnlyReason, canControl = false, pendingResetKey, header }: LiveConsoleProps) {
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
    ...(pendingResetKey === undefined ? {} : { pendingResetKey }),
    ...(noDataMessage === undefined ? {} : { noDataMessage }),
    ...(reason === undefined ? {} : { readOnlyReason: reason }),
  });

  if (!adapter) {
    return null;
  }

  return (
    <div className={cx(styles.layout)}>
      <VentilatorConsole adapter={adapter} variant="live" applicability={commands.applicability} header={header} />
      <CommandPanel
        notice={commands.notice}
        busyReason={busyReason}
        recent={commands.recent}
        recentLoading={commands.recentLoading}
        recentFailed={commands.recentFailed}
        {...(canControl && commands.canUseReported ? { onUseReported: commands.onUseReported } : {})}
      />
    </div>
  );
}
