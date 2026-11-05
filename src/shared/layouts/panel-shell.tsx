/*
* Funcionalidad: PanelShell
* Descripción: Chrome of the staff panel, a space of its own as in July (PanelLayout + PanelSidebar; DISENO_BLOQUE4 §2.1): it replaces the AppShell on the staff pages (TeacherLayout, AdminLayout and the staff branch of /evaluations). Skip link to the main region; a side menu (nav landmark "Navegación del panel") with the panel title, the role-filtered items of panel-nav.config (shared NavList: aria-current on the active item = longest matching route, the "Administración" section, the gradingPending badge on Evaluaciones and the ventilatorDevice indicator on Laboratorio) and the footer link "Volver a la plataforma" → /simulador. On desktop (>= md) the menu is a permanent drawer that collapses to icons with a toggle (aria-expanded, aria-controls) whose state lives in localStorage (usePanelCollapsed, try/catch); below md it is a temporary drawer opened from the header. The header shows the panel title, the realtime chip, the top-bar actions (AI assistant, notifications), the user's name and email with a role chip and the user menu (Perfil, Cerrar sesión). Registers itself as the nav-badge host and as the indicator host of its items, so the feeders keep working inside the panel. Page content renders inside RouteErrorBoundary, reset on route change. It does not guard by itself (the layouts wrap it in RequireRole/RequireAuth). Depends on MUI, next/link, next/router, @shared/session, the design-system route error boundary and the layouts registries. v1.1 (Bloque 5): usePanelCollapsed comes from the createCollapsedPreference factory (use-collapsed-preference.ts); same key and behaviour. v1.2 (Bloque 5, §5.2, D8-D10, D15): the July staff panel chrome. The root carries data-surface="panel" (tokens.css: navy surfaces re-declared for the subtree, so every panel page inherits them without touching its TSX) and so do the portals the panel owns (the mobile drawer, the "Opciones" menu and, through ShellActionsPlacementProvider, the notifications popover). The side menu is the flat indigo July sidebar: header (accent AdminPanelSettings icon, "Panel docente", collapse toggle), the identity block moved from the top bar (SidebarUserCard "panel" variant: name + role chip as the profile link and the "Opciones" menu; the avatar button when collapsed), the NavList "panel" variant (violet active item), the "Herramientas" group on desktop (realtime status, AI assistant, notifications), the "Volver a la plataforma" footer link with the Dashboard icon (D8 keeps the Bloque 4 texts) and "VentyLab Admin v0.1.0" (hidden when collapsed). The desktop top bar is gone; below 900px a thin mobile bar keeps "Abrir menú del panel", the panel title and the tools (D14). The tools render once, chosen with useMediaQuery. v1.3 (Ola 0 closure): the main region starts with ApiContractBanner (ADMIN only: the server misses `GET /api/version` or reports another API contract). v1.4: (Ajustes D4): the "Apariencia" controls (mode and palette, panel variant; a menu button whose portal carries the panel surface when collapsed) sit at the foot of the panel navigation, above "Volver a la plataforma"; the panel surfaces follow the active palette and mode (tokens).
* Versión: 1.4
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

import AdminPanelSettingsIcon from "@mui/icons-material/AdminPanelSettings";
import ChevronLeftIcon from "@mui/icons-material/ChevronLeft";
import ChevronRightIcon from "@mui/icons-material/ChevronRight";
import DashboardIcon from "@mui/icons-material/Dashboard";
import MenuIcon from "@mui/icons-material/Menu";
import AppBar from "@mui/material/AppBar";
import Drawer from "@mui/material/Drawer";
import type { DrawerProps } from "@mui/material/Drawer";
import IconButton from "@mui/material/IconButton";
import ListItemButton from "@mui/material/ListItemButton";
import ListItemIcon from "@mui/material/ListItemIcon";
import ListItemText from "@mui/material/ListItemText";
import Toolbar from "@mui/material/Toolbar";
import Tooltip from "@mui/material/Tooltip";
import Typography from "@mui/material/Typography";
import useMediaQuery from "@mui/material/useMediaQuery";
import Link from "next/link";
import { useRouter } from "next/router";
import { useId, useState } from "react";
import type { ReactElement, ReactNode } from "react";
import { RouteErrorBoundary } from "@shared/design-system/components/route-error-boundary";
import { ApiContractBanner } from "./api-contract-banner";
import { AppearanceControls } from "./appearance-controls";
import { cx } from "@shared/lib/class-names";
import { useSession } from "@shared/session/use-session";
import { useNavBadgeCounts, useNavBadgeHost } from "./nav-badges";
import type { NavBadgeCounts } from "./nav-badges";
import { useNavIndicatorHost, useNavIndicators } from "./nav-indicators";
import type { NavIndicatorKey, NavIndicators } from "./nav-indicators";
import { NavList } from "./nav-list";
import { findActiveHref } from "./nav.config";
import type { NavItem } from "./nav.config";
import { getPanelNavItems, PANEL_BACK_HREF, PANEL_COPY } from "./panel-nav.config";
import { SHELL_DESKTOP_QUERY } from "./shell.config";
import { RealtimeIndicator } from "./shell-controls";
import { SidebarUserCard } from "./sidebar-user-card";
import { ShellActionsPlacementProvider, useTopBarActions } from "./top-bar-actions";
import { usePanelCollapsed } from "./use-collapsed-preference";
import styles from "./UI/panel-shell.module.css";

const MAIN_CONTENT_ID = "panel-main-content";
// The surface scope of tokens.css (navy content, panel surfaces) on the panel and on its portals.
const PANEL_SURFACE = "panel";
// The mobile drawer renders in <body>: its root carries the scope too (data attributes are not in the slot type).
const MOBILE_DRAWER_SLOTS = { root: { "data-surface": PANEL_SURFACE } } as NonNullable<DrawerProps["slotProps"]>;

function noop() {}

export type PanelShellProps = {
  children: ReactNode
};

type PanelNavigationProps = {
  id?: string
  items: readonly NavItem[]
  activeHref: string | null
  badges: NavBadgeCounts
  indicators: NavIndicators
  collapsed?: boolean
  onToggle?: () => void
  onNavigate?: () => void
  // The shell tools row (realtime status, AI assistant, notifications); absent in the mobile drawer.
  tools?: ReactNode
};

function withTooltip(label: string, collapsed: boolean, element: ReactElement): ReactElement {
  return collapsed ? <Tooltip title={label} placement="right" describeChild>{element}</Tooltip> : element;
}

function PanelNavigation({ id, items, activeHref, badges, indicators, collapsed = false, onToggle, onNavigate = noop, tools }: PanelNavigationProps) {
  return (
    <div className={cx(styles.sidebar, collapsed && styles.collapsed)}>
      <div className={styles.navHeader}>
        <AdminPanelSettingsIcon className={cx(styles.navHeaderIcon)} aria-hidden="true" />
        <span className={styles.navTitle}>{PANEL_COPY.title}</span>
        {onToggle && id ? (
          <IconButton
            aria-label={collapsed ? PANEL_COPY.expand : PANEL_COPY.collapse}
            aria-expanded={!collapsed}
            aria-controls={id}
            onClick={onToggle}
            className={cx(styles.toggle)}
          >
            {collapsed ? <ChevronRightIcon /> : <ChevronLeftIcon />}
          </IconButton>
        ) : null}
      </div>
      <SidebarUserCard collapsed={collapsed} variant="panel" />
      <nav id={id} aria-label={PANEL_COPY.navigationLabel} className={styles.navigation}>
        <div className={styles.navItems}>
          <NavList
            items={items}
            activeHref={activeHref}
            badges={badges}
            indicators={indicators}
            onNavigate={onNavigate}
            collapsed={collapsed}
            variant="panel"
          />
        </div>
        {tools === undefined ? null : (
          <div role="group" aria-label={PANEL_COPY.tools} className={styles.tools}>
            {tools}
          </div>
        )}
        <AppearanceControls collapsed={collapsed} variant="panel" />
        {withTooltip(PANEL_COPY.backToPlatform, collapsed, (
          <ListItemButton component={Link} href={PANEL_BACK_HREF} onClick={onNavigate} className={cx(styles.back)}>
            <ListItemIcon className={cx(styles.backIcon)}>
              <DashboardIcon />
            </ListItemIcon>
            <ListItemText primary={PANEL_COPY.backToPlatform} className={cx(styles.backLabel)} />
          </ListItemButton>
        ))}
      </nav>
      {collapsed ? null : <p className={styles.version}>{PANEL_COPY.version}</p>}
    </div>
  );
}

export function PanelShell({ children }: PanelShellProps) {
  const { role } = useSession();
  const router = useRouter();
  const navId = useId();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [collapsed, toggleCollapsed] = usePanelCollapsed();
  // The tools render once: in the sidebar on desktop, in the mobile bar below md (false before hydration).
  const desktop = useMediaQuery(SHELL_DESKTOP_QUERY);
  const items = getPanelNavItems(role);
  const badges = useNavBadgeCounts();
  const indicators = useNavIndicators();
  const topBarActions = useTopBarActions();
  const indicatorKeys = items.flatMap((item): NavIndicatorKey[] => (item.indicator ? [item.indicator] : []));

  useNavBadgeHost();
  useNavIndicatorHost(indicatorKeys);
  const activeHref = findActiveHref(items, router.pathname);
  const closeMobile = () => setMobileOpen(false);
  const sidebarTools = desktop ? (
    <ShellActionsPlacementProvider placement="sidebar" surface={PANEL_SURFACE}>
      <RealtimeIndicator compact={collapsed} />
      {topBarActions}
    </ShellActionsPlacementProvider>
  ) : undefined;

  return (
    <div className={cx(styles.root, collapsed && styles.rootCollapsed)} data-surface={PANEL_SURFACE}>
      <a href={`#${MAIN_CONTENT_ID}`} className={styles.skipLink}>
        {PANEL_COPY.skipToContent}
      </a>
      <div className={styles.desktopNav}>
        <Drawer variant="permanent" open classes={{ paper: cx(styles.drawerPaper) }}>
          <PanelNavigation
            id={navId}
            items={items}
            activeHref={activeHref}
            badges={badges}
            indicators={indicators}
            collapsed={collapsed}
            onToggle={toggleCollapsed}
            tools={sidebarTools}
          />
        </Drawer>
      </div>
      <Drawer
        variant="temporary"
        open={mobileOpen}
        onClose={closeMobile}
        classes={{ paper: cx(styles.mobilePaper) }}
        slotProps={MOBILE_DRAWER_SLOTS}
      >
        <PanelNavigation items={items} activeHref={activeHref} badges={badges} indicators={indicators} onNavigate={closeMobile} />
      </Drawer>
      <div className={styles.column}>
        <AppBar position="sticky" color="default" elevation={0} className={cx(styles.mobileBar)}>
          <Toolbar className={cx(styles.toolbar)}>
            <IconButton edge="start" aria-label={PANEL_COPY.openMobile} onClick={() => setMobileOpen(true)}>
              <MenuIcon />
            </IconButton>
            <Typography variant="h6" component="span" className={cx(styles.title)}>
              {PANEL_COPY.title}
            </Typography>
            {desktop ? null : (
              <ShellActionsPlacementProvider placement="topbar" surface={PANEL_SURFACE}>
                <RealtimeIndicator compact />
                {topBarActions}
              </ShellActionsPlacementProvider>
            )}
          </Toolbar>
        </AppBar>
        <main id={MAIN_CONTENT_ID} tabIndex={-1} className={styles.main}>
          <ApiContractBanner />
          <RouteErrorBoundary resetKey={router.asPath}>{children}</RouteErrorBoundary>
        </main>
      </div>
    </div>
  );
}
