/*
* Funcionalidad: AppShell
* Descripción: Authenticated application chrome for new pages: skip link to the main region, a permanent navigation drawer on desktop (>= md) and a temporary drawer opened from the header on mobile, the role-filtered navigation from nav.config (useSession role, active item = longest matching route with aria-current), a header with the app name, a small realtime status chip when the new socket is disconnected or unauthorized, and a user menu (avatar = the session user's image, initials as fallback, v1.1 T11a) whose "Cerrar sesión" calls signOut() from the session (the route guard then redirects to login). Page content renders inside RouteErrorBoundary, reset on route change. It does not guard by itself: the Student/Teacher/Admin layouts wrap it in RequireAuth/RequireRole. Plain Spanish copy (TODO(i18n), see nav.config). v1.2 (G1 grading): a navigation item with a `badgeKey` shows its count from the nav-badges registry as an MUI Badge on the icon (hidden at 0) plus a visually hidden "N pendientes" text for screen readers. Depends on MUI, next/link, next/router, @shared/session, @shared/realtime context, @shared/design-system components and the nav-badges registry. v1.3 (G1 review W2): registers itself as the nav-badge host (useNavBadgeHost) so badge feeders only poll while the shell is on screen. v1.4 (A3 ai-chat): renders the actions registered in the top-bar-actions slot (useTopBarActions, e.g. the AI assistant launcher contributed from pages/_app.js) between the realtime chip and the user menu. v1.5 (T12 ventilator-lab): a navigation item with an `indicator` shows a small status (dot + text, `data-indicator-tone`) from nav-indicators; the "Laboratorio" item shows the physical ventilator state (useVentilatorDeviceIndicator, enabled only when that item is in the role's navigation). v1.6 (T12 review fix W1): the shell no longer knows the device: it reads the generic nav-indicators registry (useNavIndicators; tone + text supplied by the feature that feeds the key, e.g. ventilator-lab from pages/_app.js) and declares the indicator keys of the role's navigation with useNavIndicatorHost; an item whose key nobody fed shows no indicator. v1.7 (O5 operation): a navigation item with a `section` (nav.config) gets a non-sticky subheader (ListSubheader) before the first item of its section, e.g. "Administración". v1.8 (B4): a badged item gets an accessible name with its differentiated count ("Notificaciones, 3 sin leer", "Calificar, 2 pendientes por calificar", singular/plural from navBadgeText; its indicator text is kept), nothing extra at 0; the visible number stays aria-hidden. v1.9 (W1 Bloque 1): the user menu lists the role's links of user-menu.config (students: Mi resumen, Mis notas, Mis calificaciones, Mi grupo, Perfil; staff: Perfil) as menu items rendered as next/link anchors (closing the menu on click), then "Cerrar sesión" for every role; the side menu is the short one of nav.config with its "Panel docente" and "Administración" sections; the brand links to the role home (/simulador). v1.10 (W1 Bloque 4): the navigation list (NavList: active item, sections, badges, indicators) and the header controls (RealtimeIndicator, UserMenu) moved to nav-list.tsx and shell-controls.tsx, shared with the PanelShell; behaviour unchanged. The side menu of staff now has a single "Panel docente" item (nav.config v1.15). v1.11 (Bloque 5, §5.1, D10-D14): the July global sidebar. Desktop (>= 900px): a permanent drawer of 15rem that collapses to 4rem (useSidebarCollapsed, key "ventylab.sidebar.collapsed", separate from the panel, D13) with a header ("VentyLab" → role home, hidden when collapsed, and the "Contraer menú" / "Expandir menú" toggle with aria-expanded and aria-controls on the nav), the NavList in its July "sidebar" variant (icons + tooltips when collapsed, the separated "Panel docente" item), the "Herramientas" group (role="group": the realtime status, compact when collapsed, and the slot actions such as the AI assistant and the notifications bell, told through ShellActionsPlacementProvider that they are in the sidebar), the user card (SidebarUserCard: profile link and "Opciones" menu; avatar only when collapsed) and "VentyLab v0.1.0" (APP_VERSION of shell.config, hidden when collapsed). The desktop top bar is gone. Below 900px a thin mobile bar (banner) keeps the "Abrir menú de navegación" button, "VentyLab" and the tools (placement "topbar", D14), and the temporary drawer shows the expanded sidebar with the user card; the tools render in one place only, chosen with useMediaQuery (mobile before hydration). The main region paints --vl-color-bg-gradient. v1.12 (Ola 0 closure): the main region starts with ApiContractBanner (ADMIN only: the server misses `GET /api/version` or reports another API contract). v1.13: (Ajustes D4): the header shows the VentyLab logo (BrandLogo, light or dark variant by mode) instead of the text, and the "Apariencia" controls (mode and palette; a menu button when collapsed) sit right above the user card, also in the mobile drawer.
* Versión: 1.13
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

import ChevronLeftIcon from "@mui/icons-material/ChevronLeft";
import MenuIcon from "@mui/icons-material/Menu";
import AppBar from "@mui/material/AppBar";
import Drawer from "@mui/material/Drawer";
import IconButton from "@mui/material/IconButton";
import Toolbar from "@mui/material/Toolbar";
import Typography from "@mui/material/Typography";
import useMediaQuery from "@mui/material/useMediaQuery";
import Link from "next/link";
import { useRouter } from "next/router";
import { useId, useState } from "react";
import type { ReactNode } from "react";
import { BrandLogo } from "@shared/design-system/components/brand-logo";
import { RouteErrorBoundary } from "@shared/design-system/components/route-error-boundary";
import { ApiContractBanner } from "./api-contract-banner";
import { AppearanceControls } from "./appearance-controls";
import { DEFAULT_ROUTE_BY_ROLE } from "@shared/session/routes.config";
import { cx } from "@shared/lib/class-names";
import { useSession } from "@shared/session/use-session";
import { useNavBadgeCounts, useNavBadgeHost } from "./nav-badges";
import type { NavBadgeCounts } from "./nav-badges";
import { NavList } from "./nav-list";
import { useNavIndicatorHost, useNavIndicators } from "./nav-indicators";
import type { NavIndicatorKey, NavIndicators } from "./nav-indicators";
import { findActiveHref, getNavItems } from "./nav.config";
import { RealtimeIndicator } from "./shell-controls";
import { APP_NAME, APP_VERSION, SHELL_DESKTOP_QUERY } from "./shell.config";
import { SidebarUserCard } from "./sidebar-user-card";
import { ShellActionsPlacementProvider, useTopBarActions } from "./top-bar-actions";
import { useSidebarCollapsed } from "./use-collapsed-preference";
import type { NavItem } from "./nav.config";
import styles from "./UI/app-shell.module.css";

const MAIN_CONTENT_ID = "main-content";

// TODO(i18n): see nav.config.
export const SHELL_COPY = {
  navigationLabel: "Navegación principal",
  collapse: "Contraer menú",
  expand: "Expandir menú",
  openMobile: "Abrir menú de navegación",
  tools: "Herramientas",
  version: `${APP_NAME} v${APP_VERSION}`,
  skipToContent: "Saltar al contenido principal",
} as const;

function noop() {}

export type AppShellProps = {
  children: ReactNode
};

type SidebarProps = {
  navId?: string
  items: readonly NavItem[]
  activeHref: string | null
  homeHref: string
  badges: NavBadgeCounts
  indicators: NavIndicators
  collapsed?: boolean
  onToggle?: () => void
  onNavigate?: () => void
  // The shell tools row (realtime status, AI assistant, notifications); absent in the mobile drawer.
  tools?: ReactNode
};

function Sidebar({ navId, items, activeHref, homeHref, badges, indicators, collapsed = false, onToggle, onNavigate = noop, tools }: SidebarProps) {
  return (
    <div className={cx(styles.sidebar, collapsed && styles.sidebarCollapsed)}>
      <div className={styles.sidebarHeader}>
        {collapsed ? null : (
          <Link href={homeHref} className={styles.brand} onClick={onNavigate}>
            <BrandLogo alt={APP_NAME} priority />
          </Link>
        )}
        {onToggle && navId ? (
          <IconButton
            aria-label={collapsed ? SHELL_COPY.expand : SHELL_COPY.collapse}
            aria-expanded={!collapsed}
            aria-controls={navId}
            onClick={onToggle}
            className={cx(styles.toggle)}
          >
            {collapsed ? <MenuIcon /> : <ChevronLeftIcon />}
          </IconButton>
        ) : null}
      </div>
      <nav id={navId} aria-label={SHELL_COPY.navigationLabel} className={styles.navigation}>
        <NavList
          items={items}
          activeHref={activeHref}
          badges={badges}
          indicators={indicators}
          onNavigate={onNavigate}
          collapsed={collapsed}
          variant="sidebar"
        />
      </nav>
      {tools === undefined ? null : (
        <div role="group" aria-label={SHELL_COPY.tools} className={styles.tools}>
          {tools}
        </div>
      )}
      <AppearanceControls collapsed={collapsed} />
      <SidebarUserCard collapsed={collapsed} />
      {collapsed ? null : <p className={styles.version}>{SHELL_COPY.version}</p>}
    </div>
  );
}

export function AppShell({ children }: AppShellProps) {
  const { role } = useSession();
  const router = useRouter();
  const navId = useId();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [collapsed, toggleCollapsed] = useSidebarCollapsed();
  // The tools render once: in the sidebar on desktop, in the mobile bar below md (false before hydration).
  const desktop = useMediaQuery(SHELL_DESKTOP_QUERY);
  const items = getNavItems(role);
  const badges = useNavBadgeCounts();
  const topBarActions = useTopBarActions();
  const indicators = useNavIndicators();
  const indicatorKeys = items.flatMap((item): NavIndicatorKey[] => (item.indicator ? [item.indicator] : []));

  useNavBadgeHost();
  useNavIndicatorHost(indicatorKeys);
  const activeHref = findActiveHref(items, router.pathname);
  const homeHref = role ? DEFAULT_ROUTE_BY_ROLE[role] : "/";
  const closeMobile = () => setMobileOpen(false);
  const sidebarTools = desktop ? (
    <ShellActionsPlacementProvider placement="sidebar">
      <RealtimeIndicator compact={collapsed} />
      {topBarActions}
    </ShellActionsPlacementProvider>
  ) : undefined;

  return (
    <div className={cx(styles.root, collapsed && styles.rootCollapsed)}>
      <a href={`#${MAIN_CONTENT_ID}`} className={styles.skipLink}>
        {SHELL_COPY.skipToContent}
      </a>
      <div className={styles.desktopNav}>
        <Drawer variant="permanent" open classes={{ paper: cx(styles.drawerPaper) }}>
          <Sidebar
            navId={navId}
            items={items}
            activeHref={activeHref}
            homeHref={homeHref}
            badges={badges}
            indicators={indicators}
            collapsed={collapsed}
            onToggle={toggleCollapsed}
            tools={sidebarTools}
          />
        </Drawer>
      </div>
      <Drawer variant="temporary" open={mobileOpen} onClose={closeMobile} classes={{ paper: cx(styles.mobilePaper) }}>
        <Sidebar
          items={items}
          activeHref={activeHref}
          homeHref={homeHref}
          badges={badges}
          indicators={indicators}
          onNavigate={closeMobile}
        />
      </Drawer>
      <div className={styles.column}>
        <AppBar position="sticky" color="default" elevation={0} className={cx(styles.mobileBar)}>
          <Toolbar className={cx(styles.toolbar)}>
            <IconButton edge="start" aria-label={SHELL_COPY.openMobile} onClick={() => setMobileOpen(true)}>
              <MenuIcon />
            </IconButton>
            <Typography variant="h6" component="span" className={cx(styles.title)}>
              {APP_NAME}
            </Typography>
            {desktop ? null : (
              <ShellActionsPlacementProvider placement="topbar">
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
