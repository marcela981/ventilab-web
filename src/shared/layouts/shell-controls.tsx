/*
* Funcionalidad: Shell header controls
* Descripción: Header controls shared by the AppShell and the PanelShell (extracted from the AppShell, W1 Bloque 4). RealtimeIndicator: a small "Sin conexión en tiempo real" chip (role="status") while the new socket is disconnected or unauthorized. UserMenu: the avatar button (the session user's image, initials as fallback) that opens the user menu: name and email, the role's links of user-menu.config rendered as next/link anchors (closing the menu on click) and "Cerrar sesión", which calls signOut() from the session (the route guard then redirects to login). Plain Spanish copy (TODO(i18n), see nav.config). Depends on MUI, next/link, @shared/session and @shared/realtime context.
* Versión: 1.0
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
import Typography from "@mui/material/Typography";
import Link from "next/link";
import { useContext, useId, useState } from "react";
import type { MouseEvent } from "react";
import { RealtimeContext } from "@shared/realtime/realtime-context";
import { useSession } from "@shared/session/use-session";
import { getUserMenuItems, SIGN_OUT_LABEL } from "./user-menu.config";
import styles from "./UI/shell-controls.module.css";

export function RealtimeIndicator() {
  const realtime = useContext(RealtimeContext);
  const offline = realtime?.status === "disconnected" || realtime?.status === "unauthorized";

  if (!offline) {
    return null;
  }

  return (
    <span role="status" className={styles.realtime}>
      <Chip icon={<WifiOffIcon />} label="Sin conexión en tiempo real" color="warning" variant="outlined" size="small" />
    </span>
  );
}

function initialsOf(name: string | null | undefined, email: string | undefined): string {
  const source = name?.trim() || email || "?";
  const parts = source.split(/\s+/).filter(Boolean);
  const letters = parts.length > 1 ? `${parts[0]?.[0] ?? ""}${parts[1]?.[0] ?? ""}` : source.slice(0, 2);

  return letters.toUpperCase();
}

export function UserMenu() {
  const { user, role, signOut } = useSession();
  const [menuAnchor, setMenuAnchor] = useState<HTMLElement | null>(null);
  const userMenuId = useId();
  const userMenuItems = getUserMenuItems(role);
  const closeMenu = () => setMenuAnchor(null);
  const menuAria = menuAnchor ? { "aria-controls": userMenuId, "aria-expanded": "true" as const } : {};
  const openMenu = (event: MouseEvent<HTMLElement>) => setMenuAnchor(event.currentTarget);
  // Decorative image (the button has its own label); MUI falls back to the initials if it fails to load.
  const avatarImage = user?.image ? { src: user.image, alt: "" } : {};

  const handleSignOut = () => {
    closeMenu();
    void signOut();
  };

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
      <Menu id={userMenuId} anchorEl={menuAnchor} open={menuAnchor !== null} onClose={closeMenu}>
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
            <MenuItem key={item.href} component={Link} href={item.href} onClick={closeMenu}>
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
    </>
  );
}
