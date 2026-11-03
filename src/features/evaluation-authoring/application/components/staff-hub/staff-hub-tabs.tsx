/*
* Funcionalidad: StaffHubTabs
* Descripción: Tab list of the staff evaluation hub (Gestionar, Calificar, Resultados): role="tablist" with roving tabindex and arrow/Home/End keys (shared useTabListKeyboard), each tab controlling its panel. Calificar shows the number of attempts waiting for review as a badge (with an accessible "N pendientes" text) when it is above zero. Depends on React, MUI icons, @shared/lib, the staff hub entities and the staff hub CSS Module.
* Versión: 1.0
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

import EditNoteIcon from "@mui/icons-material/EditNote";
import GradingIcon from "@mui/icons-material/Grading";
import InsightsIcon from "@mui/icons-material/Insights";
import type { ReactNode } from "react";
import { cx } from "@shared/lib/class-names";
import { useTabListKeyboard } from "@shared/lib/tab-list-keyboard";
import type { StaffHubTab } from "../../entities/staff-hub.entity";
import { STAFF_HUB_TAB_LABELS, STAFF_HUB_TABS } from "../../entities/staff-hub.entity";
import styles from "../../../UI/staff-hub.module.css";

// TODO(i18n): move to an evaluation-authoring namespace in src/i18n.
export const STAFF_HUB_TABS_COPY = {
  label: "Secciones de Evaluación",
  pending: (count: number) => `${count} ${count === 1 ? "pendiente" : "pendientes"}`,
} as const;

const TAB_ICONS: Record<StaffHubTab, ReactNode> = {
  gestionar: <EditNoteIcon fontSize="small" aria-hidden="true" />,
  calificar: <GradingIcon fontSize="small" aria-hidden="true" />,
  resultados: <InsightsIcon fontSize="small" aria-hidden="true" />,
};

export const staffHubTabId = (tab: StaffHubTab): string => `staff-hub-tab-${tab}`;
export const staffHubPanelId = (tab: StaffHubTab): string => `staff-hub-panel-${tab}`;

export type StaffHubTabsProps = {
  active: StaffHubTab
  onSelect: (tab: StaffHubTab) => void
  pendingCount: number | null
};

export function StaffHubTabs({ active, onSelect, pendingCount }: StaffHubTabsProps) {
  const { onKeyDown, registerTab } = useTabListKeyboard(STAFF_HUB_TABS, active, onSelect);

  return (
    <div role="tablist" aria-label={STAFF_HUB_TABS_COPY.label} className={cx(styles.tabList)} onKeyDown={onKeyDown}>
      {STAFF_HUB_TABS.map((tab) => (
        <button
          key={tab}
          ref={registerTab(tab)}
          type="button"
          role="tab"
          id={staffHubTabId(tab)}
          aria-selected={tab === active}
          aria-controls={staffHubPanelId(tab)}
          tabIndex={tab === active ? 0 : -1}
          className={cx(styles.tab)}
          onClick={() => onSelect(tab)}
        >
          {TAB_ICONS[tab]}
          <span>{STAFF_HUB_TAB_LABELS[tab]}</span>
          {tab === "calificar" && pendingCount !== null && pendingCount > 0 ? (
            <span className={cx(styles.badge)}>
              <span aria-hidden="true">{pendingCount}</span>
              <span className={cx(styles.srOnly)}>{STAFF_HUB_TABS_COPY.pending(pendingCount)}</span>
            </span>
          ) : null}
        </button>
      ))}
    </div>
  );
}
