/*
* Funcionalidad: Workspace bottom tabs
* Descripción: Fixed bottom navigation of the /simulador workspace with the July tabs and order (FLUJOS_JULIO a.1):
*   Simular Paciente, Monitoreo, Conexión, plus Mis sesiones (DISENO_BLOQUE1 §3). An accessible tab list (role
*   tablist/tab, aria-selected, aria-controls pointing at each panel, roving tabindex with the arrow, Home and End
*   keys). Depends on React, MUI icons, the workspace tab entity and the workspace styles.
* Versión: 0.1
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

import HistoryIcon from "@mui/icons-material/History";
import MonitorHeartIcon from "@mui/icons-material/MonitorHeart";
import PersonIcon from "@mui/icons-material/Person";
import WifiIcon from "@mui/icons-material/Wifi";
import { useRef } from "react";
import type { KeyboardEvent, ReactNode } from "react";
import { cx } from "@shared/lib/class-names";
import { WORKSPACE_TABS } from "../entities/workspace-tab.entity";
import type { WorkspaceTab } from "../entities/workspace-tab.entity";
import styles from "../../UI/simulator-workspace.module.css";

// TODO(i18n): move to a simulator namespace in src/i18n.
export const BOTTOM_TABS_COPY = {
  label: "Secciones del simulador",
  tabs: {
    simular: "Simular Paciente",
    monitoreo: "Monitoreo",
    conexion: "Conexión",
    sesiones: "Mis sesiones",
  } satisfies Record<WorkspaceTab, string>,
} as const;

const TAB_ICONS: Record<WorkspaceTab, ReactNode> = {
  simular: <PersonIcon aria-hidden="true" />,
  monitoreo: <MonitorHeartIcon aria-hidden="true" />,
  conexion: <WifiIcon aria-hidden="true" />,
  sesiones: <HistoryIcon aria-hidden="true" />,
};

export const workspaceTabId = (tab: WorkspaceTab): string => `workspace-tab-${tab}`;
export const workspacePanelId = (tab: WorkspaceTab): string => `workspace-panel-${tab}`;

export type BottomTabsProps = {
  active: WorkspaceTab
  onSelect: (tab: WorkspaceTab) => void
};

export function BottomTabs({ active, onSelect }: BottomTabsProps) {
  const buttons = useRef<Partial<Record<WorkspaceTab, HTMLButtonElement | null>>>({});

  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>): void => {
    const index = WORKSPACE_TABS.indexOf(active);
    const last = WORKSPACE_TABS.length - 1;
    const targets: Record<string, number> = {
      ArrowRight: index === last ? 0 : index + 1,
      ArrowLeft: index === 0 ? last : index - 1,
      Home: 0,
      End: last,
    };
    const target = targets[event.key];

    if (target === undefined) {
      return;
    }

    event.preventDefault();

    const next = WORKSPACE_TABS[target];

    if (next) {
      onSelect(next);
      buttons.current[next]?.focus();
    }
  };

  return (
    <nav className={cx(styles.bottomTabs)} aria-label={BOTTOM_TABS_COPY.label}>
      <div role="tablist" aria-label={BOTTOM_TABS_COPY.label} className={cx(styles.tabList)} onKeyDown={onKeyDown}>
        {WORKSPACE_TABS.map((tab) => (
          <button
            key={tab}
            ref={(element) => {
              buttons.current[tab] = element;
            }}
            type="button"
            role="tab"
            id={workspaceTabId(tab)}
            aria-selected={tab === active}
            aria-controls={workspacePanelId(tab)}
            tabIndex={tab === active ? 0 : -1}
            className={cx(styles.tab)}
            onClick={() => onSelect(tab)}
          >
            {TAB_ICONS[tab]}
            <span>{BOTTOM_TABS_COPY.tabs[tab]}</span>
          </button>
        ))}
      </div>
    </nav>
  );
}
