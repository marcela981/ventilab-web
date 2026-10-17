/*
* Funcionalidad: Live console command panel
* Descripción: Panel under the live console with the outcome of the commands: the last notice (error / warning as an
*   alert with every 422 violation listed, info as a status), the reason sending is paused (a command in flight, or the
*   429 countdown), a fixed hint on what this console can command (no pressure, no PEEP under the absolute pressure limit
*   of PCV/PSV), and "Comandos recientes": the last commands of the reservation (history read merged with the live
*   statuses) with their status ("Enviando", "Esperando confirmación del equipo", "Aceptado por el equipo", "Aplicado por
*   el equipo", "Rechazado por el equipo", "Sin confirmación del equipo"), parameters in console units, reason of a
*   rejection / timeout, time and latency. Presentational. Depends on React, MUI, the shared date format helper, the
*   command entities and the CSS Module. v1.1 (T8 review fix 2, W5): «Usar los valores que informa el equipo» (with its
*   explanation) while an unreported block can be lifted. v1.2 (T8 review fix 3, W1): the notice right above the
*   button names each accepted value the device does not report and what the next command would send (built by the
*   hook); the hint says that a later change keeping a value different from an accepted one must be repeated to be sent.
* Versión: 1.2
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

import Button from "@mui/material/Button";
import { useId } from "react";
import { cx } from "@shared/lib/class-names";
import { formatDateTime } from "@shared/lib/format";
import { commandOutcomeReason, commandStatusLabel } from "../entities/command-messages";
import type { CommandNotice, RecentCommandItem } from "../entities/command-state";
import styles from "../../UI/lab-commands.module.css";

// TODO(i18n): move to a ventilator-lab namespace in src/i18n.
export const COMMAND_PANEL_COPY = {
  title: "Comandos recientes",
  loading: "Cargando los comandos…",
  failed: "No se pudieron cargar los comandos recientes.",
  empty: "Todavía no se enviaron comandos en esta reserva.",
  hint: "Los valores de la consola son los que informa el equipo: un cambio confirmado se ve cuando el equipo lo informa. En PCV y PSV la presión y la PEEP no se ajustan desde esta consola (la presión límite del equipo es absoluta).",
  latency: (ms: number) => `${ms} ms`,
  useReported: "Usar los valores que informa el equipo",
  useReportedHint: "Si el equipo aplicó otro valor (o lo cambiaron en el equipo), puedes seguir: el próximo cambio se arma con los valores que la consola muestra, que son los que informa el equipo (arriba, cada valor aceptado y lo que se enviaría). Si un cambio mantiene un valor distinto del aceptado, no se envía hasta que lo repitas.",
} as const;

export type CommandPanelProps = {
  notice: CommandNotice | null
  busyReason: string | null
  recent: readonly RecentCommandItem[]
  recentLoading: boolean
  recentFailed: boolean
  /** W5: given only while an unreported block can be lifted. */
  onUseReported?: () => void
};

function NoticeView({ notice }: { notice: CommandNotice }) {
  return (
    <div className={cx(styles.notice)} data-tone={notice.tone} role={notice.tone === "info" ? "status" : "alert"}>
      <p className={cx(styles.noticeText)}>{notice.message}</p>
      {notice.details.length > 0 ? (
        <ul className={cx(styles.noticeDetails)}>
          {notice.details.map((detail) => <li key={detail}>{detail}</li>)}
        </ul>
      ) : null}
    </div>
  );
}

function reasonOf(item: RecentCommandItem): string | null {
  return item.status === "REJECTED" || item.status === "TIMEOUT" ? commandOutcomeReason(item.status, item.reason) : null;
}

export function CommandPanel({ notice, busyReason, recent, recentLoading, recentFailed, onUseReported }: CommandPanelProps) {
  const titleId = useId();

  return (
    <section className={cx(styles.panel)} aria-labelledby={titleId} data-testid="lab-command-panel">
      {notice ? <NoticeView notice={notice} /> : null}
      {busyReason ? <p className={cx(styles.busy)} role="status">{busyReason}</p> : null}
      {onUseReported ? (
        <div className={cx(styles.useReported)}>
          <p className={cx(styles.hint)}>{COMMAND_PANEL_COPY.useReportedHint}</p>
          <Button variant="outlined" size="small" onClick={onUseReported}>{COMMAND_PANEL_COPY.useReported}</Button>
        </div>
      ) : null}
      <p className={cx(styles.hint)}>{COMMAND_PANEL_COPY.hint}</p>
      <h2 id={titleId} className={cx(styles.title)}>{COMMAND_PANEL_COPY.title}</h2>
      {recentLoading ? <p className={cx(styles.muted)}>{COMMAND_PANEL_COPY.loading}</p> : null}
      {recentFailed && recent.length === 0 ? <p className={cx(styles.muted)}>{COMMAND_PANEL_COPY.failed}</p> : null}
      {!recentLoading && !recentFailed && recent.length === 0 ? <p className={cx(styles.muted)}>{COMMAND_PANEL_COPY.empty}</p> : null}
      {recent.length > 0 ? (
        <ol className={cx(styles.list)}>
          {recent.map((item) => {
            const reason = reasonOf(item);

            return (
              <li key={item.id} className={cx(styles.item)} data-command-id={item.id}>
                <span className={cx(styles.status)} data-status={item.status}>{commandStatusLabel(item.status)}</span>
                <span className={cx(styles.summary)}>{item.summary}</span>
                {reason ? <span className={cx(styles.reason)}>{reason}</span> : null}
                {item.createdAt || item.latencyMs !== null ? (
                  <span className={cx(styles.meta)}>
                    {[item.createdAt ? formatDateTime(item.createdAt) : null, item.latencyMs !== null ? COMMAND_PANEL_COPY.latency(item.latencyMs) : null]
                      .filter(Boolean)
                      .join(" · ")}
                  </span>
                ) : null}
              </li>
            );
          })}
        </ol>
      ) : null}
    </section>
  );
}
