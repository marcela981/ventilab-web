/*
* Funcionalidad: Lesson side panel
* Descripción: Side panel of the lesson viewer with three MUI tabs "Notas | Profundizar | Preguntas". The tab bodies are slots (`notes`, `deepen`, `questions`) so the L4-L6 panels plug in without touching this component; a missing slot shows a placeholder. On desktop it is an aside that can be collapsed/expanded (state persisted per viewer in localStorage, see useSidePanelState). On mobile (below the MUI `md` breakpoint) it becomes a bottom sheet (MUI Drawer anchor="bottom") opened by a button. Tab panels stay mounted only while their tab is selected. Depends on MUI (Tabs, Drawer, Button, IconButton, useMediaQuery, theme), useSidePanelState and the viewer CSS Module.
* Versión: 1.0
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

import ChevronLeftIcon from "@mui/icons-material/ChevronLeft";
import ChevronRightIcon from "@mui/icons-material/ChevronRight";
import CloseIcon from "@mui/icons-material/Close";
import Button from "@mui/material/Button";
import Drawer from "@mui/material/Drawer";
import IconButton from "@mui/material/IconButton";
import { useTheme } from "@mui/material/styles";
import Tab from "@mui/material/Tab";
import Tabs from "@mui/material/Tabs";
import useMediaQuery from "@mui/material/useMediaQuery";
import { useId, useState } from "react";
import type { ReactNode } from "react";
import { cx } from "@shared/lib/class-names";
import { useSidePanelState } from "../hooks/use-side-panel-state";
import styles from "../../UI/lesson-viewer.module.css";

// TODO(i18n): move to a learning namespace in src/i18n.
const COPY = {
  label: "Panel de la lección",
  tabs: "Herramientas de la lección",
  collapse: "Ocultar panel",
  expand: "Mostrar panel",
  open: "Notas, profundizar y preguntas",
  close: "Cerrar panel",
  placeholder: "Disponible próximamente.",
} as const;

export type SidePanelTab = "notes" | "deepen" | "questions";

const TABS: { id: SidePanelTab, label: string }[] = [
  { id: "notes", label: "Notas" },
  { id: "deepen", label: "Profundizar" },
  { id: "questions", label: "Preguntas" },
];

export type LessonSidePanelSlots = {
  notes?: ReactNode
  deepen?: ReactNode
  questions?: ReactNode
};

export type LessonSidePanelProps = LessonSidePanelSlots & {
  className?: string
};

function PanelTabs({ slots }: { slots: LessonSidePanelSlots }) {
  const [tab, setTab] = useState<SidePanelTab>("notes");
  const baseId = useId();
  const body = slots[tab] ?? <p className={cx(styles.panelPlaceholder)}>{COPY.placeholder}</p>;

  return (
    <>
      <Tabs value={tab} onChange={(_, value: SidePanelTab) => setTab(value)} aria-label={COPY.tabs} variant="fullWidth">
        {TABS.map((item) => (
          <Tab
            key={item.id}
            value={item.id}
            label={item.label}
            id={`${baseId}-tab-${item.id}`}
            aria-controls={`${baseId}-panel-${item.id}`}
          />
        ))}
      </Tabs>
      <div
        role="tabpanel"
        id={`${baseId}-panel-${tab}`}
        aria-labelledby={`${baseId}-tab-${tab}`}
        className={cx(styles.panelBody)}
      >
        {body}
      </div>
    </>
  );
}

export function LessonSidePanel({ notes, deepen, questions, className }: LessonSidePanelProps) {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("md"));
  const { collapsed, toggle } = useSidePanelState();
  const [sheetOpen, setSheetOpen] = useState(false);
  const slots: LessonSidePanelSlots = { notes, deepen, questions };

  if (isMobile) {
    return (
      <>
        <Button variant="outlined" onClick={() => setSheetOpen(true)} className={cx(styles.sheetButton, className)}>
          {COPY.open}
        </Button>
        <Drawer anchor="bottom" open={sheetOpen} onClose={() => setSheetOpen(false)} classes={{ paper: cx(styles.sheet) }}>
          <section aria-label={COPY.label}>
            <div className={cx(styles.panelHeader)}>
              <span />
              <IconButton onClick={() => setSheetOpen(false)} aria-label={COPY.close}>
                <CloseIcon />
              </IconButton>
            </div>
            <PanelTabs slots={slots} />
          </section>
        </Drawer>
      </>
    );
  }

  return (
    <aside aria-label={COPY.label} className={cx(styles.panel, collapsed && styles.panelCollapsed, className)}>
      <div className={cx(styles.panelHeader)}>
        <IconButton onClick={toggle} aria-label={collapsed ? COPY.expand : COPY.collapse} aria-expanded={!collapsed}>
          {collapsed ? <ChevronLeftIcon /> : <ChevronRightIcon />}
        </IconButton>
      </div>
      {collapsed ? null : <PanelTabs slots={slots} />}
    </aside>
  );
}
