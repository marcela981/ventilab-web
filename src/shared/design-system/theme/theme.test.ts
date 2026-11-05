/*
* Funcionalidad: VentyLab MUI theme tests
* Descripción: Verifies the cssVariables theme keeps the official light identity: CSS variables enabled, primary.main, shape radius, custom palette keys, the CSS variables tokens.css relies on, and the legacy color helpers. next/font is mocked because it only runs inside the Next compiler. Depends on vitest. v1.1 (Bloque 5): the July dark scheme is the default (selector [data-mui-color-scheme]), the light scheme keeps its values with the AA fix of the secondary text, and both draw navy text on the primary (D2). v1.2 (Bloque 5): the declared font weights are only the loaded ones (light = 400, D3). v1.3 (Ajustes D4): the VentyLab light scheme is the AA blue-and-green one of theme-palettes.ts (white text on the darkened brand blue); dark keeps the July values with navy text on every fill.
* Versión: 1.3
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

import { describe, expect, it, vi } from "vitest";
import { colors, getColorWithOpacity, getLevelColor, getStatusColor, levelColors, theme } from "./index";

// Hoisted by vitest above the imports.
vi.mock("next/font/google", () => ({
  Roboto: () => ({ className: "roboto", style: { fontFamily: "'Roboto', 'Roboto Fallback'" } }),
}));

// createTheme types the result as Theme; with colorSchemes the runtime object also carries these.
const schemed = theme as typeof theme & {
  defaultColorScheme: string,
  colorSchemes: Partial<Record<"light" | "dark", { palette: typeof theme.palette }>>,
  getColorSchemeSelector: (scheme: string) => string,
};

// MUI var() references carry a fallback (e.g. "var(--mui-spacing, 8px)"); match the name only.
const expectCssVar = (value: unknown, name: string) => {
  expect(String(value).startsWith(`var(${name}`)).toBe(true);
  expect(String(value).charAt(`var(${name}`.length)).toMatch(/[,)]/);
};

describe("design-system theme", () => {
  it("enables MUI CSS variables", () => {
    expect(theme.vars).toBeDefined();
    expectCssVar(theme.vars?.palette.primary.main, "--mui-palette-primary-main");
  });

  it("uses the July dark scheme by default with the data attribute selector", () => {
    expect(schemed.defaultColorScheme).toBe("dark");
    expect(theme.palette.mode).toBe("dark");
    expect(theme.palette.primary.main).toBe("#10aede");
    expect(theme.palette.background.default).toBe("#0a112b");
    expect(theme.palette.background.paper).toBe("#161d36");
    expect(theme.palette.text.primary).toBe("#e8f4fd");
    expect(theme.palette.text.secondary).toBe("rgba(232, 244, 253, 0.7)");
    expect(theme.palette.divider).toBe("rgba(255, 255, 255, 0.12)");
    expect(schemed.getColorSchemeSelector("light")).toBe('[data-mui-color-scheme="light"] &');
  });

  it("uses the VentyLab light scheme of theme-palettes (blues and greens, AA) as the second scheme", () => {
    const light = schemed.colorSchemes.light?.palette;
    expect(light?.mode).toBe("light");
    expect(light?.primary.main).toBe("#0b6e99");
    expect(light?.primary.contrastText).toBe("#ffffff");
    expect(light?.secondary.main).toBe("#3b7a1e");
    expect(light?.background.default).toBe("#f5f9fc");
    expect(light?.background.paper).toBe("#ffffff");
    expect(light?.text.primary).toBe("#0a112b");
    expect(light?.text.secondary).toBe("#5b6472");
  });

  it("draws navy text on the cyan primary and the status fills of the dark scheme (D2)", () => {
    const dark = schemed.colorSchemes.dark?.palette;
    expect(dark?.primary.contrastText).toBe("#0a112b");
    expect(dark?.error.contrastText).toBe("#0a112b");
    expect(dark?.warning.contrastText).toBe("#0a112b");
  });

  it("keeps shape, spacing and custom breakpoints", () => {
    expect(theme.shape.borderRadius).toBe(8);
    expect(theme.breakpoints.values.md).toBe(960);
    expect(theme.breakpoints.values.lg).toBe(1280);
    expect(theme.shadows).toHaveLength(25);
  });

  it("exposes the custom palette keys", () => {
    expect(theme.palette.curriculum.beginner.main).toBe("#4CAF50");
    expect(theme.palette.curriculum.advanced.opacity10).toBe("rgba(244, 67, 54, 0.1)");
    expect(theme.palette.background.contrast).toBe("#e8f4fd");
    expect(schemed.colorSchemes.light?.palette.background.contrast).toBe("#0a112b");
    expect(schemed.colorSchemes.light?.palette.text.hint).toBe("rgba(10, 17, 43, 0.45)");
  });

  it("emits the CSS variables that tokens.css references", () => {
    expectCssVar(theme.vars?.spacing, "--mui-spacing");
    expectCssVar(theme.vars?.shape.borderRadius, "--mui-shape-borderRadius");
    expectCssVar(theme.vars?.shadows[1], "--mui-shadows-1");
    expectCssVar(theme.vars?.zIndex.modal, "--mui-zIndex-modal");
    expectCssVar(theme.vars?.palette.primary.mainChannel, "--mui-palette-primary-mainChannel");
    expectCssVar(theme.vars?.palette.background.contrast, "--mui-palette-background-contrast");
  });

  it("uses the self-hosted Roboto stack", () => {
    expect(theme.typography.fontFamily).toBe("'Roboto', 'Roboto Fallback', \"Helvetica\", \"Arial\", sans-serif");
  });

  it("only declares Roboto weights that roboto.ts loads (light maps to 400, D3)", () => {
    expect(theme.typography.fontWeightLight).toBe(400);
    expect(theme.typography.fontWeightRegular).toBe(400);
    expect(theme.typography.fontWeightMedium).toBe(500);
    expect(theme.typography.fontWeightBold).toBe(700);
  });
});

describe("legacy color helpers", () => {
  it("returns the same values as the previous theme.js", () => {
    expect(colors.primary).toBe("#10aede");
    expect(getColorWithOpacity("#10aede", 0.5)).toBe("rgba(16, 174, 222, 0.5)");
    expect(getLevelColor("beginner", "opacity10")).toBe("rgba(76, 175, 80, 0.1)");
    expect(getLevelColor("advanced")).toBe("#F44336");
    expect(getStatusColor("success")).toBe("#4CAF50");
    expect(getStatusColor("unknown")).toBe("#10aede");
    expect(levelColors.intermediate.light).toBe("rgba(255, 152, 0, 0.7)");
  });
});
