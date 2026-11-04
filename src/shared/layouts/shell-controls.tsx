/*
* Funcionalidad: Shell header controls
* Descripción: Header controls shared by the AppShell and the PanelShell (extracted from the AppShell, W1 Bloque 4). RealtimeIndicator: a small "Sin conexión en tiempo real" chip (role="status") while the new socket is disconnected or unauthorized. UserMenu: the avatar button (the session user's image, initials as fallback) that opens the user menu: name and email, the role's links of user-menu.config rendered as next/link anchors (closing the menu on click) and "Cerrar sesión", which calls signOut() from the session (the route guard then redirects to login). Plain Spanish copy (TODO(i18n), see nav.config). Depends on MUI, next/link, @shared/session and @shared/realtime context. v1.1 (Bloque 5, D11-D12): the menu body is extracted as UserOptionsMenu({ id, anchorEl, onClose, placement, surface }), shared by the UserMenu and the sidebar user cards: placement "sidebar" opens it to the right of its button, bottom-aligned; `surface` puts the panel data-surface on the portal root (the menu renders in <body>, outside the PanelShell scope); initialsOf is exported for the cards. v1.2 (Bloque 5, D10): RealtimeIndicator `compact` (collapsed sidebar): the WifiOff icon with a tooltip, still role="status" with the text visually hidden.
* Versión: 1.2
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

import LogoutIcon from "@mui/icons-material/Logout";
import WifiOffIcon from "@mui/icons-material/WifiOff";
import Avatar from "@mui/material/Avatar";
import Chip from "@mui/material/Chip";
import Divider from "@mui/material/Divider";
import IconButton from "@mui/material/IconButton";
import ListItemIcon from "@mui/material/ListItemIcon";
import Menu from "@mui/material/Menu";
import MenuItem from "@mui/material/MenuItem";
import Tooltip from "@mui/material/Tooltip";
import Typography from "@mui/material/Typography";
import Link from "next/link";
import { useContext, useId, useState } from "react";
import type { MouseEvent } from "react";
import { cx } from "@shared/lib/class-names";
import { RealtimeContext } from "@shared/realtime/realtime-context";
import { useSession } from "@shared/session/use-session";
import { getUserMenuItems, SIGN_OUT_LABEL } from "./user-menu.config";
import styles from "./UI/shell-controls.module.css";

export const REALTIME_OFFLINE_LABEL = "Sin conexión en tiempo real";

export type RealtimeIndicatorProps = {
  // The collapsed sidebar: only the WifiOff icon with a tooltip; the text stays visually hidden.
  compact?: boolean
};

export function RealtimeIndicator({ compact = false }: RealtimeIndicatorProps) {
  const realtime = useContext(RealtimeContext);
  const offline = realtime?.status === "disconnected" || realtime?.status === "unauthorized";

  if (!offline) {
    return null;
  }

  if (compact) {
    return (
      <Tooltip title={REALTIME_OFFLINE_LABEL} placement="right">
        <span role="status" className={cx(styles.realtime, styles.realtimeCompact)}>
          <WifiOffIcon fontSize="small" aria-hidden="true" />
          <span className={styles.visuallyHidden}>{REALTIME_OFFLINE_LABEL}</span>
        </span>
      </Tooltip>
    );
  }

  return (
    <span role="status" className={styles.realtime}>
      <Chip icon={<WifiOffIcon />} label={REALTIME_OFFLINE_LABEL} color="warning" variant="outlined" size="small" />
    </span>
  );
}

export function initialsOf(name: string | null | undefined, email: string | undefined): string {
  const source = name?.trim() || email || "?";
  const parts = source.split(/\s+/).filter(Boolean);
  const letters = parts.length > 1 ? `${parts[0]?.[0] ?? ""}${parts[1]?.[0] ?? ""}` : source.slice(0, 2);

  return letters.toUpperCase();
}

// Where the menu opens: next to a sidebar button (to the right, bottom-aligned) or under a top bar button.
export type UserOptionsMenuPlacement = "sidebar" | "topbar";

export type UserOptionsMenuProps = {
  id: string
  anchorEl: HTMLElement | null
  onClose: () => void
  placement?: UserOptionsMenuPlacement
  // Surface scope of the portal (the menu renders in <body>, outside the PanelShell data-surface).
  surface?: "panel"
};

const MENU_ORIGINS = {
  sidebar: {
    anchorOrigin: { vertical: "bottom", horizontal: "right" },
    transformOrigin: { vertical: "bottom", horizontal: "left" },
  },
  topbar: {
    anchorOrigin: { vertical: "bottom", horizontal: "right" },
    transformOrigin: { vertical: "top", horizontal: "right" },
  },
} as const;

// The "Opciones" menu: name and email, the role links of user-menu.config (Perfil first) and "Cerrar sesión".
export function UserOptionsMenu({ id, anchorEl, onClose, placement = "topbar", surface }: UserOptionsMenuProps) {
  const { user, role, signOut } = useSession();
  const userMenuItems = getUserMenuItems(role);
  const surfaceProps = surface ? { slotProps: { root: { "data-surface": surface } } } : {};

  const handleSignOut = () => {
    onClose();
    void signOut();
  };

  return (
    <Menu
      id={id}
      anchorEl={anchorEl}
      open={anchorEl !== null}
      onClose={onClose}
      {...MENU_ORIGINS[placement]}
      {...surfaceProps}
    >
      <div className={styles.userInfo}>
        <Typography variant="subtitle2">{user?.name ?? user?.email}</Typography>
        <Typography variant="body2" color="text.secondary">
          {user?.email}
        </Typography>
      </div>
      <Divider />
      {userMenuItems.map((item) => {
        const Icon = item.icon;

        return (
          <MenuItem key={item.href} component={Link} href={item.href} onClick={onClose}>
            <ListItemIcon>
              <Icon fontSize="small" />
            </ListItemIcon>
            {item.label}
          </MenuItem>
        );
      })}
      {userMenuItems.length > 0 ? <Divider /> : null}
      <MenuItem onClick={handleSignOut}>
        <ListItemIcon>
          <LogoutIcon fontSize="small" />
        </ListItemIcon>
        {SIGN_OUT_LABEL}
      </MenuItem>
    </Menu>
  );
}

export function UserMenu() {
  const { user } = useSession();
  const [menuAnchor, setMenuAnchor] = useState<HTMLElement | null>(null);
  const userMenuId = useId();
  const closeMenu = () => setMenuAnchor(null);
  const menuAria = menuAnchor ? { "aria-controls": userMenuId, "aria-expanded": "true" as const } : {};
  const openMenu = (event: MouseEvent<HTMLElement>) => setMenuAnchor(event.currentTarget);
  // Decorative image (the button has its own label); MUI falls back to the initials if it fails to load.
  const avatarImage = user?.image ? { src: user.image, alt: "" } : {};

  return (
    <>
      <IconButton
        aria-label="Abrir menú de usuario"
        aria-haspopup="true"
        {...menuAria}
        onClick={openMenu}
      >
        <Avatar {...avatarImage}>{initialsOf(user?.name, user?.email)}</Avatar>
      </IconButton>
      <UserOptionsMenu id={userMenuId} anchorEl={menuAnchor} onClose={closeMenu} />
    </>
  );
}
