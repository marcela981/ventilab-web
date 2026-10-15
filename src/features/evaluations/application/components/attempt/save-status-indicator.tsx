/*
* Funcionalidad: SaveStatusIndicator
* Descripción: Autosave status of the current answer in the attempt player (pending, saving, saved, retrying when the connection fails, error when the backend rejects the answer) as a polite live region with a semantic color per state. Renders nothing before the first change. Depends on the autosave queue entity and the attempt player CSS Module.
* Versión: 1.0
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

import { cx } from "@shared/lib/class-names";
import type { AutosaveStatus } from "../../entities/autosave-queue";
import styles from "../../../UI/attempt-player.module.css";

// TODO(i18n): move to an evaluations namespace in src/i18n.
export const SAVE_STATUS_LABELS: Record<AutosaveStatus, string> = {
  pending: "Cambios sin guardar…",
  saving: "Guardando…",
  saved: "Respuesta guardada",
  retrying: "Sin conexión. Reintentando guardar tu respuesta…",
  error: "No se pudo guardar la respuesta",
};

const STATUS_CLASS: Record<AutosaveStatus, string | undefined> = {
  pending: styles.saveStatusPending,
  saving: styles.saveStatusPending,
  saved: styles.saveStatusSaved,
  retrying: styles.saveStatusWarning,
  error: styles.saveStatusError,
};

export function SaveStatusIndicator({ status }: { status: AutosaveStatus | null }) {
  return (
    <p className={cx(styles.saveStatus, status && STATUS_CLASS[status])} role="status" aria-live="polite">
      {status ? SAVE_STATUS_LABELS[status] : null}
    </p>
  );
}
