/*
* Funcionalidad: Legacy lab redirects tests
* Descripción: T12: `/simulador` redirects (temporary) to `/lab`, and the legacy route file
*   pages/simulador/index.js only redirects through legacyLabRedirect (no legacy dashboard, provider or component is
*   rendered any more). Depends on Vitest and node:fs. v1.1 (T12 review fix S2): the route imports legacyLabRedirect by
*   its direct module path, never the whole feature barrel.
* Versión: 1.1
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { LEGACY_LAB_REDIRECTS, legacyLabRedirect } from "./legacy-redirects";

const ROOT = process.cwd();

describe("legacy lab redirects", () => {
  it("sends /simulador to the lab summary with a temporary redirect", () => {
    expect(legacyLabRedirect("/simulador")).toEqual({ redirect: { destination: "/lab", permanent: false } });
    expect(Object.keys(LEGACY_LAB_REDIRECTS)).toEqual(["/simulador"]);
  });

  it("the legacy route only redirects: no legacy dashboard is imported", () => {
    const source = readFileSync(join(ROOT, "pages/simulador/index.js"), "utf8");

    expect(source).toContain("legacyLabRedirect(\"/simulador\")");
    expect(source).toContain("getServerSideProps");
    const imports = (source.match(/^import .*$/gm) ?? []).map((line) => line.trim());
    expect(imports).toEqual([
      "import { legacyLabRedirect } from '@features/ventilator-lab/application/config/legacy-redirects';",
    ]);
  });

  it("the legacy /dashboard landing points to the lab directly", () => {
    const source = readFileSync(join(ROOT, "pages/dashboard/index.js"), "utf8");

    expect(source).toContain("router.replace('/lab')");
    expect(source).not.toContain("'/simulador'");
  });
});
