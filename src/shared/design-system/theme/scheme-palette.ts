/*
* Funcionalidad: MUI scheme palette builder
* Descripción: Turns one scheme of theme-palettes.ts into the MUI palette options of a color scheme (mode, brand and status roles, background, text, divider, actions and the custom curriculum key), shared by the app theme (theme.ts, VentyLab light and dark) and by the stylesheet generator of the palette overrides (palette-stylesheet.ts, which needs the --mui-palette-* variables MUI emits for Univalle). Depends on ./palette and ./theme-palettes.
* Versión: 1.0
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

import { levelColors } from "./palette";
import type { SchemeDefinition, ThemeMode } from "./theme-palettes";

/** MUI palette options of one color scheme. */
export function buildSchemePalette(mode: ThemeMode, scheme: SchemeDefinition) {
  const { mui } = scheme;

  return {
    mode,
    primary: { ...mui.primary },
    secondary: { ...mui.secondary },
    success: { ...mui.success },
    warning: { ...mui.warning },
    error: { ...mui.error },
    info: { ...mui.info },
    background: { ...mui.background },
    text: { ...mui.text },
    divider: mui.divider,
    action: { ...mui.action },
    curriculum: {
      beginner: levelColors.beginner,
      intermediate: levelColors.intermediate,
      advanced: levelColors.advanced,
    },
  };
}
