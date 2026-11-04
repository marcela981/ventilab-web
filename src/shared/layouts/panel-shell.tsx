/*
* Funcionalidad: PanelShell
* Descripción: Chrome of the staff panel, a space of its own as in July (PanelLayout + PanelSidebar; DISENO_BLOQUE4 §2.1): it replaces the AppShell on the staff pages (TeacherLayout, AdminLayout and the staff branch of /evaluations). Skip link to the main region; a side menu (nav landmark "Navegación del panel") with the panel title, the role-filtered items of panel-nav.config (shared NavList: aria-current on the active item = longest matching route, the "Administración" section, the gradingPending badge on Evaluaciones and the ventilatorDevice indicator on Laboratorio) and the footer link "Volver a la plataforma" → /simulador. On desktop (>= md) the menu is a permanent drawer that collapses to icons with a toggle (aria-expanded, aria-controls) whose state lives in localStorage (usePanelCollapsed, try/catch); below md it is a temporary drawer opened from the header. The header shows the panel title, the realtime chip, the top-bar actions (AI assistant, notifications), the user's name and email with a role chip and the user menu (Perfil, Cerrar sesión). Registers itself as the nav-badge host and as the indicator host of its items, so the feeders keep working inside the panel. Page content renders inside RouteErrorBoundary, reset on route change. It does not guard by itself (the layouts wrap it in RequireRole/RequireAuth). Depends on MUI, next/link, next/router, @shared/session, the design-system route error boundary and the layouts registries.
* Versión: 1.0
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

import AdminPanelSettingsIcon from "@mui/icons-material/AdminPanelSettings";
import ChevronLeftIcon from "@mui/icons-material/ChevronLeft";
import ChevronRightIcon from "@mui/icons-material/ChevronRight";
import KeyboardReturnIcon from "@mui/icons-material/KeyboardReturn";
import MenuIcon from "@mui/icons-material/Menu";
import AppBar from "@mui/material/AppBar";
import Chip from "@mui/material/Chip";
import Divider from "@mui/material/Divider";
import Drawer from "@mui/material/Drawer";
import IconButton from "@mui/material/IconButton";
import ListItemButton from "@mui/material/ListItemButton";
import ListItemIcon from "@mui/material/ListItemIcon";
import ListItemText from "@mui/material/ListItemText";
import Toolbar from "@mui/material/Toolbar";
import Typography from "@mui/material/Typography";
import Link from "next/link";
import { useRouter } from "next/router";
import { useId, useState } from "react";
import type { ReactNode } from "react";
import { RouteErrorBoundary } from "@shared/design-system/components/route-error-boundary";
import { cx } from "@shared/lib/class-names";
import { useSession } from "@shared/session/use-session";
import { useNavBadgeCounts, useNavBadgeHost } from "./nav-badges";
import type { NavBadgeCounts } from "./nav-badges";
import { useNavIndicatorHost, useNavIndicators } from "./nav-indicators";
import type { NavIndicatorKey, NavIndicators } from "./nav-indicators";
import { NavList } from "./nav-list";
import { findActiveHref } from "./nav.config";
import type { NavItem } from "./nav.config";
import { getPanelNavItems, PANEL_BACK_HREF, PANEL_COPY, PANEL_ROLE_LABELS } from "./panel-nav.config";
import { RealtimeIndicator, UserMenu } from "./shell-controls";
import { useTopBarActions } from "./top-bar-actions";
import { usePanelCollapsed } from "./use-panel-collapsed";
import styles from "./UI/panel-shell.module.css";

const MAIN_CONTENT_ID = "panel-main-content";

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
};

function PanelNavigation({ id, items, activeHref, badges, indicators, collapsed = false, onToggle, onNavigate = noop }: PanelNavigationProps) {
  return (
    <nav id={id} aria-label={PANEL_COPY.navigationLabel} className={cx(styles.navigation, collapsed && styles.collapsed)}>
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
      <Divider />
      <div className={styles.navItems}>
        <NavList
          items={items}
          activeHref={activeHref}
          badges={badges}
          indicators={indicators}
          onNavigate={onNavigate}
          collapsed={collapsed}
        />
      </div>
      <Divider />
      <ListItemButton component={Link} href={PANEL_BACK_HREF} onClick={onNavigate} className={cx(styles.back)}>
        <ListItemIcon>
          <KeyboardReturnIcon />
        </ListItemIcon>
        <ListItemText primary={PANEL_COPY.backToPlatform} className={cx(styles.backLabel)} />
      </ListItemButton>
    </nav>
  );
}

export function PanelShell({ children }: PanelShellProps) {
  const { user, role } = useSession();
  const router = useRouter();
  const navId = useId();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [collapsed, toggleCollapsed] = usePanelCollapsed();
  const items = getPanelNavItems(role);
  const badges = useNavBadgeCounts();
  const indicators = useNavIndicators();
  const topBarActions = useTopBarActions();
  const indicatorKeys = items.flatMap((item): NavIndicatorKey[] => (item.indicator ? [item.indicator] : []));

  useNavBadgeHost();
  useNavIndicatorHost(indicatorKeys);
  const activeHref = findActiveHref(items, router.pathname);
  const closeMobile = () => setMobileOpen(false);

  return (
    <div className={cx(styles.root, collapsed && styles.rootCollapsed)}>
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
          />
        </Drawer>
      </div>
      <Drawer variant="temporary" open={mobileOpen} onClose={closeMobile} classes={{ paper: cx(styles.mobilePaper) }}>
        <PanelNavigation items={items} activeHref={activeHref} badges={badges} indicators={indicators} onNavigate={closeMobile} />
      </Drawer>
      <div className={styles.column}>
        <AppBar position="sticky" color="default" elevation={0} className={cx(styles.header)}>
          <Toolbar className={cx(styles.toolbar)}>
            <span className={styles.menuButton}>
              <IconButton edge="start" aria-label={PANEL_COPY.openMobile} onClick={() => setMobileOpen(true)}>
                <MenuIcon />
              </IconButton>
            </span>
            <Typography variant="h6" component="span" className={cx(styles.title)}>
              {PANEL_COPY.title}
            </Typography>
            <RealtimeIndicator />
            {topBarActions}
            {user ? (
              <span className={styles.identity}>
                <span className={styles.identityText}>
                  <span className={styles.identityName}>{user.name ?? user.email}</span>
                  <span className={styles.identityEmail}>{user.email}</span>
                </span>
                {role ? <Chip label={PANEL_ROLE_LABELS[role]} size="small" color="primary" variant="outlined" /> : null}
              </span>
            ) : null}
            <UserMenu />
          </Toolbar>
        </AppBar>
        <main id={MAIN_CONTENT_ID} tabIndex={-1} className={styles.main}>
          <RouteErrorBoundary resetKey={router.asPath}>{children}</RouteErrorBoundary>
        </main>
      </div>
    </div>
  );
}
