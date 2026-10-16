/*
* Funcionalidad: SimulatorCatalogPage
* Descripción: /simulator screen for every authenticated role. Tab "Casos clínicos": the published clinical cases as a card grid with server-side pathology/difficulty filters, a pager, and "Iniciar práctica" per card (creates a FREE session and opens its console). Tab "Mis sesiones": the user's session history (mounted on the first visit of the tab, so its requests run on demand). Loading, error with retry and empty states (with a filter hint) follow the other features. v1.1: both tab panels are always rendered with the inactive one `hidden` (every aria-controls resolves) and the history stays mounted after its first visit, so switching tabs keeps its page; the card passes the chosen time multiplier to the start; the empty copy says no case is published yet. Depends on MUI Tabs and Pagination, next/head, the design-system states, the catalog components, the session history and the simulator hooks and styles.
* Versión: 1.1
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

import MonitorHeartIcon from "@mui/icons-material/MonitorHeart";
import Pagination from "@mui/material/Pagination";
import Tab from "@mui/material/Tab";
import Tabs from "@mui/material/Tabs";
import Head from "next/head";
import { useId, useState } from "react";
import { EmptyState } from "@shared/design-system/components/empty-state";
import { ErrorState } from "@shared/design-system/components/error-state";
import { PageHeader } from "@shared/design-system/components/page-header";
import { CardSkeleton } from "@shared/design-system/components/skeleton";
import { cx } from "@shared/lib/class-names";
import { CaseCard } from "../components/case-card";
import { CatalogFilters } from "../components/catalog-filters";
import { SessionHistory } from "../components/session-history";
import { hasCatalogFilters } from "../entities/simulator.entity";
import { getSimulatorErrorMessage } from "../entities/simulator-error-messages";
import { useCaseCatalog } from "../hooks/use-case-catalog";
import { useStartPractice } from "../hooks/use-start-practice";
import styles from "../../UI/simulator.module.css";

// TODO(i18n): move to a simulator namespace in src/i18n.
export const CATALOG_PAGE_COPY = {
  documentTitle: "Simulador | VentyLab",
  title: "Simulador",
  subtitle: "Practica la ventilación mecánica con casos clínicos simulados.",
  tabsLabel: "Secciones del simulador",
  catalogTab: "Casos clínicos",
  historyTab: "Mis sesiones",
  listLabel: "Casos clínicos disponibles",
  loading: "Cargando casos clínicos…",
  loadErrorTitle: "No se pudieron cargar los casos clínicos",
  empty: "Todavía no hay casos clínicos publicados.",
  emptyHint: "Los casos aparecerán aquí cuando un docente los publique.",
  emptyFiltered: "Ningún caso coincide con los filtros.",
  emptyFilteredHint: "Prueba con otra patología o dificultad.",
  pager: "Páginas del catálogo",
} as const;

type SimulatorTab = "catalog" | "history";

function CatalogPanel() {
  const { cases, filters, setFilters, page, setPage, pagination, isLoading, error, reload } = useCaseCatalog();
  const practice = useStartPractice();
  const pages = pagination?.pages ?? 1;
  const filtered = hasCatalogFilters(filters);

  return (
    <div className={cx(styles.panel)}>
      <CatalogFilters filters={filters} onChange={setFilters} />
      {!cases && isLoading ? <CardSkeleton label={CATALOG_PAGE_COPY.loading} /> : null}
      {!cases && !isLoading && error ? (
        <ErrorState
          title={CATALOG_PAGE_COPY.loadErrorTitle}
          description={getSimulatorErrorMessage(error)}
          onRetry={() => void reload()}
        />
      ) : null}
      {cases && cases.length === 0 ? (
        <EmptyState
          icon={<MonitorHeartIcon />}
          title={filtered ? CATALOG_PAGE_COPY.emptyFiltered : CATALOG_PAGE_COPY.empty}
          description={filtered ? CATALOG_PAGE_COPY.emptyFilteredHint : CATALOG_PAGE_COPY.emptyHint}
        />
      ) : null}
      {cases && cases.length > 0 ? (
        <ul className={cx(styles.grid)} aria-label={CATALOG_PAGE_COPY.listLabel}>
          {cases.map((clinicalCase) => (
            <li key={clinicalCase.id}>
              <CaseCard
                clinicalCase={clinicalCase}
                pending={practice.pendingCaseId === clinicalCase.id}
                disabled={practice.pendingCaseId !== null && practice.pendingCaseId !== clinicalCase.id}
                error={practice.error?.caseId === clinicalCase.id ? practice.error.message : null}
                onStart={(caseId, timeMultiplier) => void practice.start(caseId, timeMultiplier)}
              />
            </li>
          ))}
        </ul>
      ) : null}
      {pages > 1 ? (
        <Pagination
          count={pages}
          page={Math.min(page, pages)}
          onChange={(_event, next) => setPage(next)}
          className={cx(styles.pager)}
          aria-label={CATALOG_PAGE_COPY.pager}
        />
      ) : null}
    </div>
  );
}

export function SimulatorCatalogPage() {
  const [tab, setTab] = useState<SimulatorTab>("catalog");
  const [historyVisited, setHistoryVisited] = useState(false);

  if (tab === "history" && !historyVisited) {
    setHistoryVisited(true);
  }
  const baseId = useId();
  const tabId = (value: SimulatorTab) => `${baseId}-tab-${value}`;
  const panelId = (value: SimulatorTab) => `${baseId}-panel-${value}`;

  return (
    <div className={cx(styles.page)}>
      <Head>
        <title>{CATALOG_PAGE_COPY.documentTitle}</title>
      </Head>
      <PageHeader title={CATALOG_PAGE_COPY.title} subtitle={CATALOG_PAGE_COPY.subtitle} />
      <Tabs value={tab} onChange={(_event, value: SimulatorTab) => setTab(value)} aria-label={CATALOG_PAGE_COPY.tabsLabel}>
        <Tab value="catalog" label={CATALOG_PAGE_COPY.catalogTab} id={tabId("catalog")} aria-controls={panelId("catalog")} />
        <Tab value="history" label={CATALOG_PAGE_COPY.historyTab} id={tabId("history")} aria-controls={panelId("history")} />
      </Tabs>
      {/* Both panels are always rendered (every aria-controls resolves) and the inactive one is hidden; the history
          mounts on its first visit (requests on demand) and then stays mounted, so it keeps its page. */}
      <div role="tabpanel" id={panelId("catalog")} aria-labelledby={tabId("catalog")} hidden={tab !== "catalog"}>
        <CatalogPanel />
      </div>
      <div role="tabpanel" id={panelId("history")} aria-labelledby={tabId("history")} hidden={tab !== "history"}>
        {historyVisited ? <SessionHistory /> : null}
      </div>
    </div>
  );
}
