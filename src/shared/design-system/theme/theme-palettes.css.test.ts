/*
* Funcionalidad: Generated palette stylesheet tests
* Descripción: Keeps UI/theme-palettes.generated.css in sync with theme-palettes.ts (file snapshot: `npm run generate:palettes` rewrites it, a plain run fails on drift) and checks its shape: every palette token in the four combinations, the Univalle selectors and the MUI variables it overrides (brand roles with their Channel companions, derived component variables) and that the VentyLab palette variables stay with the MUI theme. Depends on vitest and ./palette-stylesheet.
* Versión: 1.0
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

import { describe, expect, it } from "vitest";
import { buildPaletteStylesheet, combinationSelector, muiPaletteVariables } from "./palette-stylesheet";
import { PALETTE_TOKEN_NAMES } from "./theme-palettes";

const css = buildPaletteStylesheet();

function ruleBody(selector: string): string {
  const start = css.indexOf(`${selector} {`);
  expect(start).toBeGreaterThanOrEqual(0);
  return css.slice(start, css.indexOf("}", start));
}

describe("theme-palettes.generated.css", () => {
  it("matches the committed stylesheet (run `npm run generate:palettes` after editing theme-palettes.ts)", async () => {
    await expect(css).toMatchFileSnapshot("../UI/theme-palettes.generated.css");
  });

  it("declares every palette token in the four combinations", () => {
    for (const paletteId of ["ventylab", "univalle"] as const) {
      for (const mode of ["light", "dark"] as const) {
        const body = ruleBody(combinationSelector(paletteId, mode));
        for (const name of PALETTE_TOKEN_NAMES) expect(body).toContain(`${name}:`);
      }
    }
  });

  it("overrides the Univalle MUI variables, Channel companions and derived component variables included", () => {
    const light = ruleBody('[data-palette="univalle"][data-mui-color-scheme="light"]');
    expect(light).toContain("--mui-palette-primary-main: #c20e1a;");
    expect(light).toContain("--mui-palette-primary-mainChannel: 194 14 26;");
    expect(light).toContain("--mui-palette-text-primary: #3f1517;");
    expect(light).toMatch(/--mui-palette-Slider-primaryTrack: /);
    const dark = ruleBody('[data-palette="univalle"][data-mui-color-scheme="dark"]');
    expect(dark).toContain("--mui-palette-background-default: #121212;");
    expect(dark).toContain("--mui-palette-primary-contrastText: #121212;");
  });

  it("leaves the VentyLab MUI variables to the theme (only --vl-* tokens in its rules)", () => {
    expect(ruleBody(combinationSelector("ventylab", "dark"))).not.toContain("--mui-");
    expect(ruleBody(combinationSelector("ventylab", "light"))).not.toContain("--mui-");
  });

  it("covers every MUI palette variable whose value differs between the palettes", () => {
    const ventylab = muiPaletteVariables("ventylab");
    const univalle = muiPaletteVariables("univalle");
    for (const mode of ["light", "dark"] as const) {
      const body = ruleBody(combinationSelector("univalle", mode));
      const differing = Object.keys(univalle[mode]).filter((name) => univalle[mode][name] !== ventylab[mode][name]);
      expect(differing.length).toBeGreaterThan(20);
      for (const name of differing) expect(body).toContain(`${name}:`);
      // MUI emits the same variable names for both palettes (nothing VentyLab sets is left unset in Univalle).
      expect(Object.keys(univalle[mode]).sort()).toEqual(Object.keys(ventylab[mode]).sort());
    }
  });
});
