/*
* Funcionalidad: QuickActions
* Descripción: "Accesos rápidos" of the General tab of /teacher (julio QuickActionsGrid, FLUJOS_JULIO §c.3): link cards with icon, title and description. Ver estudiantes (/teacher/students), Editar contenido (/content), Evaluaciones (/evaluations), Calificar (Calificar tab of the staff hub, with the pending-grading count as a badge with an accessible text when above zero), Reservar ventilador (/teacher/lab) and, for administrators only, Gestión de usuarios (/admin/users). Presentational. Depends on MUI icons, next/link, @shared/layouts/nav-badges (badge text), @shared/lib/class-names, the teacher dashboard routes, the teacher general entities and CSS Module.
* Versión: 1.0
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

import AssignmentIcon from "@mui/icons-material/Assignment";
import EventIcon from "@mui/icons-material/Event";
import GradingIcon from "@mui/icons-material/Grading";
import LibraryBooksIcon from "@mui/icons-material/LibraryBooks";
import ManageAccountsIcon from "@mui/icons-material/ManageAccounts";
import PeopleIcon from "@mui/icons-material/People";
import Link from "next/link";
import type { ReactNode } from "react";
import { useId } from "react";
import { navBadgeText } from "@shared/layouts/nav-badges";
import { cx } from "@shared/lib/class-names";
import { GRADING_URL, TEACHER_STUDENTS_URL } from "../../config/teacher-dashboard.routes";
import { ADMIN_USERS_URL, CONTENT_URL, EVALUATIONS_URL, TEACHER_LAB_URL } from "../../entities/teacher-general.entity";
import styles from "../../../UI/teacher-general.module.css";

type QuickActionKey = "students" | "content" | "evaluations" | "grading" | "lab" | "users";

type QuickAction = {
  key: QuickActionKey
  title: string
  description: string
  href: string
  icon: ReactNode
  adminOnly?: boolean
};

// TODO(i18n): move to a teacher-dashboard namespace in src/i18n. Descriptions of the first three from julio.
export const QUICK_ACTIONS_COPY = {
  title: "Accesos rápidos",
} as const;

const QUICK_ACTIONS: readonly QuickAction[] = [
  { key: "students", title: "Ver estudiantes", description: "Listado y progreso individual", href: TEACHER_STUDENTS_URL, icon: <PeopleIcon aria-hidden="true" /> },
  { key: "content", title: "Editar contenido", description: "Niveles, módulos y lecciones", href: CONTENT_URL, icon: <LibraryBooksIcon aria-hidden="true" /> },
  { key: "evaluations", title: "Evaluaciones", description: "Crear, asignar y calificar", href: EVALUATIONS_URL, icon: <AssignmentIcon aria-hidden="true" /> },
  { key: "grading", title: "Calificar", description: "Intentos pendientes de revisión", href: GRADING_URL, icon: <GradingIcon aria-hidden="true" /> },
  { key: "lab", title: "Reservar ventilador", description: "Calendario del laboratorio", href: TEACHER_LAB_URL, icon: <EventIcon aria-hidden="true" /> },
  { key: "users", title: "Gestión de usuarios", description: "Roles, estados y códigos", href: ADMIN_USERS_URL, icon: <ManageAccountsIcon aria-hidden="true" />, adminOnly: true },
];

export type QuickActionsProps = {
  isAdmin: boolean
  /** Attempts waiting for review; null or 0 shows no badge. */
  pendingCount: number | null
};

export function QuickActions({ isAdmin, pendingCount }: QuickActionsProps) {
  const titleId = useId();
  const actions = QUICK_ACTIONS.filter((action) => isAdmin || !action.adminOnly);

  return (
    <section aria-labelledby={titleId} className={cx(styles.panelCard)}>
      <h2 id={titleId} className={cx(styles.panelTitle)}>{QUICK_ACTIONS_COPY.title}</h2>
      <ul className={cx(styles.actionList)}>
        {actions.map((action) => (
          <li key={action.key}>
            <Link href={action.href} className={cx(styles.action)} data-testid={`quick-action-${action.key}`}>
              <span className={cx(styles.actionIcon)}>{action.icon}</span>
              <span className={cx(styles.actionText)}>
                <span className={cx(styles.actionTitle)}>{action.title}</span>
                <span className={cx(styles.actionDescription)}>{action.description}</span>
              </span>
              {action.key === "grading" && pendingCount !== null && pendingCount > 0 ? (
                <span className={cx(styles.badge)}>
                  <span aria-hidden="true">{pendingCount}</span>
                  <span className={cx(styles.srOnly)}>{navBadgeText("gradingPending", pendingCount)}</span>
                </span>
              ) : null}
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
