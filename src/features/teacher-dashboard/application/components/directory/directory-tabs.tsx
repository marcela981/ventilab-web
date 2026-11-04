/*
* Funcionalidad: DirectoryTabs
* Descripción: Tab list of /teacher/students (Directorio, Estadísticas; July's PanelStudents tabs): role="tablist" with roving tabindex and arrow/Home/End keys (shared useTabListKeyboard), each tab controlling its panel. The active tab lives in the URL (?tab). Depends on React, @shared/lib, the students directory entity and CSS Module.
* Versión: 1.0
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

import { cx } from "@shared/lib/class-names";
import { useTabListKeyboard } from "@shared/lib/tab-list-keyboard";
import { DIRECTORY_TAB_LABELS, DIRECTORY_TABS } from "../../entities/students-directory.entity";
import type { DirectoryTab } from "../../entities/students-directory.entity";
import styles from "../../../UI/students-directory.module.css";

// TODO(i18n): move to a teacher-dashboard namespace in src/i18n.
export const DIRECTORY_TABS_COPY = {
  label: "Secciones de Estudiantes",
} as const;

export const directoryTabId = (tab: DirectoryTab): string => `students-directory-tab-${tab}`;
export const directoryPanelId = (tab: DirectoryTab): string => `students-directory-panel-${tab}`;

export type DirectoryTabsProps = {
  active: DirectoryTab
  onSelect: (tab: DirectoryTab) => void
};

export function DirectoryTabs({ active, onSelect }: DirectoryTabsProps) {
  const { onKeyDown, registerTab } = useTabListKeyboard(DIRECTORY_TABS, active, onSelect);

  return (
    <div role="tablist" aria-label={DIRECTORY_TABS_COPY.label} className={cx(styles.tabList)} onKeyDown={onKeyDown}>
      {DIRECTORY_TABS.map((tab) => (
        <button
          key={tab}
          ref={registerTab(tab)}
          type="button"
          role="tab"
          id={directoryTabId(tab)}
          aria-selected={tab === active}
          aria-controls={directoryPanelId(tab)}
          tabIndex={tab === active ? 0 : -1}
          className={cx(styles.tab)}
          onClick={() => onSelect(tab)}
        >
          {DIRECTORY_TAB_LABELS[tab]}
        </button>
      ))}
    </div>
  );
}
