/*
* Funcionalidad: EditModeFab
* Descripción: Floating "Modo edición" toggle of the Currículo tab for staff (W4, Bloque 2; July EditModeToggle): a round button at the bottom right (aria-pressed, July tooltips "Activar modo edición (solo profesores)" / "Desactivar modo edición") and the "MODO EDICIÓN" label while it is on. The state lives in the learning edit mode store (persisted in localStorage). Only rendered for staff by the Currículo tab. Depends on MUI (Tooltip, icons), the edit mode store and the curriculum CSS Module.
* Versión: 0.1
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

import EditIcon from "@mui/icons-material/Edit";
import EditOffIcon from "@mui/icons-material/EditOff";
import Tooltip from "@mui/material/Tooltip";
import { cx } from "@shared/lib/class-names";
import { useEditMode } from "../../session/edit-mode-store";
import styles from "../../../UI/curriculum.module.css";

// TODO(i18n): move to a learning namespace in src/i18n. Texts from July EditModeToggle.
export const EDIT_MODE_COPY = {
  label: "Modo edición",
  active: "MODO EDICIÓN",
  turnOn: "Activar modo edición (solo profesores)",
  turnOff: "Desactivar modo edición",
} as const;

export function EditModeFab() {
  const { enabled, toggle } = useEditMode();

  return (
    <div className={cx(styles.editFab)}>
      {enabled ? <span className={cx(styles.editFabLabel)} role="status">{EDIT_MODE_COPY.active}</span> : null}
      <Tooltip title={enabled ? EDIT_MODE_COPY.turnOff : EDIT_MODE_COPY.turnOn} placement="left">
        <button
          type="button"
          className={cx(styles.editFabButton)}
          aria-pressed={enabled}
          aria-label={EDIT_MODE_COPY.label}
          onClick={toggle}
        >
          {enabled ? <EditOffIcon aria-hidden="true" /> : <EditIcon aria-hidden="true" />}
        </button>
      </Tooltip>
    </div>
  );
}
