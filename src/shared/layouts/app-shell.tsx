/*
* Funcionalidad: AppShell
* Descripción: Authenticated application chrome for new pages: skip link to the main region, a permanent navigation drawer on desktop (>= md) and a temporary drawer opened from the header on mobile, the role-filtered navigation from nav.config (useSession role, active item = longest matching route with aria-current), a header with the app name, a small realtime status chip when the new socket is disconnected or unauthorized, and a user menu whose "Cerrar sesión" calls signOut() from the session (the route guard then redirects to login). Page content renders inside RouteErrorBoundary, reset on route change. It does not guard by itself: the Student/Teacher/Admin layouts wrap it in RequireAuth/RequireRole. Plain Spanish copy (TODO(i18n), see nav.config). Depends on MUI, next/link, next/router, @shared/session, @shared/realtime context and @shared/design-system components.
* Versión: 1.0
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

import LogoutIcon from "@mui/icons-material/Logout";
import MenuIcon from "@mui/icons-material/Menu";
import WifiOffIcon from "@mui/icons-material/WifiOff";
import AppBar from "@mui/material/AppBar";
import Avatar from "@mui/material/Avatar";
import Chip from "@mui/material/Chip";
import Divider from "@mui/material/Divider";
import Drawer from "@mui/material/Drawer";
import IconButton from "@mui/material/IconButton";
import List from "@mui/material/List";
import ListItemButton from "@mui/material/ListItemButton";
import ListItemIcon from "@mui/material/ListItemIcon";
import ListItemText from "@mui/material/ListItemText";
import Menu from "@mui/material/Menu";
import MenuItem from "@mui/material/MenuItem";
import Toolbar from "@mui/material/Toolbar";
import Typography from "@mui/material/Typography";
import Link from "next/link";
import { useRouter } from "next/router";
import { useContext, useId, useState } from "react";
import type { MouseEvent, ReactNode } from "react";
import { RouteErrorBoundary } from "@shared/design-system/components/route-error-boundary";
import { RealtimeContext } from "@shared/realtime/realtime-context";
import { DEFAULT_ROUTE_BY_ROLE } from "@shared/session/routes.config";
import { cx } from "@shared/lib/class-names";
import { useSession } from "@shared/session/use-session";
import { findActiveHref, getNavItems } from "./nav.config";
import type { NavItem } from "./nav.config";
import styles from "./UI/app-shell.module.css";

const APP_NAME = "VentyLab";
const MAIN_CONTENT_ID = "main-content";

export type AppShellProps = {
  children: ReactNode
};

type NavigationProps = {
  items: readonly NavItem[]
  activeHref: string | null
  homeHref: string
  onNavigate?: () => void
};

function noop() {}

function Navigation({ items, activeHref, homeHref, onNavigate = noop }: NavigationProps) {
  return (
    <nav aria-label="Navegación principal" className={styles.navigation}>
      <Link href={homeHref} className={cx(styles.brand)} onClick={onNavigate}>
        {APP_NAME}
      </Link>
      <Divider />
      <List>
        {items.map((item) => {
          const Icon = item.icon;
          const active = item.href === activeHref;
          const current = active ? { "aria-current": "page" as const } : {};

          return (
            <ListItemButton
              key={item.href}
              component={Link}
              href={item.href}
              selected={active}
              {...current}
              onClick={onNavigate}
            >
              <ListItemIcon>
                <Icon />
              </ListItemIcon>
              <ListItemText primary={item.label} />
            </ListItemButton>
          );
        })}
      </List>
    </nav>
  );
}

function RealtimeIndicator() {
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

export function AppShell({ children }: AppShellProps) {
  const { user, role, signOut } = useSession();
  const router = useRouter();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [menuAnchor, setMenuAnchor] = useState<HTMLElement | null>(null);
  const userMenuId = useId();
  const items = getNavItems(role);
  const activeHref = findActiveHref(items, router.pathname);
  const homeHref = role ? DEFAULT_ROUTE_BY_ROLE[role] : "/";
  const closeMobile = () => setMobileOpen(false);
  const closeMenu = () => setMenuAnchor(null);
  const menuAria = menuAnchor ? { "aria-controls": userMenuId, "aria-expanded": "true" as const } : {};
  const openMenu = (event: MouseEvent<HTMLElement>) => setMenuAnchor(event.currentTarget);

  const handleSignOut = () => {
    closeMenu();
    void signOut();
  };

  return (
    <div className={styles.root}>
      <a href={`#${MAIN_CONTENT_ID}`} className={styles.skipLink}>
        Saltar al contenido principal
      </a>
      <div className={styles.desktopNav}>
        <Drawer variant="permanent" open classes={{ paper: cx(styles.drawerPaper) }}>
          <Navigation items={items} activeHref={activeHref} homeHref={homeHref} />
        </Drawer>
      </div>
      <Drawer variant="temporary" open={mobileOpen} onClose={closeMobile} classes={{ paper: cx(styles.drawerPaper) }}>
        <Navigation items={items} activeHref={activeHref} homeHref={homeHref} onNavigate={closeMobile} />
      </Drawer>
      <div className={styles.column}>
        <AppBar position="sticky" color="default" elevation={0} className={cx(styles.header)}>
          <Toolbar className={cx(styles.toolbar)}>
            <span className={styles.menuButton}>
              <IconButton edge="start" aria-label="Abrir menú de navegación" onClick={() => setMobileOpen(true)}>
                <MenuIcon />
              </IconButton>
            </span>
            <Typography variant="h6" component="span" className={cx(styles.title)}>
              {APP_NAME}
            </Typography>
            <RealtimeIndicator />
            <IconButton
              aria-label="Abrir menú de usuario"
              aria-haspopup="true"
              {...menuAria}
              onClick={openMenu}
            >
              <Avatar>{initialsOf(user?.name, user?.email)}</Avatar>
            </IconButton>
            <Menu id={userMenuId} anchorEl={menuAnchor} open={menuAnchor !== null} onClose={closeMenu}>
              <div className={styles.userInfo}>
                <Typography variant="subtitle2">{user?.name ?? user?.email}</Typography>
                <Typography variant="body2" color="text.secondary">
                  {user?.email}
                </Typography>
              </div>
              <Divider />
              <MenuItem onClick={handleSignOut}>
                <ListItemIcon>
                  <LogoutIcon fontSize="small" />
                </ListItemIcon>
                Cerrar sesión
              </MenuItem>
            </Menu>
          </Toolbar>
        </AppBar>
        <main id={MAIN_CONTENT_ID} tabIndex={-1} className={styles.main}>
          <RouteErrorBoundary resetKey={router.asPath}>{children}</RouteErrorBoundary>
        </main>
      </div>
    </div>
  );
}
