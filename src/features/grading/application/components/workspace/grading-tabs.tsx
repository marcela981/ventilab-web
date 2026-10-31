/*
* Funcionalidad: GradingTabs
* Descripción: Tab list of the unified grading screen (Revisar, Estadísticas, Publicación masiva): role="tablist" with roving tabindex and arrow/Home/End keys (shared useTabListKeyboard), each tab controlling its panel. Depends on React, @shared/lib, the evaluation attempts entities and the grading CSS Module.
* Versión: 1.0
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

import { cx } from "@shared/lib/class-names";
import { useTabListKeyboard } from "@shared/lib/tab-list-keyboard";
import type { GradingTab } from "../../entities/evaluation-attempts.entity";
import { GRADING_TAB_LABELS, GRADING_TABS } from "../../entities/evaluation-attempts.entity";
import styles from "../../../UI/grading.module.css";

// TODO(i18n): move to a grading namespace in src/i18n.
export const GRADING_TABS_LABEL = "Secciones de la calificación";

export const gradingTabId = (tab: GradingTab): string => `grading-tab-${tab}`;
export const gradingPanelId = (tab: GradingTab): string => `grading-panel-${tab}`;

export type GradingTabsProps = {
  active: GradingTab
  onSelect: (tab: GradingTab) => void
};

export function GradingTabs({ active, onSelect }: GradingTabsProps) {
  const { onKeyDown, registerTab } = useTabListKeyboard(GRADING_TABS, active, onSelect);

  return (
    <div role="tablist" aria-label={GRADING_TABS_LABEL} className={cx(styles.tabList)} onKeyDown={onKeyDown}>
      {GRADING_TABS.map((tab) => (
        <button
          key={tab}
          ref={registerTab(tab)}
          type="button"
          role="tab"
          id={gradingTabId(tab)}
          aria-selected={tab === active}
          aria-controls={gradingPanelId(tab)}
          tabIndex={tab === active ? 0 : -1}
          className={cx(styles.tab)}
          onClick={() => onSelect(tab)}
        >
          {GRADING_TAB_LABELS[tab]}
        </button>
      ))}
    </div>
  );
}
