/*
* Funcionalidad: CurriculumTab
* Descripción: Currículo panel of the /learn workspace (W3, Bloque 2). v0.2 (W4, Bloque 2; DISENO_BLOQUE2 §2.4, §2.5, §2.13 and §7b decisions 2 and 3): ONE load of the curriculum tree and the progress summary (2 parallel SWR requests; no per-module request) split in the client into the three July accordions (VentyLab, Prerequisitos with the "Opcional" badge, Mecánica respiratoria open by default; one open at a time) with their level steppers and module cards. `?section=` opens the accordion it resolves to (accordion key, track, level id, section id or slug; see the curriculum view selectors) and the level anchor of the URL is scrolled into view; a later toggle wins until the URL changes again. Arrow up/down, Home and End move between the accordion triggers. Skeleton while the tree loads, error with retry (both requests); a failed progress read only warns (with retry) and the cards fall back to the tree completion. Staff: preview notice, no locks, drafts with "Borrador" and the floating "Modo edición" toggle that shows "Editar en el CMS" links. Lazy loaded by the workspace (lazyPanel). Depends on next/router, MUI, the design-system states, the learning hooks, entities, edit mode store and components, and the curriculum CSS Module.
* Versión: 0.2
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

import DevicesIcon from "@mui/icons-material/Devices";
import MenuBookIcon from "@mui/icons-material/MenuBook";
import SchoolIcon from "@mui/icons-material/School";
import Alert from "@mui/material/Alert";
import Button from "@mui/material/Button";
import { useRouter } from "next/router";
import { useMemo, useState } from "react";
import type { KeyboardEvent, ReactNode } from "react";
import { EmptyState } from "@shared/design-system/components/empty-state";
import { ErrorState } from "@shared/design-system/components/error-state";
import { ListSkeleton } from "@shared/design-system/components/skeleton";
import { cx } from "@shared/lib/class-names";
import {
  CURRICULUM_ACCORDIONS,
  DEFAULT_OPEN_ACCORDION,
  groupLevelsIntoAccordions,
  resolveAccordionKey,
} from "../../entities/curriculum-view.entity";
import type { CurriculumAccordionKey } from "../../entities/curriculum-view.entity";
import { getLearningErrorMessage } from "../../entities/learning-error-messages";
import { CURRICULUM_SECTION_PARAM } from "../../entities/learning-urls";
import { useCurriculumTree } from "../../hooks/use-curriculum-tree";
import { usePreviewMode } from "../../hooks/use-preview-mode";
import { useProgressSummary } from "../../hooks/use-progress";
import { useScrollToHash } from "../../hooks/use-scroll-to-hash";
import { useEditMode } from "../../session/edit-mode-store";
import { PreviewNotice } from "../preview-notice";
import { CurriculumAccordion } from "./curriculum-accordion";
import { EditModeFab } from "./edit-mode-fab";
import { LevelStepper } from "./level-stepper";
import styles from "../../../UI/curriculum.module.css";

// TODO(i18n): move to a learning namespace in src/i18n. Texts from July teaching.json.
export const CURRICULUM_TAB_COPY = {
  heading: "Niveles de Aprendizaje",
  sections: {
    ventylab: "Aprendizaje VentyLab",
    prerrequisitos: "Prerequisitos",
    mecanica: "Aprendizaje Mecánica respiratoria",
  } satisfies Record<CurriculumAccordionKey, string>,
  optional: "Opcional",
  empty: {
    ventylab: "No hay módulos disponibles aún.",
    prerrequisitos: "No hay módulos de prerequisitos disponibles.",
    mecanica: "No hay módulos disponibles aún.",
  } satisfies Record<CurriculumAccordionKey, string>,
  loading: "Cargando el currículo…",
  emptyTitle: "Aún no hay contenido publicado",
  emptyDescription: "Cuando haya módulos publicados, aparecerán aquí.",
  loadErrorTitle: "No se pudo cargar el currículo",
  progressError: "No se pudo cargar tu progreso.",
  retry: "Reintentar",
} as const;

const ACCORDION_ICONS: Record<CurriculumAccordionKey, ReactNode> = {
  ventylab: <DevicesIcon />,
  prerrequisitos: <SchoolIcon />,
  mecanica: <MenuBookIcon />,
};

const accordionId = (key: CurriculumAccordionKey): string => `curriculum-${key}`;

// Arrow up/down, Home and End between the accordion triggers (WAI-ARIA accordion pattern).
function moveBetweenTriggers(event: KeyboardEvent<HTMLButtonElement>): void {
  const container = event.currentTarget.closest("[data-accordion-list]");
  const triggers = container ? [...container.querySelectorAll<HTMLButtonElement>("[data-accordion-trigger]")] : [];
  const index = triggers.indexOf(event.currentTarget);
  const last = triggers.length - 1;
  const targets: Record<string, number> = {
    ArrowDown: index === last ? 0 : index + 1,
    ArrowUp: index <= 0 ? last : index - 1,
    Home: 0,
    End: last,
  };
  const target = targets[event.key];

  if (target !== undefined && triggers[target]) {
    event.preventDefault();
    triggers[target].focus();
  }
}

type Toggle = {
  // ?section= value the toggle was made under: a new URL value resets it.
  param: string | undefined
  open: CurriculumAccordionKey | null
};

export function CurriculumTab() {
  const isStaff = usePreviewMode();
  const router = useRouter();
  const { enabled: editMode } = useEditMode();
  const treeQuery = useCurriculumTree();
  const summaryQuery = useProgressSummary();
  const { tree } = treeQuery;
  const rawParam = router.isReady ? router.query[CURRICULUM_SECTION_PARAM] : undefined;
  const sectionParam = typeof rawParam === "string" ? rawParam : undefined;
  const [toggle, setToggle] = useState<Toggle | null>(null);
  const accordions = useMemo(() => (tree ? groupLevelsIntoAccordions(tree, isStaff) : null), [tree, isStaff]);
  const requested = resolveAccordionKey(sectionParam, tree) ?? DEFAULT_OPEN_ACCORDION;
  const open = toggle && toggle.param === sectionParam ? toggle.open : requested;

  useScrollToHash(tree !== null);

  if (!tree || !accordions) {
    return treeQuery.isLoading || !treeQuery.error
      ? <ListSkeleton rows={3} label={CURRICULUM_TAB_COPY.loading} />
      : (
        <ErrorState
          title={CURRICULUM_TAB_COPY.loadErrorTitle}
          description={getLearningErrorMessage(treeQuery.error)}
          onRetry={() => {
            void treeQuery.reload();
            void summaryQuery.reload();
          }}
        />
      );
  }

  if (CURRICULUM_ACCORDIONS.every((key) => accordions[key].length === 0)) {
    return <EmptyState icon={<MenuBookIcon />} title={CURRICULUM_TAB_COPY.emptyTitle} description={CURRICULUM_TAB_COPY.emptyDescription} />;
  }

  const onToggle = (key: CurriculumAccordionKey) => () => {
    setToggle({ param: sectionParam, open: open === key ? null : key });
  };

  return (
    <div className={cx(styles.curriculum)}>
      {isStaff ? <PreviewNotice /> : null}
      <h2 className={cx(styles.heading)}>{CURRICULUM_TAB_COPY.heading}</h2>
      {summaryQuery.error && !summaryQuery.isLoading ? (
        <Alert
          severity="warning"
          action={<Button color="inherit" size="small" onClick={() => void summaryQuery.reload()}>{CURRICULUM_TAB_COPY.retry}</Button>}
        >
          {CURRICULUM_TAB_COPY.progressError}
        </Alert>
      ) : null}
      <div className={cx(styles.accordions)} data-accordion-list="">
        {CURRICULUM_ACCORDIONS.map((key) => (
          <CurriculumAccordion
            key={key}
            id={accordionId(key)}
            title={CURRICULUM_TAB_COPY.sections[key]}
            icon={ACCORDION_ICONS[key]}
            badge={key === "prerrequisitos" ? CURRICULUM_TAB_COPY.optional : undefined}
            expanded={open === key}
            onToggle={onToggle(key)}
            onTriggerKeyDown={moveBetweenTriggers}
          >
            {accordions[key].length > 0 ? (
              <LevelStepper levels={accordions[key]} summary={summaryQuery.progress} isStaff={isStaff} editMode={isStaff && editMode} />
            ) : (
              <p className={cx(styles.muted)}>{CURRICULUM_TAB_COPY.empty[key]}</p>
            )}
          </CurriculumAccordion>
        ))}
      </div>
      {isStaff ? <EditModeFab /> : null}
    </div>
  );
}
