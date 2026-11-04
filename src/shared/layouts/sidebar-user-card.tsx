/*
* Funcionalidad: SidebarUserCard
* Descripción: User card at the bottom of the global sidebar and identity block of the staff panel sidebar (July SidebarUserCard.jsx / PanelSidebar.jsx, DISENO_BLOQUE5 §5.1-5.2). Expanded: the avatar (the session user's image, initials as fallback, coloured by role, D15) and the name with the role chip form one link to /profile, and a separate "Opciones" button (MoreVert) opens the user options menu (UserOptionsMenu: name and email, Perfil, the student links, Cerrar sesión; aria-haspopup, aria-expanded and aria-controls). The whole card is not clickable (July nested a button inside a clickable area). Collapsed: only the avatar, as the "Opciones de {nombre}" button that opens the same menu (D11; July's red sign-out-only button is not copied). The "panel" variant shows no avatar while expanded (the July panel identity block) and scopes the menu portal to the panel surface. Renders nothing without a session user (the shells always run inside the route guards). Plain Spanish copy (TODO(i18n), see nav.config). Depends on MUI, next/link, @shared/session and the shell controls. v1.0 (Bloque 5): new.
* Versión: 1.0
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

import MoreVertIcon from "@mui/icons-material/MoreVert";
import Avatar from "@mui/material/Avatar";
import IconButton from "@mui/material/IconButton";
import Tooltip from "@mui/material/Tooltip";
import Link from "next/link";
import { useId, useState } from "react";
import type { MouseEvent } from "react";
import { cx } from "@shared/lib/class-names";
import type { RoutePath } from "@shared/session/routes.config";
import { useSession } from "@shared/session/use-session";
import { PANEL_ROLE_LABELS } from "./panel-nav.config";
import { initialsOf, UserOptionsMenu } from "./shell-controls";
import styles from "./UI/sidebar-user-card.module.css";

// TODO(i18n): see nav.config.
export const USER_CARD_COPY = {
  options: "Opciones",
  optionsOf: (name: string) => `Opciones de ${name}`,
} as const;

const PROFILE_HREF: RoutePath = "/profile";

export type SidebarUserCardProps = {
  collapsed?: boolean
  variant?: "sidebar" | "panel"
};

export function SidebarUserCard({ collapsed = false, variant = "sidebar" }: SidebarUserCardProps) {
  const { user, role } = useSession();
  const [menuAnchor, setMenuAnchor] = useState<HTMLElement | null>(null);
  const menuId = useId();

  if (!user) {
    return null;
  }

  const name = user.name ?? user.email;
  const roleKey = role?.toLowerCase();
  const closeMenu = () => setMenuAnchor(null);
  const openMenu = (event: MouseEvent<HTMLElement>) => setMenuAnchor(event.currentTarget);
  const menuAria = menuAnchor ? { "aria-controls": menuId, "aria-expanded": true } : { "aria-expanded": false };
  // Decorative image (the link or button has its own name); MUI falls back to the initials if it fails to load.
  const avatarImage = user.image ? { src: user.image, alt: "" } : {};
  const avatar = (
    <Avatar {...avatarImage} className={cx(styles.avatar)} data-role={roleKey} aria-hidden="true">
      {initialsOf(user.name, user.email)}
    </Avatar>
  );
  const menu = (
    <UserOptionsMenu
      id={menuId}
      anchorEl={menuAnchor}
      onClose={closeMenu}
      placement="sidebar"
      {...(variant === "panel" ? { surface: "panel" as const } : {})}
    />
  );

  if (collapsed) {
    return (
      <div className={cx(styles.card, styles.collapsed)} data-variant={variant}>
        <Tooltip title={USER_CARD_COPY.options} placement="right" describeChild>
          <IconButton
            aria-label={USER_CARD_COPY.optionsOf(name)}
            aria-haspopup="menu"
            {...menuAria}
            onClick={openMenu}
            className={cx(styles.avatarButton)}
          >
            {avatar}
          </IconButton>
        </Tooltip>
        {menu}
      </div>
    );
  }

  return (
    <div className={styles.card} data-variant={variant}>
      <Link href={PROFILE_HREF} className={styles.identity}>
        {variant === "sidebar" ? avatar : null}
        <span className={styles.identityText}>
          <span className={styles.name}>{name}</span>
          {role ? <span className={styles.roleChip} data-role={roleKey}>{PANEL_ROLE_LABELS[role]}</span> : null}
        </span>
      </Link>
      <IconButton aria-label={USER_CARD_COPY.options} aria-haspopup="menu" {...menuAria} onClick={openMenu} className={cx(styles.options)}>
        <MoreVertIcon />
      </IconButton>
      {menu}
    </div>
  );
}
