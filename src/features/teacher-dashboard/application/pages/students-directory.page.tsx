/*
* Funcionalidad: StudentsDirectoryPage
* Descripción: Page of /teacher/students, the students directory of the staff panel that replaces July's /panel/students (DISENO_BLOQUE4 §2.3): header "Estudiantes" with July's subtitle and the Directorio / Estadísticas tabs, kept in the URL (?tab, shallow) and kept mounted after their first visit. Directorio: server-paginated table of `GET /api/admin/students` with debounced search, column sort, "Todos" / "Mis grupos" (?page ?q ?sort ?scope), row selection and "Conformar Grupo"; Estadísticas: the four global cards of `GET /api/admin/statistics`. v1.0 (W1 Bloque 4): minimal placeholder with the page title. v1.1 (W3 Bloque 4): the directory and statistics tabs. Depends on next/head, the design-system page header and skeleton, @shared/lib tabs and the students directory components and entity.
* Versión: 1.1
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

import Head from "next/head";
import { PageHeader } from "@shared/design-system/components/page-header";
import { CardSkeleton } from "@shared/design-system/components/skeleton";
import { cx } from "@shared/lib/class-names";
import { KeptMountedTabPanels, lazyPanel } from "@shared/lib/kept-mounted-tab-panels";
import type { LazyPanel } from "@shared/lib/kept-mounted-tab-panels";
import { useUrlTab } from "@shared/lib/use-url-tab";
import { directoryPanelId, directoryTabId, DirectoryTabs } from "../components/directory/directory-tabs";
import { DEFAULT_DIRECTORY_TAB, DIRECTORY_TABS } from "../entities/students-directory.entity";
import type { DirectoryTab } from "../entities/students-directory.entity";
import styles from "../../UI/students-directory.module.css";

// TODO(i18n): move to a teacher-dashboard namespace in src/i18n.
export const STUDENTS_DIRECTORY_COPY = {
  documentTitle: "Estudiantes | VentyLab",
  title: "Estudiantes",
  subtitle: "Gestiona tu alumnado y consulta estadísticas globales.",
  loadingPanel: {
    directorio: "Cargando estudiantes…",
    estadisticas: "Cargando estadísticas…",
  } satisfies Record<DirectoryTab, string>,
} as const;

const TAB_PANELS: Record<DirectoryTab, LazyPanel> = {
  directorio: lazyPanel(() => import("../components/directory/directory-panel").then((module) => module.DirectoryPanel)),
  estadisticas: lazyPanel(() => import("../components/directory/statistics-panel").then((module) => module.StatisticsPanel)),
};

const panelFallback = (tab: DirectoryTab) => <CardSkeleton label={STUDENTS_DIRECTORY_COPY.loadingPanel[tab]} />;

export function StudentsDirectoryPage() {
  const { tab, selectTab } = useUrlTab(DIRECTORY_TABS, DEFAULT_DIRECTORY_TAB);

  return (
    <div className={cx(styles.page)}>
      <Head>
        <title>{STUDENTS_DIRECTORY_COPY.documentTitle}</title>
      </Head>
      <PageHeader title={STUDENTS_DIRECTORY_COPY.title} subtitle={STUDENTS_DIRECTORY_COPY.subtitle} />
      {tab !== null ? <DirectoryTabs active={tab} onSelect={selectTab} /> : null}
      <KeptMountedTabPanels
        tabs={DIRECTORY_TABS}
        active={tab}
        panels={TAB_PANELS}
        fallback={panelFallback}
        panelId={directoryPanelId}
        tabId={directoryTabId}
        panelClassName={cx(styles.panel)}
      />
    </div>
  );
}
