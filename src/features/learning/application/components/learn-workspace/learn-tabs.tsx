/*
* Funcionalidad: Learn workspace tabs
* Descripción: Top tab list of the /learn workspace (W3, Bloque 2): Inicio, Currículo and Mi Progreso, in the July order (TeachingTabs). An accessible tab list (role tablist/tab, aria-selected, aria-controls pointing at each panel, roving tabindex with the arrow, Home and End keys through the shared useTabListKeyboard). Only the tabs of the role are listed (staff never get this list: they only see Currículo). Depends on React, MUI icons, @shared/lib/tab-list-keyboard, the learn tab entity and the workspace styles.
* Versión: 0.1
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

import HomeIcon from "@mui/icons-material/Home";
import InsightsIcon from "@mui/icons-material/Insights";
import MenuBookIcon from "@mui/icons-material/MenuBook";
import type { ReactNode } from "react";
import { cx } from "@shared/lib/class-names";
import { useTabListKeyboard } from "@shared/lib/tab-list-keyboard";
import type { LearnTab } from "../../entities/learn-tab.entity";
import styles from "../../../UI/learn-workspace.module.css";

// TODO(i18n): move to a learning namespace in src/i18n.
export const LEARN_TABS_COPY = {
  label: "Secciones de Aprender",
  tabs: {
    inicio: "Inicio",
    curriculo: "Currículo",
    progreso: "Mi Progreso",
  } satisfies Record<LearnTab, string>,
} as const;

const TAB_ICONS: Record<LearnTab, ReactNode> = {
  inicio: <HomeIcon fontSize="small" aria-hidden="true" />,
  curriculo: <MenuBookIcon fontSize="small" aria-hidden="true" />,
  progreso: <InsightsIcon fontSize="small" aria-hidden="true" />,
};

export const learnTabId = (tab: LearnTab): string => `learn-tab-${tab}`;
export const learnPanelId = (tab: LearnTab): string => `learn-panel-${tab}`;

export type LearnTabsProps = {
  tabs: readonly LearnTab[]
  active: LearnTab
  onSelect: (tab: LearnTab) => void
};

export function LearnTabs({ tabs, active, onSelect }: LearnTabsProps) {
  const { onKeyDown, registerTab } = useTabListKeyboard(tabs, active, onSelect);

  return (
    <div role="tablist" aria-label={LEARN_TABS_COPY.label} className={cx(styles.tabList)} onKeyDown={onKeyDown}>
      {tabs.map((tab) => (
        <button
          key={tab}
          ref={registerTab(tab)}
          type="button"
          role="tab"
          id={learnTabId(tab)}
          aria-selected={tab === active}
          aria-controls={learnPanelId(tab)}
          tabIndex={tab === active ? 0 : -1}
          className={cx(styles.tab)}
          onClick={() => onSelect(tab)}
        >
          {TAB_ICONS[tab]}
          <span>{LEARN_TABS_COPY.tabs[tab]}</span>
        </button>
      ))}
    </div>
  );
}
