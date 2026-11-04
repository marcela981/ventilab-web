/*
* Funcionalidad: AdminUsersTabs
* Descripción: Tab list of /admin/users ("Gestión de roles" and "Profesores"): role="tablist" with roving tabindex and arrow/Home/End keys (shared useTabListKeyboard), each tab controlling its panel. Presentational. Depends on @shared/lib, the admin users entity and CSS Module.
* Versión: 1.0
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

import { cx } from "@shared/lib/class-names";
import { useTabListKeyboard } from "@shared/lib/tab-list-keyboard";
import { ADMIN_USERS_TAB_LABELS, ADMIN_USERS_TABS } from "../entities/admin-users.entity";
import type { AdminUsersTab } from "../entities/admin-users.entity";
import styles from "../../UI/admin-users.module.css";

// TODO(i18n): move to an admin-console namespace in src/i18n.
export const ADMIN_USERS_TABS_COPY = { label: "Secciones de administración de usuarios" } as const;

export const adminUsersTabId = (tab: AdminUsersTab): string => `admin-users-tab-${tab}`;
export const adminUsersPanelId = (tab: AdminUsersTab): string => `admin-users-panel-${tab}`;

export type AdminUsersTabsProps = {
  active: AdminUsersTab
  onSelect: (tab: AdminUsersTab) => void
};

export function AdminUsersTabs({ active, onSelect }: AdminUsersTabsProps) {
  const { onKeyDown, registerTab } = useTabListKeyboard(ADMIN_USERS_TABS, active, onSelect);

  return (
    <div role="tablist" aria-label={ADMIN_USERS_TABS_COPY.label} className={cx(styles.tabList)} onKeyDown={onKeyDown}>
      {ADMIN_USERS_TABS.map((tab) => (
        <button
          key={tab}
          ref={registerTab(tab)}
          type="button"
          role="tab"
          id={adminUsersTabId(tab)}
          aria-selected={tab === active}
          aria-controls={adminUsersPanelId(tab)}
          tabIndex={tab === active ? 0 : -1}
          className={cx(styles.tab)}
          onClick={() => onSelect(tab)}
        >
          {ADMIN_USERS_TAB_LABELS[tab]}
        </button>
      ))}
    </div>
  );
}
