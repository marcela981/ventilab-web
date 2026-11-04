/*
* Funcionalidad: NavList
* Descripción: Navigation list shared by the AppShell and the PanelShell (extracted from the AppShell, W1 Bloque 4): one next/link item per NavItem with its icon, the active item marked with aria-current="page" (selected), a section subheader before the first item of each section, the badge count from the nav-badges registry on the icon (hidden at 0; the accessible name carries the differentiated count, "Evaluación, 2 pendientes por calificar", and the visible number stays aria-hidden) and the small status of the nav-indicators registry (dot + text, `data-indicator-tone`). `collapsed` keeps only the icons on screen: the label and the indicator text become visually hidden (still the accessible name), a tooltip shows the label and the section subheaders become dividers. v1.1 (Bloque 5): an item with `separated` gets a plain divider before it (no subheader text); `variant` ("sidebar" | "panel", data-variant on the list) selects the July item skin of nav-list.module.css: the global sidebar pill (48px, flat left edge, white 15% active background, semibold label) or the staff panel item. Depends on MUI, next/link and the nav-badges and nav-indicators registries.
* Versión: 1.1
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

import Badge from "@mui/material/Badge";
import Divider from "@mui/material/Divider";
import List from "@mui/material/List";
import ListItemButton from "@mui/material/ListItemButton";
import ListItemIcon from "@mui/material/ListItemIcon";
import ListItemText from "@mui/material/ListItemText";
import ListSubheader from "@mui/material/ListSubheader";
import Tooltip from "@mui/material/Tooltip";
import Link from "next/link";
import { Fragment } from "react";
import type { ReactElement } from "react";
import { cx } from "@shared/lib/class-names";
import { navBadgeText } from "./nav-badges";
import type { NavBadgeCounts } from "./nav-badges";
import type { NavIndicators } from "./nav-indicators";
import type { NavItem } from "./nav.config";
import styles from "./UI/nav-list.module.css";

export type NavListProps = {
  items: readonly NavItem[]
  activeHref: string | null
  badges: NavBadgeCounts
  indicators: NavIndicators
  onNavigate?: (() => void) | undefined
  // Icons only (the collapsed side menus); labels stay as the accessible names.
  collapsed?: boolean
  // Skin of the items: the July global sidebar pill or the July staff panel item (Bloque 5).
  variant?: NavListVariant
};

export type NavListVariant = "sidebar" | "panel";

const BADGE_MAX = 99;
// The visible number is decorative: the accessible name of the item carries the count.
const HIDDEN_BADGE_SLOT = { badge: { "aria-hidden": true } } as const;

function noop() {}

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

function withTooltip(label: string, collapsed: boolean, element: ReactElement): ReactElement {
  // describeChild: the tooltip never replaces the item's accessible name (label + count).
  return collapsed ? <Tooltip title={label} placement="right" describeChild>{element}</Tooltip> : element;
}

export function NavList({ items, activeHref, badges, indicators, onNavigate = noop, collapsed = false, variant }: NavListProps) {
  return (
    <List className={cx(styles.list, collapsed && styles.collapsed)} data-variant={variant}>
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
        let sectionHeader = null;

        if (opensSection) {
          sectionHeader = collapsed
            ? <Divider component="li" aria-hidden="true" className={cx(styles.divider)} />
            : <ListSubheader disableSticky className={cx(styles.section)}>{item.section}</ListSubheader>;
        } else if (item.separated) {
          // A plain divider, no subheader text (e.g. before the staff "Panel docente" item).
          sectionHeader = <Divider component="li" aria-hidden="true" className={cx(styles.divider)} />;
        }

        return (
          <Fragment key={item.href}>
            {sectionHeader}
            {withTooltip(item.label, collapsed, (
              <ListItemButton
                component={Link}
                href={item.href}
                selected={active}
                className={cx(styles.item)}
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
                <ListItemText primary={item.label} className={cx(styles.label)} />
                {indicator ? (
                  <span className={styles.indicator} data-indicator-tone={indicator.tone}>
                    <span className={styles.indicatorDot} aria-hidden="true" />
                    <span className={styles.indicatorText}>{indicator.text}</span>
                  </span>
                ) : null}
              </ListItemButton>
            ))}
          </Fragment>
        );
      })}
    </List>
  );
}
