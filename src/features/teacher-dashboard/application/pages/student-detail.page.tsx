/*
* Funcionalidad: StudentDetailPage
* Descripción: Page /teacher/students/[userId] (TEACHER, ADMIN; DISENO_BLOQUE4 §2.4, July PanelStudentDetail with real data): header from `GET /api/users/students/{id}` (name, email, avatar, last access; a 403 `groups.student_out_of_scope` becomes the no-access state, a 404 the not-found state), the student code and active groups of the same profile, the overall progress and the cards "Módulos completados", "Evaluaciones aprobadas" x/y (hidden without published grades) and "Sesiones de simulador" ("Tiempo de estudio" is not shown: no real data). After the session check the header reads run in parallel (profile, progress summary, curriculum titles, published grades and the first page of simulation sessions, the last two shared by SWR key with their tabs); no read waits for another one. Tabs ?tab=modulos|evaluaciones|simulador|actividad|gamificacion (shared useUrlTab, default modulos) with kept-mounted lazy panels: each tab requests its own data on its first visit. Back link: /teacher/students when ?from=directory, otherwise the teacher dashboard (Grupo tab of ?groupId). The student's personal notes and AI conversations are never read. v1.1 (closure B2): the grades no longer depend on the group the page was opened from. v2.0 (W4 Bloque 4): tabs, avatar, code, groups, summary cards, Simulador with real ventilator recordings, Gamificación and the directory back link. v2.1 (Bloque 4 integration): the code and groups come with the profile (no directory lookup); the origin is read with readStudentDetailOrigin. Depends on next/head, next/link, next/router, the design-system states, @shared/lib, the teacher dashboard hooks, components, entities, routes and CSS Modules. v2.2 (ajustes D2): "Agregar a grupo" in the header opens the existing-group dialog for this student.
* Versión: 2.2
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

import Head from "next/head";
import Link from "next/link";
import { useRouter } from "next/router";
import PersonAddIcon from "@mui/icons-material/PersonAdd";
import Button from "@mui/material/Button";
import { useMemo, useState } from "react";
import { ErrorState } from "@shared/design-system/components/error-state";
import { PageHeader } from "@shared/design-system/components/page-header";
import { CardSkeleton, ListSkeleton } from "@shared/design-system/components/skeleton";
import { toApiError } from "@shared/api-client/api-error";
import { cx } from "@shared/lib/class-names";
import { KeptMountedTabPanels, lazyPanel } from "@shared/lib/kept-mounted-tab-panels";
import type { LazyPanel } from "@shared/lib/kept-mounted-tab-panels";
import { useUrlTab } from "@shared/lib/use-url-tab";
import { StudentDetailContext } from "../components/detail/student-detail-context";
import { AddToGroupDialog } from "../components/directory/add-to-group-dialog";
import type { StudentDetailContextValue } from "../components/detail/student-detail-context";
import { StudentDetailHeader } from "../components/detail/student-detail-header";
import { StudentDetailTabs } from "../components/detail/student-detail-tabs";
import { buildStudentDetailBackUrl, studentDetailPanelId, studentDetailTabId } from "../config/student-detail.routes";
import { readStudentDetailOrigin, STUDENT_DETAIL_FROM_DIRECTORY } from "../config/teacher-dashboard.routes";
import type { StudentDetailOrigin } from "../config/teacher-dashboard.routes";
import {
  completedModules,
  DEFAULT_STUDENT_DETAIL_TAB,
  passedEvaluations,
  STUDENT_DETAIL_TABS,
} from "../entities/student-detail.entity";
import type { StudentDetailTab } from "../entities/student-detail.entity";
import { getTeacherDashboardErrorMessage } from "../entities/teacher-dashboard-error-messages";
import { useCurriculumTitles } from "../hooks/use-curriculum-titles";
import { useStudentDetail } from "../hooks/use-student-detail";
import { useStudentGrades } from "../hooks/use-student-grades";
import { useStudentSessions } from "../hooks/use-student-sessions";
import detailStyles from "../../UI/student-detail.module.css";
import styles from "../../UI/teacher-dashboard.module.css";

// TODO(i18n): move to a teacher-dashboard namespace in src/i18n.
export const STUDENT_DETAIL_COPY = {
  addToGroup: "Agregar a grupo",
  documentTitle: (name: string) => `${name} | Panel docente | VentyLab`,
  fallbackTitle: "Detalle del estudiante",
  backToDirectory: "Volver a la lista",
  backToGroup: "Volver al panel del grupo",
  backToDashboard: "Volver al panel",
  loading: "Cargando el estudiante…",
  forbiddenTitle: "No tienes acceso a este estudiante",
  forbiddenDescription: "Solo puedes ver a los estudiantes de los grupos que creaste o supervisas.",
  notFoundTitle: "El estudiante no existe",
  errorTitle: "No se pudo cargar el estudiante",
  loadingPanel: {
    modulos: "Cargando los módulos…",
    evaluaciones: "Cargando las evaluaciones…",
    simulador: "Cargando el simulador…",
    actividad: "Cargando la actividad…",
    gamificacion: "Cargando la gamificación…",
  } satisfies Record<StudentDetailTab, string>,
} as const;

const loadPanels = () => import("../components/detail/student-detail-panels");

// One chunk for the five panels; each panel mounts (and requests its data) on the first visit of its tab.
const TAB_PANELS: Record<StudentDetailTab, LazyPanel> = {
  modulos: lazyPanel(() => loadPanels().then((module) => module.ModulesPanel)),
  evaluaciones: lazyPanel(() => loadPanels().then((module) => module.EvaluationsPanel)),
  simulador: lazyPanel(() => loadPanels().then((module) => module.SimulatorPanel)),
  actividad: lazyPanel(() => loadPanels().then((module) => module.ActivityPanel)),
  gamificacion: lazyPanel(() => loadPanels().then((module) => module.GamificationPanel)),
};

const panelFallback = (tab: StudentDetailTab) => <ListSkeleton rows={3} label={STUDENT_DETAIL_COPY.loadingPanel[tab]} />;

function readQueryValue(value: string | string[] | undefined): string | null {
  return typeof value === "string" && value.trim() ? value : null;
}

function backLabel(origin: StudentDetailOrigin | null, groupId: string | null): string {
  if (origin === STUDENT_DETAIL_FROM_DIRECTORY) {
    return STUDENT_DETAIL_COPY.backToDirectory;
  }

  return groupId ? STUDENT_DETAIL_COPY.backToGroup : STUDENT_DETAIL_COPY.backToDashboard;
}

export type StudentDetailPageProps = {
  userId: string
};

export function StudentDetailPage({ userId }: StudentDetailPageProps) {
  const router = useRouter();
  const groupId = readQueryValue(router.query.groupId);
  const origin = readStudentDetailOrigin(router.query.from);
  const { student, studentLoading, studentError, summary, summaryLoading, summaryError, reload } = useStudentDetail(userId);
  const titles = useCurriculumTitles();
  const { grades } = useStudentGrades(userId);
  const { total: sessionsTotal } = useStudentSessions(userId, 1);
  const { tab, selectTab } = useUrlTab(STUDENT_DETAIL_TABS, DEFAULT_STUDENT_DETAIL_TAB);
  const modules = useMemo(() => (summary ? completedModules(summary) : null), [summary]);
  const evaluations = useMemo(() => (grades ? passedEvaluations(grades) : null), [grades]);
  const context = useMemo<StudentDetailContextValue>(
    () => ({ userId, titles, summary, summaryLoading, summaryError }),
    [userId, titles, summary, summaryLoading, summaryError],
  );
  const name = student ? (student.name?.trim() ? student.name : student.email) : STUDENT_DETAIL_COPY.fallbackTitle;
  const [addOpen, setAddOpen] = useState(false);
  const headerActions = (
    <>
      {student ? (
        <Button variant="outlined" size="small" startIcon={<PersonAddIcon />} onClick={() => setAddOpen(true)}>
          {STUDENT_DETAIL_COPY.addToGroup}
        </Button>
      ) : null}
      <Link href={buildStudentDetailBackUrl(origin, groupId)} className={cx(styles.link)}>{backLabel(origin, groupId)}</Link>
    </>
  );

  const renderBlocked = () => {
    const status = toApiError(studentError).status;

    if (status === 403) {
      return <ErrorState title={STUDENT_DETAIL_COPY.forbiddenTitle} description={STUDENT_DETAIL_COPY.forbiddenDescription} />;
    }

    if (status === 404) {
      return <ErrorState title={STUDENT_DETAIL_COPY.notFoundTitle} description={getTeacherDashboardErrorMessage(studentError)} />;
    }

    return <ErrorState title={STUDENT_DETAIL_COPY.errorTitle} description={getTeacherDashboardErrorMessage(studentError)} onRetry={() => void reload()} />;
  };

  const renderContent = () => {
    if (!student) {
      if (studentError) {
        return renderBlocked();
      }

      return studentLoading ? <CardSkeleton label={STUDENT_DETAIL_COPY.loading} /> : null;
    }

    return (
      <StudentDetailContext.Provider value={context}>
        <StudentDetailHeader
          student={student}
          overallProgress={summary ? summary.overall.percentage : null}
          modules={modules}
          evaluations={evaluations}
          sessions={sessionsTotal}
        />
        {tab !== null ? <StudentDetailTabs active={tab} onSelect={selectTab} /> : null}
        <KeptMountedTabPanels
          tabs={STUDENT_DETAIL_TABS}
          active={tab}
          panels={TAB_PANELS}
          fallback={panelFallback}
          panelId={studentDetailPanelId}
          tabId={studentDetailTabId}
          panelClassName={cx(detailStyles.panel)}
        />
      </StudentDetailContext.Provider>
    );
  };

  return (
    <div className={cx(styles.page)}>
      <Head>
        <title>{STUDENT_DETAIL_COPY.documentTitle(name)}</title>
      </Head>
      <PageHeader title={name} actions={headerActions} />
      <div className={cx(styles.content)}>{renderContent()}</div>
      {student && addOpen ? <AddToGroupDialog open members={[{ id: student.id, name }]} onClose={() => setAddOpen(false)} /> : null}
    </div>
  );
}
