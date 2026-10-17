/*
* Funcionalidad: Navigation config
* Descripción: Typed main-navigation items of the AppShell. Every item points to an EXISTING route of the session route table (routes.config) and lists the roles that see it (a test asserts each route exists and admits those roles). v1.1 (T11a): "Mi grupo" (/my-group, students) and "Grupos" (/groups, teachers and admins). v1.2 (T0 learning): "Aprender" (/learn, every role; teachers and admins preview the student viewer) and "Contenido" (/content, teachers and admins); the legacy "Aprendizaje" (/teaching) entry stays until the legacy routes redirect (R1). v1.3 (S0 evaluations): the legacy evaluation items are replaced by "Evaluaciones" (/evaluations, every role), "Gestionar evaluaciones" (/evaluations/manage) and "Calificar" (/grading), both for teachers and admins. getNavItems filters by role; findActiveHref picks the longest matching item for the current Next pathname. v1.4 (G1 grading): an item may name a `badgeKey` (nav-badges registry); "Calificar" shows the gradingPending count. v1.5 (A1 ai-chat): "Asistente IA" (/assistant, every role). v1.6 (T5 simulation): "Simulador" (/simulator, every role); the legacy /simulador entry is untouched until T13 renames it. v1.7 (T11 simulation): "Casos clínicos" (/simulator/cases, teachers and admins). v1.8 (T13 simulation): the legacy /simulador entry is relabelled "Ventilador real" (sensors icon): it stays as the only UI of the physical ventilator and is not redirected. v1.9 (T12 ventilator-lab): the legacy "Ventilador real" (/simulador, students) item is replaced by "Laboratorio" (/lab, every role: the backend lets every role book and operate) with the `ventilatorDevice` indicator (online / sin datos, nav-indicators); /simulador now redirects to /lab. An item may name an `indicator` (nav-indicators). v1.10 (T12 review fix W1): the indicator is only a key of the generic nav-indicators registry; the ventilator-lab feature feeds it (online / sin datos only when reported, nothing when unknown). Labels are plain Spanish because the i18next setup (src/i18n) is outside the new-code modules; TODO(i18n): move them to an i18next namespace. Depends on MUI icons and the session route table and entities. v1.11 (O5 operation): final navigation of the migration. Students start at "Inicio" (/me) and get "Mis calificaciones" (/me/grades) and "Mis notas" (/me/notes); teachers and admins start at "Panel docente" (/teacher); "Notificaciones" (/notifications, every role) carries the notificationsUnread badge; the admin console (/admin/users, /admin/settings, /admin/audit, /admin/ai, /admin/research, /admin/search-analytics: ADMIN; /admin/status "Estado del sistema": TEACHER and ADMIN) is a contiguous "Administración" section (optional `section`, rendered as a subheader by the AppShell) at the end. The legacy /dashboard, /panel, /panel/students, /panel/admin and /panel/settings items are removed (those routes now redirect); the legacy /teaching hub stays for students.
* Versión: 1.11
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

import AnalyticsIcon from "@mui/icons-material/Analytics";
import AssignmentIcon from "@mui/icons-material/Assignment";
import BiotechIcon from "@mui/icons-material/Biotech";
import DashboardIcon from "@mui/icons-material/Dashboard";
import DnsIcon from "@mui/icons-material/Dns";
import EditNoteIcon from "@mui/icons-material/EditNote";
import EmojiEventsIcon from "@mui/icons-material/EmojiEvents";
import GradeIcon from "@mui/icons-material/Grade";
import GradingIcon from "@mui/icons-material/Grading";
import GroupWorkIcon from "@mui/icons-material/GroupWork";
import HistoryIcon from "@mui/icons-material/History";
import HomeIcon from "@mui/icons-material/Home";
import InsightsIcon from "@mui/icons-material/Insights";
import LibraryBooksIcon from "@mui/icons-material/LibraryBooks";
import ManageAccountsIcon from "@mui/icons-material/ManageAccounts";
import MenuBookIcon from "@mui/icons-material/MenuBook";
import MonitorHeartIcon from "@mui/icons-material/MonitorHeart";
import NotificationsIcon from "@mui/icons-material/Notifications";
import PersonIcon from "@mui/icons-material/Person";
import SchoolIcon from "@mui/icons-material/School";
import ScienceIcon from "@mui/icons-material/Science";
import SensorsIcon from "@mui/icons-material/Sensors";
import SettingsIcon from "@mui/icons-material/Settings";
import SmartToyIcon from "@mui/icons-material/SmartToy";
import StickyNote2Icon from "@mui/icons-material/StickyNote2";
import type { SvgIconComponent } from "@mui/icons-material";
import type { RoutePath } from "@shared/session/routes.config";
import type { Role } from "@shared/session/session.entity";
import type { NavBadgeKey } from "./nav-badges";
import type { NavIndicatorKey } from "./nav-indicators";

export type NavItem = {
  href: RoutePath
  label: string
  icon: SvgIconComponent
  roles: readonly Role[]
  // Count shown as a badge on the item, fed by a feature through the nav-badges registry.
  badgeKey?: NavBadgeKey
  // Small status shown on the item (nav-indicators), e.g. the physical ventilator state.
  indicator?: NavIndicatorKey
  // Subheader the AppShell shows before the first item of a section; items of a section are contiguous.
  section?: string
};

const STUDENT: readonly Role[] = ["STUDENT"];
const STAFF: readonly Role[] = ["TEACHER", "ADMIN"];
const ADMIN: readonly Role[] = ["ADMIN"];
const EVERYONE: readonly Role[] = ["STUDENT", "TEACHER", "ADMIN"];

export const ADMIN_SECTION = "Administración";

export const NAV_ITEMS: readonly NavItem[] = [
  { href: "/me", label: "Inicio", icon: HomeIcon, roles: STUDENT },
  { href: "/teacher", label: "Panel docente", icon: DashboardIcon, roles: STAFF },
  { href: "/teaching", label: "Aprendizaje", icon: SchoolIcon, roles: STUDENT },
  { href: "/learn", label: "Aprender", icon: MenuBookIcon, roles: EVERYONE },
  { href: "/lab", label: "Laboratorio", icon: SensorsIcon, roles: EVERYONE, indicator: "ventilatorDevice" },
  { href: "/simulator", label: "Simulador", icon: MonitorHeartIcon, roles: EVERYONE },
  { href: "/evaluations", label: "Evaluaciones", icon: AssignmentIcon, roles: EVERYONE },
  { href: "/me/grades", label: "Mis calificaciones", icon: GradeIcon, roles: STUDENT },
  { href: "/me/notes", label: "Mis notas", icon: StickyNote2Icon, roles: STUDENT },
  { href: "/assistant", label: "Asistente IA", icon: SmartToyIcon, roles: EVERYONE },
  { href: "/achievements", label: "Logros", icon: EmojiEventsIcon, roles: STUDENT },
  { href: "/my-group", label: "Mi grupo", icon: GroupWorkIcon, roles: STUDENT },
  { href: "/groups", label: "Grupos", icon: GroupWorkIcon, roles: STAFF },
  { href: "/content", label: "Contenido", icon: LibraryBooksIcon, roles: STAFF },
  { href: "/evaluations/manage", label: "Gestionar evaluaciones", icon: EditNoteIcon, roles: STAFF },
  { href: "/simulator/cases", label: "Casos clínicos", icon: BiotechIcon, roles: STAFF },
  { href: "/grading", label: "Calificar", icon: GradingIcon, roles: STAFF, badgeKey: "gradingPending" },
  { href: "/notifications", label: "Notificaciones", icon: NotificationsIcon, roles: EVERYONE, badgeKey: "notificationsUnread" },
  { href: "/profile", label: "Perfil", icon: PersonIcon, roles: EVERYONE },
  { href: "/admin/users", label: "Usuarios", icon: ManageAccountsIcon, roles: ADMIN, section: ADMIN_SECTION },
  { href: "/admin/settings", label: "Configuración", icon: SettingsIcon, roles: ADMIN, section: ADMIN_SECTION },
  { href: "/admin/audit", label: "Auditoría", icon: HistoryIcon, roles: ADMIN, section: ADMIN_SECTION },
  { href: "/admin/ai", label: "Analítica de IA", icon: InsightsIcon, roles: ADMIN, section: ADMIN_SECTION },
  { href: "/admin/research", label: "Investigación", icon: ScienceIcon, roles: ADMIN, section: ADMIN_SECTION },
  { href: "/admin/search-analytics", label: "Analítica de búsqueda", icon: AnalyticsIcon, roles: ADMIN, section: ADMIN_SECTION },
  { href: "/admin/status", label: "Estado del sistema", icon: DnsIcon, roles: STAFF, section: ADMIN_SECTION },
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
