/*
* Funcionalidad: StudentDetailTabs
* Descripción: Tab list of /teacher/students/[userId]: Módulos, Evaluaciones, Simulador, Actividad and Gamificación (`role="tablist"` with roving tabindex and arrow/Home/End keys through the shared useTabListKeyboard; each tab controls its kept-mounted panel). Presentational: the page owns the URL tab (?tab=). Depends on @shared/lib, the student detail entity and routes and the student detail CSS Module.
* Versión: 1.0
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

import { cx } from "@shared/lib/class-names";
import { useTabListKeyboard } from "@shared/lib/tab-list-keyboard";
import { studentDetailPanelId, studentDetailTabId } from "../../config/student-detail.routes";
import { STUDENT_DETAIL_TAB_LABELS, STUDENT_DETAIL_TABS } from "../../entities/student-detail.entity";
import type { StudentDetailTab } from "../../entities/student-detail.entity";
import styles from "../../../UI/student-detail.module.css";

// TODO(i18n): move to a teacher-dashboard namespace in src/i18n.
export const STUDENT_DETAIL_TABS_COPY = {
  label: "Secciones del estudiante",
} as const;

export type StudentDetailTabsProps = {
  active: StudentDetailTab
  onSelect: (tab: StudentDetailTab) => void
};

export function StudentDetailTabs({ active, onSelect }: StudentDetailTabsProps) {
  const { onKeyDown, registerTab } = useTabListKeyboard(STUDENT_DETAIL_TABS, active, onSelect);

  return (
    <div role="tablist" aria-label={STUDENT_DETAIL_TABS_COPY.label} className={cx(styles.tabList)} onKeyDown={onKeyDown}>
      {STUDENT_DETAIL_TABS.map((tab) => (
        <button
          key={tab}
          ref={registerTab(tab)}
          type="button"
          role="tab"
          id={studentDetailTabId(tab)}
          aria-selected={tab === active}
          aria-controls={studentDetailPanelId(tab)}
          tabIndex={tab === active ? 0 : -1}
          className={cx(styles.tab)}
          onClick={() => onSelect(tab)}
        >
          {STUDENT_DETAIL_TAB_LABELS[tab]}
        </button>
      ))}
    </div>
  );
}
