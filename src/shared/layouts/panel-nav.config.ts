/*
* Funcionalidad: Staff panel navigation config
* Descripción: Navigation of the staff panel (PanelShell, DISENO_BLOQUE4 §2.1), in the NavItem shape of nav.config so the shared NavList and findActiveHref work unchanged. Every staff member (TEACHER, ADMIN): Dashboard (/teacher), Estudiantes (/teacher/students), Grupos (/groups), Contenido (/content), Casos clínicos (/simulator/cases), Evaluaciones (/evaluations, with the gradingPending badge and active on /grading/**) and Laboratorio (/teacher/lab, with the ventilatorDevice indicator). Then the "Administración" section: Estado del sistema (/admin/status, every staff member; read-only for teachers, as before), and for ADMIN only Usuarios, Configuración, Auditoría, Analítica de IA and Investigación. Texts from the July panel where it had them (Dashboard, Estudiantes, Configuración). Also the panel copy (title, collapse toggle, "Volver a la plataforma" → /simulador) and the Spanish role labels of the header chip. getPanelNavItems filters by role. Plain Spanish copy (TODO(i18n), see nav.config). Depends on MUI icons, the session route table and entities and nav.config types.
* Versión: 1.0
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
import EventIcon from "@mui/icons-material/Event";
import GroupWorkIcon from "@mui/icons-material/GroupWork";
import HistoryIcon from "@mui/icons-material/History";
import InsightsIcon from "@mui/icons-material/Insights";
import LibraryBooksIcon from "@mui/icons-material/LibraryBooks";
import ManageAccountsIcon from "@mui/icons-material/ManageAccounts";
import PeopleIcon from "@mui/icons-material/People";
import ScienceIcon from "@mui/icons-material/Science";
import SettingsIcon from "@mui/icons-material/Settings";
import type { RoutePath } from "@shared/session/routes.config";
import type { Role } from "@shared/session/session.entity";
import type { NavItem } from "./nav.config";

const STAFF: readonly Role[] = ["TEACHER", "ADMIN"];
const ADMIN: readonly Role[] = ["ADMIN"];

export const PANEL_ADMIN_SECTION = "Administración";

// TODO(i18n): see nav.config.
export const PANEL_COPY = {
  title: "Panel docente",
  navigationLabel: "Navegación del panel",
  collapse: "Contraer menú",
  expand: "Expandir menú",
  openMobile: "Abrir menú del panel",
  backToPlatform: "Volver a la plataforma",
  skipToContent: "Saltar al contenido principal",
} as const;

// The platform home of every role (the unified simulator workspace).
export const PANEL_BACK_HREF: RoutePath = "/simulador";

export const PANEL_ROLE_LABELS: Readonly<Record<Role, string>> = {
  STUDENT: "Estudiante",
  TEACHER: "Docente",
  ADMIN: "Administrador",
};

export const PANEL_NAV_ITEMS: readonly NavItem[] = [
  { href: "/teacher", label: "Dashboard", icon: DashboardIcon, roles: STAFF },
  { href: "/teacher/students", label: "Estudiantes", icon: PeopleIcon, roles: STAFF },
  { href: "/groups", label: "Grupos", icon: GroupWorkIcon, roles: STAFF },
  { href: "/content", label: "Contenido", icon: LibraryBooksIcon, roles: STAFF },
  { href: "/simulator/cases", label: "Casos clínicos", icon: BiotechIcon, roles: STAFF },
  // The staff hub (Gestionar, Calificar, Resultados) with the pending count; active on the grading screens.
  { href: "/evaluations", label: "Evaluaciones", icon: AssignmentIcon, roles: STAFF, badgeKey: "gradingPending", activePrefixes: ["/grading"] },
  { href: "/teacher/lab", label: "Laboratorio", icon: EventIcon, roles: STAFF, indicator: "ventilatorDevice" },
  { href: "/admin/status", label: "Estado del sistema", icon: DnsIcon, roles: STAFF, section: PANEL_ADMIN_SECTION },
  { href: "/admin/users", label: "Usuarios", icon: ManageAccountsIcon, roles: ADMIN, section: PANEL_ADMIN_SECTION },
  { href: "/admin/settings", label: "Configuración", icon: SettingsIcon, roles: ADMIN, section: PANEL_ADMIN_SECTION },
  { href: "/admin/audit", label: "Auditoría", icon: HistoryIcon, roles: ADMIN, section: PANEL_ADMIN_SECTION },
  { href: "/admin/ai", label: "Analítica de IA", icon: InsightsIcon, roles: ADMIN, section: PANEL_ADMIN_SECTION },
  { href: "/admin/research", label: "Investigación", icon: ScienceIcon, roles: ADMIN, section: PANEL_ADMIN_SECTION },
];

export function getPanelNavItems(role: Role | null): NavItem[] {
  if (role === null) {
    return [];
  }

  return PANEL_NAV_ITEMS.filter((item) => item.roles.includes(role));
}
