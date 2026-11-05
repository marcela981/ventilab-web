/*
* Funcionalidad: WCAG contrast of the four theme combinations
* Descripción: Verifies WCAG 2.2 AA on theme-palettes.ts for VentyLab and Univalle × light and dark (DISENO_AJUSTES_D §6.2): normal text ≥ 4.5:1 (text, muted, link, text on primary/accent/secondary/status fills, status texts on their tints, roles, evaluation chips, sidebar, user card, staff panel, auth footer, glass accents, level tones, console texts, alarm texts) and UI components ≥ 3:1 (primary and focus ring, accent, curves, alarms and pending highlight on the console background and surface, tab indicator, panel accent). Translucent colors are composited over their background and color-mix() tokens of tokens.css are recomputed (sRGB), so the figures are the rendered ones. Depends on vitest and ./theme-palettes. v1.1: (token request of block A): the --vl-console-applied tag on the console background and surface.
* Versión: 1.1
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

import { describe, expect, it } from "vitest";
import { THEME_MODES, THEME_PALETTE_IDS, THEME_SCHEMES } from "./theme-palettes";
import type { SchemeDefinition } from "./theme-palettes";

type Rgba = [number, number, number, number];

const TEXT_AA = 4.5;
const UI_AA = 3;

// Palette-independent literals of tokens.css (roles, evaluation chips, console curves, tick and alarms).
const WHITE = "#ffffff";
const ROLES = ["#3a863d", "#0b78ce", "#e81c0d"];
const EVAL_CHIPS = ["#1565c0", "#cf4900", "#6a1b9a"];
const CURVES = ["#ef5350", "#42a5f5", "#66bb6a"];
const CONSOLE_TICK = "#919191";
const ALARMS = ["#f44336", "#ff9800", "#10aede"];
const CONSOLE_APPLIED = "#81c784";

function parse(color: string): Rgba {
  const hex = /^#([0-9a-f]{6})$/i.exec(color.trim());
  if (hex) {
    const value = hex[1] ?? "";
    const channel = (i: number) => parseInt(value.slice(i, i + 2), 16);
    return [channel(0), channel(2), channel(4), 1];
  }
  const rgba = /^rgba?\(([^)]+)\)$/i.exec(color.trim());
  if (rgba) {
    const [r, g, b, a = "1"] = (rgba[1] ?? "").split(",").map((part) => part.trim());
    return [Number(r), Number(g), Number(b), Number(a)];
  }
  throw new Error(`Unsupported color ${color}`);
}

/** Source-over compositing of a (possibly translucent) color over an opaque one. */
function over(top: string | Rgba, bottom: string | Rgba): Rgba {
  const [r, g, b, a] = typeof top === "string" ? parse(top) : top;
  const base = typeof bottom === "string" ? parse(bottom) : bottom;
  return [r * a + base[0] * (1 - a), g * a + base[1] * (1 - a), b * a + base[2] * (1 - a), 1];
}

/** color-mix(in srgb, a p%, b) of two opaque colors. */
function mix(a: string, percent: number, b: string): Rgba {
  const [xr, xg, xb] = parse(a);
  const [yr, yg, yb] = parse(b);
  const p = percent / 100;
  return [xr * p + yr * (1 - p), xg * p + yg * (1 - p), xb * p + yb * (1 - p), 1];
}

function luminance([r, g, b]: Rgba): number {
  const channel = (value: number) => {
    const c = value / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b);
}

function ratio(foreground: string | Rgba, background: string | Rgba): number {
  const bg = typeof background === "string" ? over(background, WHITE) : background;
  const fg = over(foreground, bg);
  const light = Math.max(luminance(fg), luminance(bg));
  const dark = Math.min(luminance(fg), luminance(bg));
  return (light + 0.05) / (dark + 0.05);
}

function gradientStops(gradient: string): string[] {
  return gradient.match(/#[0-9a-f]{6}/gi) ?? [];
}

type Pair = { name: string, fg: string | Rgba, bg: string | Rgba, min: number };

function pairsOf(scheme: SchemeDefinition): Pair[] {
  const { mui, tokens: t } = scheme;
  const bg = mui.background.default;
  const surface = mui.background.paper;
  const raised = over(t["--vl-color-surface-raised"], surface);
  const sidebar = t["--vl-sidebar-bg"];
  const panelSidebar = t["--vl-panel-sidebar-bg"];
  const consoleBg = t["--vl-console-bg"];
  const consoleSurface = mix(WHITE, 5, consoleBg);
  const text: Pair[] = [];
  const ui: Pair[] = [];
  const addText = (name: string, fg: string | Rgba, backgroundColor: string | Rgba) => text.push({ name, fg, bg: backgroundColor, min: TEXT_AA });
  const addUi = (name: string, fg: string | Rgba, backgroundColor: string | Rgba) => ui.push({ name, fg, bg: backgroundColor, min: UI_AA });

  for (const [label, background] of [["bg", bg], ["surface", surface], ["raised", raised]] as const) {
    addText(`text on ${label}`, mui.text.primary, background);
    addText(`muted on ${label}`, mui.text.secondary, background);
  }
  addText("link on bg", t["--vl-color-link"], bg);
  addText("link on surface", t["--vl-color-link"], surface);
  addText("link hover on surface", t["--vl-color-link-hover"], surface);
  for (const role of ["primary", "secondary", "info", "success", "warning", "error"] as const) {
    addText(`on-${role}`, mui[role].contrastText, mui[role].main);
  }
  addText("on-accent", t["--vl-color-on-accent"], t["--vl-color-accent"]);
  for (const [status, tint] of [["success", 12], ["warning", 14], ["error", 12]] as const) {
    const statusText = mix(mui[status].main, 55, rgbHex(over(mui.text.primary, surface)));
    addText(`status ${status} on its tint`, statusText, mix(mui[status].main, tint, surface));
    addText(`status ${status} on surface`, statusText, surface);
  }
  ROLES.forEach((role) => addText(`white on role ${role}`, WHITE, role));
  EVAL_CHIPS.forEach((chip) => addText(`white on evaluation chip ${chip}`, WHITE, chip));
  addText("text on sidebar", mui.text.primary, sidebar);
  addText("version on sidebar", t["--vl-sidebar-version"], sidebar);
  addText("text on active sidebar item", mui.text.primary, over(t["--vl-sidebar-item-active-bg"], sidebar));
  addText("text on user card", mui.text.primary, over(t["--vl-user-card-bg"], sidebar));
  addText("muted on user card", mui.text.secondary, over(t["--vl-user-card-bg"], sidebar));
  addText("panel sidebar text", t["--vl-panel-sidebar-text"], panelSidebar);
  addText("panel sidebar muted", t["--vl-panel-sidebar-muted"], panelSidebar);
  addText("panel version", t["--vl-panel-sidebar-faint"], panelSidebar);
  addText("panel active item text", t["--vl-panel-sidebar-text"], over(t["--vl-panel-item-active-bg"], panelSidebar));
  addText("text on panel paper", mui.text.primary, t["--vl-panel-paper"]);
  addText("muted on panel paper", mui.text.secondary, t["--vl-panel-paper"]);
  addText("muted on panel raised", mui.text.secondary, t["--vl-panel-raised"]);
  addText("text on panel bg", mui.text.primary, t["--vl-panel-bg"]);
  addText("link on panel paper", t["--vl-color-link"], t["--vl-panel-paper"]);
  addText("panel back link", t["--vl-glass-accent-cyan-text"], over(t["--vl-glass-bg-hover"], panelSidebar));
  gradientStops(t["--vl-auth-bg"]).forEach((stop) => addText(`auth footer on ${stop}`, t["--vl-auth-on-bg"], stop));
  gradientStops(t["--vl-panel-content-bg"]).forEach((stop) => addText(`text on panel content ${stop}`, mui.text.primary, stop));
  for (const accent of ["cyan", "green", "violet", "orange"] as const) {
    addText(`glass ${accent} text on surface`, t[`--vl-glass-accent-${accent}-text`], over(t["--vl-glass-bg"], surface));
  }
  addText("advanced level title on raised", t["--vl-level-advanced-text"], raised);
  addText("prerequisite level on raised", t["--vl-level-prereq"], raised);
  addText("console text", WHITE, consoleBg);
  addText("console muted on surface", mix(WHITE, 70, consoleBg), consoleSurface);
  addText("console tick on surface", CONSOLE_TICK, consoleSurface);
  addText("console applied tag", CONSOLE_APPLIED, consoleBg);
  addText("console applied tag on surface", CONSOLE_APPLIED, consoleSurface);
  ALARMS.forEach((alarm) => addText(`alarm text on ${alarm}`, consoleBg, alarm));

  addUi("primary on bg", mui.primary.main, bg);
  addUi("primary on surface", mui.primary.main, surface);
  addUi("primary on sidebar", mui.primary.main, sidebar);
  addUi("accent on surface", t["--vl-color-accent"], surface);
  addUi("tab indicator on surface", t["--vl-learn-tab-indicator"], surface);
  addUi("panel accent", t["--vl-panel-accent"], panelSidebar);
  addUi("panel active icon", t["--vl-panel-item-active-icon"], over(t["--vl-panel-item-active-bg"], panelSidebar));
  for (const [label, background] of [["console bg", consoleBg], ["console surface", consoleSurface]] as const) {
    CURVES.forEach((curve) => addUi(`curve ${curve} on ${label}`, curve, background));
    ALARMS.forEach((alarm) => addUi(`alarm ${alarm} on ${label}`, alarm, background));
    addUi(`pending on ${label}`, t["--vl-console-pending"], background);
  }

  return [...text, ...ui];
}

function rgbHex([r, g, b]: Rgba): string {
  return `#${[r, g, b].map((value) => Math.round(value).toString(16).padStart(2, "0")).join("")}`;
}

/** Contrast figures of every combination (summarized in docs/cierre/paleta.md; PRINT_CONTRAST=1 prints them). */
function contrastReport() {
  return THEME_PALETTE_IDS.flatMap((paletteId) => THEME_MODES.map((mode) => ({
    paletteId,
    mode,
    pairs: pairsOf(THEME_SCHEMES[paletteId][mode]).map((pair) => ({ ...pair, ratio: ratio(pair.fg, pair.bg) })),
  })));
}

describe("WCAG AA in the four theme combinations", () => {
  for (const { paletteId, mode, pairs } of contrastReport()) {
    it(`${paletteId} ${mode}`, () => {
      if (process.env.PRINT_CONTRAST) {
        const lines = pairs.map((pair) => `${pair.name}: ${pair.ratio.toFixed(2)}`);
        console.log([`${paletteId} ${mode}`, ...lines].join("\n"));
      }
      const failures = pairs
        .filter((pair) => pair.ratio < pair.min)
        .map((pair) => `${pair.name}: ${pair.ratio.toFixed(2)} < ${pair.min}`);
      expect(failures).toEqual([]);
    });
  }

  it("computes the reference figures of DISENO_BLOQUE5 §4.1", () => {
    expect(ratio("#e8f4fd", "#0a112b")).toBeCloseTo(16.66, 1);
    expect(ratio("#0a112b", "#10aede")).toBeCloseTo(7.21, 1);
    expect(ratio("rgba(232, 244, 253, 0.7)", "#0a112b")).toBeCloseTo(8.47, 0);
  });
});
