/*
* Funcionalidad: AppShell
* Descripción: Authenticated application chrome for new pages: skip link to the main region, a permanent navigation drawer on desktop (>= md) and a temporary drawer opened from the header on mobile, the role-filtered navigation from nav.config (useSession role, active item = longest matching route with aria-current), a header with the app name, a small realtime status chip when the new socket is disconnected or unauthorized, and a user menu (avatar = the session user's image, initials as fallback, v1.1 T11a) whose "Cerrar sesión" calls signOut() from the session (the route guard then redirects to login). Page content renders inside RouteErrorBoundary, reset on route change. It does not guard by itself: the Student/Teacher/Admin layouts wrap it in RequireAuth/RequireRole. Plain Spanish copy (TODO(i18n), see nav.config). v1.2 (G1 grading): a navigation item with a `badgeKey` shows its count from the nav-badges registry as an MUI Badge on the icon (hidden at 0) plus a visually hidden "N pendientes" text for screen readers. Depends on MUI, next/link, next/router, @shared/session, @shared/realtime context, @shared/design-system components and the nav-badges registry. v1.3 (G1 review W2): registers itself as the nav-badge host (useNavBadgeHost) so badge feeders only poll while the shell is on screen. v1.4 (A3 ai-chat): renders the actions registered in the top-bar-actions slot (useTopBarActions, e.g. the AI assistant launcher contributed from pages/_app.js) between the realtime chip and the user menu. v1.5 (T12 ventilator-lab): a navigation item with an `indicator` shows a small status (dot + text, `data-indicator-tone`) from nav-indicators; the "Laboratorio" item shows the physical ventilator state (useVentilatorDeviceIndicator, enabled only when that item is in the role's navigation). v1.6 (T12 review fix W1): the shell no longer knows the device: it reads the generic nav-indicators registry (useNavIndicators; tone + text supplied by the feature that feeds the key, e.g. ventilator-lab from pages/_app.js) and declares the indicator keys of the role's navigation with useNavIndicatorHost; an item whose key nobody fed shows no indicator. v1.7 (O5 operation): a navigation item with a `section` (nav.config) gets a non-sticky subheader (ListSubheader) before the first item of its section, e.g. "Administración". v1.8 (B4): a badged item gets an accessible name with its differentiated count ("Notificaciones, 3 sin leer", "Calificar, 2 pendientes por calificar", singular/plural from navBadgeText; its indicator text is kept), nothing extra at 0; the visible number stays aria-hidden. v1.9 (W1 Bloque 1): the user menu lists the role's links of user-menu.config (students: Mi resumen, Mis notas, Mis calificaciones, Mi grupo, Perfil; staff: Perfil) as menu items rendered as next/link anchors (closing the menu on click), then "Cerrar sesión" for every role; the side menu is the short one of nav.config with its "Panel docente" and "Administración" sections; the brand links to the role home (/simulador).
* Versión: 1.9
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
import Badge from "@mui/material/Badge";
import Chip from "@mui/material/Chip";
import Divider from "@mui/material/Divider";
import Drawer from "@mui/material/Drawer";
import IconButton from "@mui/material/IconButton";
import List from "@mui/material/List";
import ListItemButton from "@mui/material/ListItemButton";
import ListItemIcon from "@mui/material/ListItemIcon";
import ListItemText from "@mui/material/ListItemText";
import ListSubheader from "@mui/material/ListSubheader";
import Menu from "@mui/material/Menu";
import MenuItem from "@mui/material/MenuItem";
import Toolbar from "@mui/material/Toolbar";
import Typography from "@mui/material/Typography";
import Link from "next/link";
import { useRouter } from "next/router";
import { Fragment, useContext, useId, useState } from "react";
import type { MouseEvent, ReactNode } from "react";
import { RouteErrorBoundary } from "@shared/design-system/components/route-error-boundary";
import { RealtimeContext } from "@shared/realtime/realtime-context";
import { DEFAULT_ROUTE_BY_ROLE } from "@shared/session/routes.config";
import { cx } from "@shared/lib/class-names";
import { useSession } from "@shared/session/use-session";
import { navBadgeText, useNavBadgeCounts, useNavBadgeHost } from "./nav-badges";
import type { NavBadgeCounts } from "./nav-badges";
import { useNavIndicatorHost, useNavIndicators } from "./nav-indicators";
import type { NavIndicatorKey, NavIndicators } from "./nav-indicators";
import { findActiveHref, getNavItems } from "./nav.config";
import { useTopBarActions } from "./top-bar-actions";
import { getUserMenuItems, SIGN_OUT_LABEL } from "./user-menu.config";
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
  badges: NavBadgeCounts
  indicators: NavIndicators
  onNavigate?: () => void
};

function noop() {}

const BADGE_MAX = 99;
// The visible number is decorative: the accessible name of the item carries the count.
const HIDDEN_BADGE_SLOT = { badge: { "aria-hidden": true } } as const;

function itemBadgeCount(item: NavItem, badges: NavBadgeCounts): number {
  return item.badgeKey ? badges[item.badgeKey] ?? 0 : 0;
}

// "Notificaciones, 3 sin leer": the label, the indicator text and the count; undefined (name from content) at 0.
function itemAccessibleName(item: NavItem, count: number, indicatorText: string | undefined): string | undefined {
  if (!item.badgeKey || count <= 0) {
    return undefined;
  }

  return [item.label, indicatorText, navBadgeText(item.badgeKey, count)].filter((part) => part !== undefined && part !== "").join(", ");
}

function Navigation({ items, activeHref, homeHref, badges, indicators, onNavigate = noop }: NavigationProps) {
  return (
    <nav aria-label="Navegación principal" className={styles.navigation}>
      <Link href={homeHref} className={cx(styles.brand)} onClick={onNavigate}>
        {APP_NAME}
      </Link>
      <Divider />
      <List>
        {items.map((item, index) => {
          const Icon = item.icon;
          // Items of a section are contiguous: the subheader goes before the first one.
          const opensSection = item.section !== undefined && item.section !== items[index - 1]?.section;
          const active = item.href === activeHref;
          const current = active ? { "aria-current": "page" as const } : {};
          const count = itemBadgeCount(item, badges);
          const indicator = item.indicator ? indicators[item.indicator] : undefined;
          const accessibleName = itemAccessibleName(item, count, indicator?.text);
          const named = accessibleName === undefined ? {} : { "aria-label": accessibleName };

          return (
            <Fragment key={item.href}>
              {opensSection ? <ListSubheader disableSticky className={cx(styles.navSection)}>{item.section}</ListSubheader> : null}
              <ListItemButton
                component={Link}
                href={item.href}
                selected={active}
                {...current}
                {...named}
                onClick={onNavigate}
              >
                <ListItemIcon>
                  {count > 0 ? (
                    <Badge badgeContent={count} max={BADGE_MAX} color="error" slotProps={HIDDEN_BADGE_SLOT}>
                      <Icon />
                    </Badge>
                  ) : (
                    <Icon />
                  )}
                </ListItemIcon>
                <ListItemText primary={item.label} />
                {indicator ? (
                  <span className={styles.navIndicator} data-indicator-tone={indicator.tone}>
                    <span className={styles.navIndicatorDot} aria-hidden="true" />
                    {indicator.text}
                  </span>
                ) : null}
              </ListItemButton>
            </Fragment>
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
  const userMenuItems = getUserMenuItems(role);
  const badges = useNavBadgeCounts();
  const topBarActions = useTopBarActions();
  const indicators = useNavIndicators();
  const indicatorKeys = items.flatMap((item): NavIndicatorKey[] => (item.indicator ? [item.indicator] : []));

  useNavBadgeHost();
  useNavIndicatorHost(indicatorKeys);
  const activeHref = findActiveHref(items, router.pathname);
  const homeHref = role ? DEFAULT_ROUTE_BY_ROLE[role] : "/";
  const closeMobile = () => setMobileOpen(false);
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
    <div className={styles.root}>
      <a href={`#${MAIN_CONTENT_ID}`} className={styles.skipLink}>
        Saltar al contenido principal
      </a>
      <div className={styles.desktopNav}>
        <Drawer variant="permanent" open classes={{ paper: cx(styles.drawerPaper) }}>
          <Navigation items={items} activeHref={activeHref} homeHref={homeHref} badges={badges} indicators={indicators} />
        </Drawer>
      </div>
      <Drawer variant="temporary" open={mobileOpen} onClose={closeMobile} classes={{ paper: cx(styles.drawerPaper) }}>
        <Navigation
          items={items}
          activeHref={activeHref}
          homeHref={homeHref}
          badges={badges}
          indicators={indicators}
          onNavigate={closeMobile}
        />
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
            {topBarActions}
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
          </Toolbar>
        </AppBar>
        <main id={MAIN_CONTENT_ID} tabIndex={-1} className={styles.main}>
          <RouteErrorBoundary resetKey={router.asPath}>{children}</RouteErrorBoundary>
        </main>
      </div>
    </div>
  );
}
