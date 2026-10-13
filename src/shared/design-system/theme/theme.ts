/*
* Funcionalidad: VentyLab MUI theme
* Descripción: Official light identity as an MUI v7 theme with cssVariables enabled, so CSS Modules can read var(--mui-palette-*), var(--mui-shadows-*), var(--mui-font-*) and friends. Reproduces the previous src/theme/theme.js values (palette incl. custom keys, typography, spacing, shape, breakpoints, transitions, shadows, component overrides) and wires the self-hosted Roboto. Depends on @mui/material, ./palette and ./roboto.
* Versión: 1.0
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

import { createTheme, type Shadows } from "@mui/material/styles";
import { colors, getColorWithOpacity, levelColors } from "./palette";
import { fontFamily } from "./roboto";

const EASE_STANDARD = "cubic-bezier(0.4, 0, 0.2, 1)";
const TRANSITION_ALL = `all 0.3s ${EASE_STANDARD}`;

const SHADOW_LEVEL_3 = "0 4px 12px rgba(0, 0, 0, 0.08), 0 2px 6px rgba(0, 0, 0, 0.06)";

// MUI requires 25 elevation levels: 0-5 are custom, the rest repeat level 3.
const shadows = [
  "none",
  "0 1px 3px rgba(0, 0, 0, 0.08), 0 1px 2px rgba(0, 0, 0, 0.06)",
  "0 2px 6px rgba(0, 0, 0, 0.08), 0 2px 4px rgba(0, 0, 0, 0.06)",
  SHADOW_LEVEL_3,
  "0 8px 20px rgba(0, 0, 0, 0.08), 0 4px 8px rgba(0, 0, 0, 0.06)",
  "0 12px 28px rgba(0, 0, 0, 0.10), 0 6px 12px rgba(0, 0, 0, 0.08)",
  ...Array<string>(19).fill(SHADOW_LEVEL_3),
] as Shadows;

export const theme = createTheme({
  cssVariables: true,
  colorSchemes: {
    light: {
      palette: {
        mode: "light",
        primary: {
          main: colors.primary,
          light: colors.accent,
          dark: colors.secondary,
          contrastText: "#ffffff",
        },
        secondary: {
          main: colors.secondary,
          light: colors.accent,
          dark: "#0a112b",
          contrastText: "#ffffff",
        },
        success: {
          main: colors.success,
          light: "#81c784",
          dark: "#388e3c",
          contrastText: "#ffffff",
        },
        warning: {
          main: colors.warning,
          light: "#ffb74d",
          dark: "#f57c00",
          contrastText: "#ffffff",
        },
        error: {
          main: colors.error,
          light: "#e57373",
          dark: "#d32f2f",
          contrastText: "#ffffff",
        },
        info: {
          main: colors.info,
          light: colors.accent,
          dark: colors.secondary,
          contrastText: "#ffffff",
        },
        background: {
          default: colors.backgroundDefault,
          paper: colors.backgroundPaper,
          contrast: colors.backgroundContrast,
        },
        text: {
          primary: colors.textPrimary,
          secondary: colors.textSecondary,
          disabled: colors.textDisabled,
          hint: colors.textHint,
        },
        divider: colors.borderLight,
        action: {
          active: colors.primary,
          hover: getColorWithOpacity(colors.primary, 0.08),
          selected: getColorWithOpacity(colors.primary, 0.12),
          disabled: colors.textDisabled,
          disabledBackground: colors.borderLight,
          focus: getColorWithOpacity(colors.primary, 0.12),
        },
        curriculum: {
          beginner: levelColors.beginner,
          intermediate: levelColors.intermediate,
          advanced: levelColors.advanced,
        },
      },
    },
  },

  typography: {
    fontFamily,
    fontWeightLight: 300,
    fontWeightRegular: 400,
    fontWeightMedium: 500,
    fontWeightBold: 700,
    h1: { fontSize: "2.5rem", fontWeight: 600, lineHeight: 1.2, letterSpacing: "-0.5px", color: colors.textPrimary },
    h2: { fontSize: "2rem", fontWeight: 600, lineHeight: 1.3, letterSpacing: "-0.5px", color: colors.textPrimary },
    h3: { fontSize: "1.75rem", fontWeight: 600, lineHeight: 1.3, color: colors.textPrimary },
    h4: { fontSize: "1.5rem", fontWeight: 600, lineHeight: 1.4, color: colors.textPrimary },
    h5: { fontSize: "1.25rem", fontWeight: 600, lineHeight: 1.4, color: colors.textPrimary },
    h6: { fontSize: "1.125rem", fontWeight: 600, lineHeight: 1.4, color: colors.textPrimary },
    body1: { fontSize: "1rem", fontWeight: 400, lineHeight: 1.5, color: colors.textPrimary },
    body2: { fontSize: "0.875rem", fontWeight: 400, lineHeight: 1.6, color: colors.textSecondary },
    button: {
      fontSize: "0.875rem",
      fontWeight: 600,
      lineHeight: 1.75,
      textTransform: "none",
      letterSpacing: "0.02em",
    },
    caption: { fontSize: "0.75rem", fontWeight: 400, lineHeight: 1.66, color: colors.textSecondary },
    overline: {
      fontSize: "0.75rem",
      fontWeight: 600,
      lineHeight: 2.66,
      textTransform: "uppercase",
      letterSpacing: "0.08em",
      color: colors.textSecondary,
    },
    subtitle1: { fontSize: "1rem", fontWeight: 500, lineHeight: 1.75, color: colors.textPrimary },
    subtitle2: { fontSize: "0.875rem", fontWeight: 600, lineHeight: 1.57, color: colors.textPrimary },
  },

  spacing: 8,

  shape: {
    borderRadius: 8,
  },

  breakpoints: {
    values: { xs: 0, sm: 600, md: 960, lg: 1280, xl: 1920 },
  },

  transitions: {
    duration: {
      shortest: 150,
      shorter: 200,
      short: 250,
      standard: 300,
      complex: 375,
      enteringScreen: 225,
      leavingScreen: 195,
    },
    easing: {
      easeInOut: EASE_STANDARD,
      easeOut: "cubic-bezier(0.0, 0, 0.2, 1)",
      easeIn: "cubic-bezier(0.4, 0, 1, 1)",
      sharp: "cubic-bezier(0.4, 0, 0.6, 1)",
    },
  },

  shadows,

  components: {
    MuiButton: {
      defaultProps: { disableElevation: true },
      styleOverrides: {
        root: {
          borderRadius: 8,
          textTransform: "none",
          fontWeight: 600,
          padding: "8px 20px",
          transition: TRANSITION_ALL,
          "&:hover": { transform: "translateY(-1px)" },
        },
        contained: {
          boxShadow: "none",
          "&:hover": { boxShadow: "0 4px 12px rgba(16, 174, 222, 0.3)" },
        },
        outlined: {
          borderWidth: "1px",
          "&:hover": { borderWidth: "1px" },
        },
      },
    },
    MuiCard: {
      defaultProps: { elevation: 0 },
      styleOverrides: {
        root: {
          borderRadius: 12,
          border: `1px solid ${colors.borderLight}`,
          transition: TRANSITION_ALL,
        },
      },
    },
    MuiPaper: {
      defaultProps: { elevation: 0 },
      styleOverrides: {
        root: { backgroundImage: "none" },
        rounded: { borderRadius: 8 },
      },
    },
    MuiChip: {
      styleOverrides: {
        root: { fontWeight: 500, transition: TRANSITION_ALL },
      },
    },
    MuiLinearProgress: {
      styleOverrides: {
        root: { borderRadius: 4, backgroundColor: getColorWithOpacity(colors.textDisabled, 0.1) },
        bar: { borderRadius: 4 },
      },
    },
    MuiTextField: {
      defaultProps: { variant: "outlined" },
      styleOverrides: {
        root: {
          "& .MuiOutlinedInput-root": { borderRadius: 8, transition: TRANSITION_ALL },
        },
      },
    },
    MuiTab: {
      styleOverrides: {
        root: { textTransform: "none", fontWeight: 500, fontSize: "0.875rem", transition: TRANSITION_ALL },
      },
    },
    MuiTabs: {
      styleOverrides: {
        indicator: { height: 3, borderRadius: "3px 3px 0 0" },
      },
    },
    MuiTooltip: {
      styleOverrides: {
        tooltip: {
          backgroundColor: colors.backgroundContrast,
          fontSize: "0.75rem",
          borderRadius: 6,
          padding: "8px 12px",
        },
        arrow: { color: colors.backgroundContrast },
      },
    },
  },
});
