/*
* Funcionalidad: Navigation config
* Descripción: Typed main-navigation items of the AppShell. Every item points to an EXISTING route of the session route table (routes.config) and lists the roles that see it (a test asserts each route exists and admits those roles). v1.1 (T11a): "Mi grupo" (/my-group, students) and "Grupos" (/groups, teachers and admins). v1.2 (T0 learning): "Aprender" (/learn, every role; teachers and admins preview the student viewer) and "Contenido" (/content, teachers and admins); the legacy "Aprendizaje" (/teaching) entry stays until the legacy routes redirect (R1). v1.3 (S0 evaluations): the legacy evaluation items are replaced by "Evaluaciones" (/evaluations, every role), "Gestionar evaluaciones" (/evaluations/manage) and "Calificar" (/grading), both for teachers and admins. getNavItems filters by role; findActiveHref picks the longest matching item for the current Next pathname. v1.4 (G1 grading): an item may name a `badgeKey` (nav-badges registry); "Calificar" shows the gradingPending count. v1.5 (A1 ai-chat): "Asistente IA" (/assistant, every role). v1.6 (T5 simulation): "Simulador" (/simulator, every role); the legacy /simulador entry is untouched until T13 renames it. v1.7 (T11 simulation): "Casos clínicos" (/simulator/cases, teachers and admins). v1.8 (T13 simulation): the legacy /simulador entry is relabelled "Ventilador real" (sensors icon): it stays as the only UI of the physical ventilator and is not redirected. v1.9 (T12 ventilator-lab): the legacy "Ventilador real" (/simulador, students) item is replaced by "Laboratorio" (/lab, every role: the backend lets every role book and operate) with the `ventilatorDevice` indicator (online / sin datos, nav-indicators); /simulador now redirects to /lab. An item may name an `indicator` (nav-indicators). v1.10 (T12 review fix W1): the indicator is only a key of the generic nav-indicators registry; the ventilator-lab feature feeds it (online / sin datos only when reported, nothing when unknown). Labels are plain Spanish because the i18next setup (src/i18n) is outside the new-code modules; TODO(i18n): move them to an i18next namespace. Depends on MUI icons and the session route table and entities. v1.11 (O5 operation): final navigation of the migration. Students start at "Inicio" (/me) and get "Mis calificaciones" (/me/grades) and "Mis notas" (/me/notes); teachers and admins start at "Panel docente" (/teacher); "Notificaciones" (/notifications, every role) carries the notificationsUnread badge; the admin console (/admin/users, /admin/settings, /admin/audit, /admin/ai, /admin/research, /admin/search-analytics: ADMIN; /admin/status "Estado del sistema": TEACHER and ADMIN) is a contiguous "Administración" section (optional `section`, rendered as a subheader by the AppShell) at the end. The legacy /dashboard, /panel, /panel/students, /panel/admin and /panel/settings items are removed (those routes now redirect); the legacy /teaching hub stays for students. v1.12 (B3.4, D1): the legacy "Aprendizaje" (/teaching), "Logros" (/achievements) and "Analítica de búsqueda" (/admin/search-analytics) items are removed with their pages; students reach the learning home through "Aprender" (/learn). v1.13 (W1 Bloque 1): short side menu. Every role: "Simulador" (/simulador, home of every role, with the ventilatorDevice indicator and `activePrefixes` /simulator/sessions/[sessionId] and /lab, so it stays active on the session, result, replay, reservation and recording pages), "Enseñanza" (/learn) and "Evaluación" (/evaluations). Staff: the "Panel docente" section (Resumen /teacher, Grupos, Contenido, Gestionar evaluaciones, Casos clínicos, Calificar with its badge, Estado del sistema) and, for ADMIN only, the "Administración" section (Usuarios, Configuración, Auditoría, Analítica de IA, Investigación). The student space, "Mi grupo" and "Perfil" moved to the user menu (user-menu.config); the AI assistant stays as the top-bar launcher and notifications in the bell; no route is removed. findActiveHref also considers `activePrefixes` (segment-wise; a dynamic segment matches any segment) and the longest matching prefix wins, so "Casos clínicos" (/simulator/cases) stays active on the case editor.
* Versión: 1.13
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

import AssignmentIcon from "@mui/icons-material/Assignment";
import BiotechIcon from "@mui/icons-material/Biotech";
import DashboardIcon from "@mui/icons-material/Dashboard";
import DnsIcon from "@mui/icons-material/Dns";
import EditNoteIcon from "@mui/icons-material/EditNote";
import GradingIcon from "@mui/icons-material/Grading";
import GroupWorkIcon from "@mui/icons-material/GroupWork";
import HistoryIcon from "@mui/icons-material/History";
import InsightsIcon from "@mui/icons-material/Insights";
import LibraryBooksIcon from "@mui/icons-material/LibraryBooks";
import ManageAccountsIcon from "@mui/icons-material/ManageAccounts";
import MenuBookIcon from "@mui/icons-material/MenuBook";
import MonitorHeartIcon from "@mui/icons-material/MonitorHeart";
import ScienceIcon from "@mui/icons-material/Science";
import SettingsIcon from "@mui/icons-material/Settings";
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
  // Other route prefixes that also make this item the active one (the longest matching prefix wins).
  activePrefixes?: readonly RoutePath[]
};

const STAFF: readonly Role[] = ["TEACHER", "ADMIN"];
const ADMIN: readonly Role[] = ["ADMIN"];
const EVERYONE: readonly Role[] = ["STUDENT", "TEACHER", "ADMIN"];

export const STAFF_SECTION = "Panel docente";
export const ADMIN_SECTION = "Administración";

export const NAV_ITEMS: readonly NavItem[] = [
  {
    href: "/simulador",
    label: "Simulador",
    icon: MonitorHeartIcon,
    roles: EVERYONE,
    indicator: "ventilatorDevice",
    activePrefixes: ["/simulator/sessions/[sessionId]", "/lab"],
  },
  { href: "/learn", label: "Enseñanza", icon: MenuBookIcon, roles: EVERYONE },
  { href: "/evaluations", label: "Evaluación", icon: AssignmentIcon, roles: EVERYONE },
  { href: "/teacher", label: "Resumen", icon: DashboardIcon, roles: STAFF, section: STAFF_SECTION },
  { href: "/groups", label: "Grupos", icon: GroupWorkIcon, roles: STAFF, section: STAFF_SECTION },
  { href: "/content", label: "Contenido", icon: LibraryBooksIcon, roles: STAFF, section: STAFF_SECTION },
  { href: "/evaluations/manage", label: "Gestionar evaluaciones", icon: EditNoteIcon, roles: STAFF, section: STAFF_SECTION },
  { href: "/simulator/cases", label: "Casos clínicos", icon: BiotechIcon, roles: STAFF, section: STAFF_SECTION },
  { href: "/grading", label: "Calificar", icon: GradingIcon, roles: STAFF, badgeKey: "gradingPending", section: STAFF_SECTION },
  { href: "/admin/status", label: "Estado del sistema", icon: DnsIcon, roles: STAFF, section: STAFF_SECTION },
  { href: "/admin/users", label: "Usuarios", icon: ManageAccountsIcon, roles: ADMIN, section: ADMIN_SECTION },
  { href: "/admin/settings", label: "Configuración", icon: SettingsIcon, roles: ADMIN, section: ADMIN_SECTION },
  { href: "/admin/audit", label: "Auditoría", icon: HistoryIcon, roles: ADMIN, section: ADMIN_SECTION },
  { href: "/admin/ai", label: "Analítica de IA", icon: InsightsIcon, roles: ADMIN, section: ADMIN_SECTION },
  { href: "/admin/research", label: "Investigación", icon: ScienceIcon, roles: ADMIN, section: ADMIN_SECTION },
];

export function getNavItems(role: Role | null): NavItem[] {
  if (role === null) {
    return [];
  }

  return NAV_ITEMS.filter((item) => item.roles.includes(role));
}

const isDynamicSegment = (segment: string): boolean => segment.startsWith("[") && segment.endsWith("]");

// Segment-wise prefix match: "/lab" matches "/lab/recordings/r1" but not "/laboratory"; a dynamic
// segment of the prefix ("[sessionId]") matches any segment, so Next patterns and concrete paths both work.
function prefixMatches(prefix: string, pathname: string): boolean {
  const prefixSegments = prefix.split("/");
  const pathSegments = pathname.split("/");

  return pathSegments.length >= prefixSegments.length
    && prefixSegments.every((segment, index) => segment === pathSegments[index]
      || (isDynamicSegment(segment) && (pathSegments[index] ?? "") !== ""));
}

export function findActiveHref(items: readonly NavItem[], pathname: string): RoutePath | null {
  let active: RoutePath | null = null;
  let longest = -1;

  for (const { href, activePrefixes = [] } of items) {
    for (const prefix of [href, ...activePrefixes]) {
      if (prefixMatches(prefix, pathname) && prefix.length > longest) {
        active = href;
        longest = prefix.length;
      }
    }
  }

  return active;
}
