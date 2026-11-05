/*
* Funcionalidad: Appearance controls of the sidebars
* Descripción: "Apariencia" group at the foot of the global sidebar, the mobile drawer and the staff panel, next to the user card (DISENO_AJUSTES_D §6.4): mode Claro/Oscuro and palette VentyLab/Univalle as two exclusive ToggleButtonGroups (LightMode/DarkMode icons; aria-pressed on each option). Collapsed, an IconButton "Apariencia" (Palette icon, tooltip) opens a menu with the same choices as radio items (menuitemradio + aria-checked) under the "Modo" and "Paleta" headers, opening to the right of the button like the "Opciones" menu; inside the staff panel the menu portal carries the panel data-surface. Each choice applies at once and is saved for the user (useAppearance); while the mode follows the system, pressing the mode on screen makes it an explicit choice. Depends on MUI, React and ./use-appearance.
* Versión: 1.0
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

import CheckIcon from "@mui/icons-material/Check";
import DarkModeIcon from "@mui/icons-material/DarkMode";
import LightModeIcon from "@mui/icons-material/LightMode";
import PaletteIcon from "@mui/icons-material/Palette";
import Divider from "@mui/material/Divider";
import IconButton from "@mui/material/IconButton";
import ListItemIcon from "@mui/material/ListItemIcon";
import ListSubheader from "@mui/material/ListSubheader";
import Menu from "@mui/material/Menu";
import MenuItem from "@mui/material/MenuItem";
import ToggleButton from "@mui/material/ToggleButton";
import ToggleButtonGroup from "@mui/material/ToggleButtonGroup";
import Tooltip from "@mui/material/Tooltip";
import { useId, useState } from "react";
import type { MouseEvent, ReactNode } from "react";
import type { ThemeMode, ThemePaletteId } from "@shared/design-system/theme/theme-palettes";
import { cx } from "@shared/lib/class-names";
import { useAppearance } from "./use-appearance";
import styles from "./UI/appearance-controls.module.css";

// TODO(i18n): see nav.config.
export const APPEARANCE_COPY = {
  title: "Apariencia",
  mode: "Modo",
  palette: "Paleta",
} as const;

type Option<T extends string> = { value: T, label: string, icon?: ReactNode };

const MODE_OPTIONS: ReadonlyArray<Option<ThemeMode>> = [
  { value: "light", label: "Claro", icon: <LightModeIcon fontSize="small" /> },
  { value: "dark", label: "Oscuro", icon: <DarkModeIcon fontSize="small" /> },
];

const PALETTE_OPTIONS: ReadonlyArray<Option<ThemePaletteId>> = [
  { value: "ventylab", label: "VentyLab" },
  { value: "univalle", label: "Univalle" },
];

export type AppearanceControlsProps = {
  collapsed?: boolean
  variant?: "sidebar" | "panel"
};

export function AppearanceControls({ collapsed = false, variant = "sidebar" }: AppearanceControlsProps) {
  const { mode, modeChosen, palette, setMode, setPalette } = useAppearance();
  // Pressing the mode already on screen while following the system makes it an explicit choice.
  const chooseMode = (value: ThemeMode | null) => {
    const next = value ?? (modeChosen ? null : mode);
    if (next) setMode(next);
  };
  const titleId = useId();
  const menuId = useId();
  const [menuAnchor, setMenuAnchor] = useState<HTMLElement | null>(null);

  if (collapsed) {
    const close = () => setMenuAnchor(null);
    const surfaceProps = variant === "panel" ? { slotProps: { root: { "data-surface": "panel" } } } : {};
    const radio = <T extends string>(option: Option<T>, selected: T, choose: (value: T) => void) => (
      <MenuItem
        key={option.value}
        role="menuitemradio"
        aria-checked={option.value === selected}
        selected={option.value === selected}
        onClick={() => choose(option.value)}
      >
        <ListItemIcon>{option.value === selected ? <CheckIcon fontSize="small" /> : null}</ListItemIcon>
        {option.label}
      </MenuItem>
    );

    return (
      <div className={cx(styles.root, styles.collapsed)} data-variant={variant}>
        <Tooltip title={APPEARANCE_COPY.title} placement="right" describeChild>
          <IconButton
            aria-label={APPEARANCE_COPY.title}
            aria-haspopup="menu"
            aria-expanded={menuAnchor !== null}
            {...(menuAnchor ? { "aria-controls": menuId } : {})}
            onClick={(event: MouseEvent<HTMLElement>) => setMenuAnchor(event.currentTarget)}
            className={cx(styles.trigger)}
          >
            <PaletteIcon />
          </IconButton>
        </Tooltip>
        <Menu
          id={menuId}
          anchorEl={menuAnchor}
          open={menuAnchor !== null}
          onClose={close}
          anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
          transformOrigin={{ vertical: "bottom", horizontal: "left" }}
          {...surfaceProps}
        >
          <ListSubheader className={cx(styles.menuHeader)}>{APPEARANCE_COPY.mode}</ListSubheader>
          {MODE_OPTIONS.map((option) => radio(option, mode, (value: ThemeMode) => chooseMode(value)))}
          <Divider />
          <ListSubheader className={cx(styles.menuHeader)}>{APPEARANCE_COPY.palette}</ListSubheader>
          {PALETTE_OPTIONS.map((option) => radio(option, palette, setPalette))}
        </Menu>
      </div>
    );
  }

  return (
    <div role="group" aria-labelledby={titleId} className={styles.root} data-variant={variant}>
      <span id={titleId} className={styles.title}>{APPEARANCE_COPY.title}</span>
      <ToggleButtonGroup
        exclusive
        size="small"
        fullWidth
        value={mode}
        aria-label={APPEARANCE_COPY.mode}
        onChange={(_event, value: ThemeMode | null) => chooseMode(value)}
        className={cx(styles.group)}
      >
        {MODE_OPTIONS.map((option) => (
          <ToggleButton key={option.value} value={option.value} className={cx(styles.option)}>
            {option.icon}
            <span className={styles.optionLabel}>{option.label}</span>
          </ToggleButton>
        ))}
      </ToggleButtonGroup>
      <ToggleButtonGroup
        exclusive
        size="small"
        fullWidth
        value={palette}
        aria-label={APPEARANCE_COPY.palette}
        onChange={(_event, value: ThemePaletteId | null) => value && setPalette(value)}
        className={cx(styles.group)}
      >
        {PALETTE_OPTIONS.map((option) => (
          <ToggleButton key={option.value} value={option.value} className={cx(styles.option)}>
            <span className={styles.optionLabel}>{option.label}</span>
          </ToggleButton>
        ))}
      </ToggleButtonGroup>
    </div>
  );
}
