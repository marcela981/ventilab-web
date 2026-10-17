/*
* Funcionalidad: TeacherDashboardPage
* Descripción: Page /teacher (TEACHER, ADMIN): the caller's STUDENT groups (`GET /api/groups?type=STUDENT`) in a selector whose value lives in the URL (?groupId=, shareable; the first group by default), the summary cards of the group (attempts to grade, active evaluations, upcoming reservations), the students table of `GET /api/analytics/groups/{groupId}/dashboard` (sortable, filterable, risk highlight with legend, expandable progress) and the lazy charts (grade distribution of one evaluation from the API histogram, module progress of one student). "Exportar CSV" downloads `GET /api/analytics/groups/{groupId}/export.csv`. A 403 of the analytics (another teacher's group opened by URL) shows "No tienes acceso a este grupo". No grade, average or statistic is computed here; personal notes and AI conversations of the students are never read. Depends on MUI, next/head, next/router, the design-system states and async button, the teacher dashboard hooks, components, entities and CSS Module.
* Versión: 1.0
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

import DownloadIcon from "@mui/icons-material/Download";
import GroupsOutlinedIcon from "@mui/icons-material/GroupsOutlined";
import Head from "next/head";
import { useRouter } from "next/router";
import { AsyncButton } from "@shared/design-system/components/async-button";
import { EmptyState } from "@shared/design-system/components/empty-state";
import { ErrorState } from "@shared/design-system/components/error-state";
import { PageHeader } from "@shared/design-system/components/page-header";
import { CardSkeleton, ListSkeleton } from "@shared/design-system/components/skeleton";
import { cx } from "@shared/lib/class-names";
import { formatDateTime } from "@shared/lib/format";
import { DashboardCards } from "../components/dashboard-cards";
import { DashboardChartsSection } from "../components/dashboard-charts-section";
import { GroupSelector } from "../components/group-selector";
import { StudentsTable } from "../components/students-table";
import { getTeacherDashboardErrorMessage, isForbiddenError } from "../entities/teacher-dashboard-error-messages";
import { useCurriculumTitles } from "../hooks/use-curriculum-titles";
import { useGroupCards } from "../hooks/use-group-cards";
import { useGroupDashboard } from "../hooks/use-group-dashboard";
import { useGroupExport } from "../hooks/use-group-export";
import { useTeacherGroups } from "../hooks/use-teacher-groups";
import styles from "../../UI/teacher-dashboard.module.css";

// TODO(i18n): move to a teacher-dashboard namespace in src/i18n.
export const TEACHER_DASHBOARD_COPY = {
  documentTitle: "Panel docente | VentyLab",
  title: "Panel docente",
  subtitle: "Progreso, calificaciones, simulación y uso de IA de los estudiantes de tus grupos.",
  export: "Exportar CSV",
  loadingGroups: "Cargando tus grupos…",
  loadingDashboard: "Cargando el panel del grupo…",
  groupsErrorTitle: "No se pudieron cargar tus grupos",
  dashboardErrorTitle: "No se pudo cargar el panel del grupo",
  forbiddenTitle: "No tienes acceso a este grupo",
  forbiddenDescription: "Solo puedes ver los grupos que creaste o supervisas. Elige uno de tus grupos en el selector.",
  noGroupsTitle: "Aún no tienes grupos de estudiantes",
  noGroupsDescription: "Crea un grupo o pide que te asignen como supervisor para ver aquí su avance.",
  generatedAt: (date: string) => `Datos generados el ${date} (se actualizan cada minuto).`,
} as const;

function readGroupId(value: string | string[] | undefined): string | null {
  return typeof value === "string" && value.trim() ? value : null;
}

export function TeacherDashboardPage() {
  const router = useRouter();
  const urlGroupId = readGroupId(router.query.groupId);
  const { groups, isLoading: groupsLoading, error: groupsError, reload: reloadGroups } = useTeacherGroups();
  const groupId = router.isReady ? (urlGroupId ?? groups?.[0]?.id ?? null) : null;
  const { dashboard, isLoading, error, reload } = useGroupDashboard(groupId);
  const cards = useGroupCards(groupId);
  const titles = useCurriculumTitles();
  const { exporting, exportCsv } = useGroupExport();
  const forbidden = isForbiddenError(error);

  const selectGroup = (next: string) => {
    void router.replace({ pathname: router.pathname, query: { ...router.query, groupId: next } }, undefined, { shallow: true });
  };

  const renderGroupContent = () => {
    if (!groupId) {
      return null;
    }

    if (forbidden) {
      return <ErrorState title={TEACHER_DASHBOARD_COPY.forbiddenTitle} description={TEACHER_DASHBOARD_COPY.forbiddenDescription} />;
    }

    if (!dashboard && error) {
      return (
        <ErrorState
          title={TEACHER_DASHBOARD_COPY.dashboardErrorTitle}
          description={getTeacherDashboardErrorMessage(error)}
          onRetry={() => void reload()}
        />
      );
    }

    return (
      <>
        <DashboardCards cards={cards} />
        {dashboard ? (
          <>
            <p className={cx(styles.meta)}>{TEACHER_DASHBOARD_COPY.generatedAt(formatDateTime(dashboard.generatedAt))}</p>
            <StudentsTable rows={dashboard.students} groupId={groupId} titles={titles} />
            <DashboardChartsSection key={dashboard.groupId} rows={dashboard.students} titles={titles} />
          </>
        ) : null}
        {!dashboard && isLoading ? <ListSkeleton rows={5} label={TEACHER_DASHBOARD_COPY.loadingDashboard} /> : null}
      </>
    );
  };

  const renderContent = () => {
    if (!groups) {
      if (groupsError) {
        return (
          <ErrorState
            title={TEACHER_DASHBOARD_COPY.groupsErrorTitle}
            description={getTeacherDashboardErrorMessage(groupsError)}
            onRetry={() => void reloadGroups()}
          />
        );
      }

      return groupsLoading || !router.isReady ? <CardSkeleton label={TEACHER_DASHBOARD_COPY.loadingGroups} /> : null;
    }

    if (groups.length === 0 && !urlGroupId) {
      return (
        <EmptyState icon={<GroupsOutlinedIcon />} title={TEACHER_DASHBOARD_COPY.noGroupsTitle} description={TEACHER_DASHBOARD_COPY.noGroupsDescription} />
      );
    }

    return (
      <>
        <div className={cx(styles.toolbar)}>
          <GroupSelector groups={groups} value={groupId} onChange={selectGroup} />
        </div>
        {renderGroupContent()}
      </>
    );
  };

  return (
    <div className={cx(styles.page)}>
      <Head>
        <title>{TEACHER_DASHBOARD_COPY.documentTitle}</title>
      </Head>
      <PageHeader
        title={TEACHER_DASHBOARD_COPY.title}
        subtitle={TEACHER_DASHBOARD_COPY.subtitle}
        actions={(
          <AsyncButton
            variant="outlined"
            startIcon={<DownloadIcon />}
            loading={exporting}
            disabled={!groupId || forbidden || !dashboard}
            onClick={() => (groupId ? exportCsv(groupId, dashboard?.groupName ?? null) : undefined)}
          >
            {TEACHER_DASHBOARD_COPY.export}
          </AsyncButton>
        )}
      />
      <div className={cx(styles.content)}>{renderContent()}</div>
    </div>
  );
}
