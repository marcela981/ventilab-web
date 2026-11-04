/*
* Funcionalidad: GeneralTab
* Descripción: Container of the General tab of /teacher (DISENO_BLOQUE4 §2.2, julio PanelDashboard of FLUJOS_JULIO §c.3). Reads the session (name, role), the platform statistics and the 5 most recent students; both queries start on the same render, so they run in parallel (no waterfall). Renders the greeting banner, the statistic cards (missing data hides the card), "Estudiantes recientes" and "Accesos rápidos" (the Calificar badge reads the gradingPending navigation badge count, fed by the grading feature while the panel is on screen: no extra request). As in julio, a warning alert appears only when both loads fail, with a retry of both. Depends on MUI Alert and Button, React, @shared/layouts (panel role labels, nav badges), @shared/session, the teacher general hooks and components and the teacher general CSS Module.
* Versión: 1.0
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

import Alert from "@mui/material/Alert";
import Button from "@mui/material/Button";
import { useState } from "react";
import { useNavBadgeCounts } from "@shared/layouts/nav-badges";
import { PANEL_ROLE_LABELS } from "@shared/layouts/panel-nav.config";
import { cx } from "@shared/lib/class-names";
import { useSession } from "@shared/session/use-session";
import { usePlatformStatistics } from "../../hooks/use-platform-statistics";
import { useRecentStudents } from "../../hooks/use-recent-students";
import { GeneralHero } from "./general-hero";
import { PlatformStatCards } from "./platform-stat-cards";
import { QuickActions } from "./quick-actions";
import { RecentStudents } from "./recent-students";
import styles from "../../../UI/teacher-general.module.css";

// TODO(i18n): move to a teacher-dashboard namespace in src/i18n.
export const GENERAL_TAB_COPY = {
  fallbackName: "Usuario",
  loadError: "No se pudieron cargar las estadísticas ni los estudiantes recientes.",
  retry: "Reintentar",
} as const;

export function GeneralTab() {
  const { user, role } = useSession();
  // One instant per mount: the greeting does not change while the tab is open.
  const [now] = useState(() => new Date());
  const statistics = usePlatformStatistics();
  const recent = useRecentStudents(role);
  const pendingCount = useNavBadgeCounts().gradingPending ?? null;
  const bothFailed = statistics.cards === null && statistics.error !== null && recent.students === null && recent.error !== null;

  const retryAll = () => {
    void statistics.reload();
    void recent.reload();
  };

  return (
    <div className={cx(styles.general)}>
      <GeneralHero
        name={user?.name?.trim() || user?.email || GENERAL_TAB_COPY.fallbackName}
        roleLabel={role ? PANEL_ROLE_LABELS[role] : null}
        now={now}
      />
      {bothFailed ? (
        <Alert severity="warning" action={<Button color="inherit" size="small" onClick={retryAll}>{GENERAL_TAB_COPY.retry}</Button>}>
          {GENERAL_TAB_COPY.loadError}
        </Alert>
      ) : (
        <PlatformStatCards cards={statistics.cards} isLoading={statistics.isLoading} />
      )}
      <div className={cx(styles.columns)}>
        {bothFailed ? null : (
          <RecentStudents
            students={recent.students}
            isLoading={recent.isLoading}
            error={recent.error}
            onRetry={() => void recent.reload()}
          />
        )}
        <QuickActions isAdmin={role === "ADMIN"} pendingCount={pendingCount} />
      </div>
    </div>
  );
}
