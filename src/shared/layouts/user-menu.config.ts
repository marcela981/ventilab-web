/*
* Funcionalidad: User menu config
* Descripción: Typed links of the AppShell user menu (avatar button), by role, in display order. Students: "Mi resumen" (/me), "Mis notas" (/me/notes), "Mis calificaciones" (/me/grades), "Mi grupo" (/my-group) and "Perfil" (/profile); teachers and admins: "Perfil". Every role also gets "Cerrar sesión", an action of the shell (signOut), not a link. Every href is a route of the session route table its roles can reach (tested). Plain Spanish labels (TODO(i18n), see nav.config). Depends on MUI icons and the session route table and entities.
* Versión: 0.1
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

import DashboardIcon from "@mui/icons-material/Dashboard";
import GradeIcon from "@mui/icons-material/Grade";
import GroupWorkIcon from "@mui/icons-material/GroupWork";
import PersonIcon from "@mui/icons-material/Person";
import StickyNote2Icon from "@mui/icons-material/StickyNote2";
import type { SvgIconComponent } from "@mui/icons-material";
import type { RoutePath } from "@shared/session/routes.config";
import type { Role } from "@shared/session/session.entity";

export type UserMenuItem = {
  href: RoutePath
  label: string
  icon: SvgIconComponent
  roles: readonly Role[]
};

const STUDENT: readonly Role[] = ["STUDENT"];
const EVERYONE: readonly Role[] = ["STUDENT", "TEACHER", "ADMIN"];

export const SIGN_OUT_LABEL = "Cerrar sesión";

export const USER_MENU_ITEMS: readonly UserMenuItem[] = [
  { href: "/me", label: "Mi resumen", icon: DashboardIcon, roles: STUDENT },
  { href: "/me/notes", label: "Mis notas", icon: StickyNote2Icon, roles: STUDENT },
  { href: "/me/grades", label: "Mis calificaciones", icon: GradeIcon, roles: STUDENT },
  { href: "/my-group", label: "Mi grupo", icon: GroupWorkIcon, roles: STUDENT },
  { href: "/profile", label: "Perfil", icon: PersonIcon, roles: EVERYONE },
];

export function getUserMenuItems(role: Role | null): UserMenuItem[] {
  if (role === null) {
    return [];
  }

  return USER_MENU_ITEMS.filter((item) => item.roles.includes(role));
}
