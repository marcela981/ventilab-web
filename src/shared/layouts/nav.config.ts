/*
* Funcionalidad: Navigation config
* Descripción: Typed main-navigation items of the AppShell. Every item points to an EXISTING route of the session route table (routes.config) and lists the roles that see it (a test asserts each route exists and admits those roles). getNavItems filters by role; findActiveHref picks the longest matching item for the current Next pathname. Labels are plain Spanish because the i18next setup (src/i18n) is outside the new-code modules; TODO(i18n): move them to an i18next namespace. Depends on MUI icons and the session route table and entities.
* Versión: 1.0
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

import AdminPanelSettingsIcon from "@mui/icons-material/AdminPanelSettings";
import AnalyticsIcon from "@mui/icons-material/Analytics";
import AssignmentIcon from "@mui/icons-material/Assignment";
import DashboardIcon from "@mui/icons-material/Dashboard";
import EditNoteIcon from "@mui/icons-material/EditNote";
import EmojiEventsIcon from "@mui/icons-material/EmojiEvents";
import GradingIcon from "@mui/icons-material/Grading";
import GroupsIcon from "@mui/icons-material/Groups";
import HomeIcon from "@mui/icons-material/Home";
import MonitorHeartIcon from "@mui/icons-material/MonitorHeart";
import PersonIcon from "@mui/icons-material/Person";
import SchoolIcon from "@mui/icons-material/School";
import SettingsIcon from "@mui/icons-material/Settings";
import type { SvgIconComponent } from "@mui/icons-material";
import type { RoutePath } from "@shared/session/routes.config";
import type { Role } from "@shared/session/session.entity";

export type NavItem = {
  href: RoutePath
  label: string
  icon: SvgIconComponent
  roles: readonly Role[]
};

const STUDENT: readonly Role[] = ["STUDENT"];
const STAFF: readonly Role[] = ["TEACHER", "ADMIN"];
const ADMIN: readonly Role[] = ["ADMIN"];
const EVERYONE: readonly Role[] = ["STUDENT", "TEACHER", "ADMIN"];

export const NAV_ITEMS: readonly NavItem[] = [
  { href: "/dashboard", label: "Inicio", icon: HomeIcon, roles: STUDENT },
  { href: "/teaching", label: "Aprendizaje", icon: SchoolIcon, roles: STUDENT },
  { href: "/simulador", label: "Simulador", icon: MonitorHeartIcon, roles: STUDENT },
  { href: "/evaluation", label: "Evaluaciones", icon: AssignmentIcon, roles: STUDENT },
  { href: "/achievements", label: "Logros", icon: EmojiEventsIcon, roles: STUDENT },
  { href: "/panel", label: "Panel", icon: DashboardIcon, roles: STAFF },
  { href: "/panel/students", label: "Estudiantes", icon: GroupsIcon, roles: STAFF },
  { href: "/evaluation/manage", label: "Gestionar evaluaciones", icon: EditNoteIcon, roles: STAFF },
  { href: "/evaluation/grade", label: "Calificar", icon: GradingIcon, roles: STAFF },
  { href: "/panel/admin", label: "Administración", icon: AdminPanelSettingsIcon, roles: ADMIN },
  { href: "/panel/settings", label: "Configuración", icon: SettingsIcon, roles: ADMIN },
  { href: "/admin/search-analytics", label: "Analítica de búsqueda", icon: AnalyticsIcon, roles: ADMIN },
  { href: "/profile", label: "Perfil", icon: PersonIcon, roles: EVERYONE },
];

export function getNavItems(role: Role | null): NavItem[] {
  if (role === null) {
    return [];
  }

  return NAV_ITEMS.filter((item) => item.roles.includes(role));
}

export function findActiveHref(items: readonly NavItem[], pathname: string): RoutePath | null {
  let active: RoutePath | null = null;

  for (const { href } of items) {
    const matches = pathname === href || pathname.startsWith(`${href}/`);

    if (matches && (active === null || href.length > active.length)) {
      active = href;
    }
  }

  return active;
}
