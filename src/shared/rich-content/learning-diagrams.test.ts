/*
* Funcionalidad: Lesson diagram asset checks
* Descripción: Every SVG served from public/learning/diagrams (the figures the imported lessons reference) is well-formed XML, self-contained and safe to serve (no scripts, foreignObject, event handlers, external references or CSS imports), accessible (role="img" with <title> and <desc>) and carries intrinsic width, height and viewBox so the browser can size it before it loads. Depends on node:fs and the jsdom DOMParser.
* Versión: 1.0
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const DIAGRAMS_DIR = join(process.cwd(), "public", "learning", "diagrams");
const FILES = readdirSync(DIAGRAMS_DIR).filter((name) => name.endsWith(".svg")).sort();
const MAX_BYTES = 40 * 1024;

function parse(source: string): Document {
  return new DOMParser().parseFromString(source, "image/svg+xml");
}

describe("lesson diagrams", () => {
  it("exist and follow the naming rule", () => {
    expect(FILES.length).toBeGreaterThan(0);
    expect(FILES.filter((name) => !/^[a-z0-9]+(?:-[a-z0-9]+)*\.svg$/.test(name))).toEqual([]);
  });

  it.each(FILES)("%s is well-formed, safe, accessible and sized", (name) => {
    const source = readFileSync(join(DIAGRAMS_DIR, name), "utf8");
    const doc = parse(source);
    const svg = doc.documentElement;

    expect(doc.getElementsByTagName("parsererror")).toHaveLength(0);
    expect(svg.tagName).toBe("svg");
    expect(Buffer.byteLength(source)).toBeLessThanOrEqual(MAX_BYTES);
    expect(doc.getElementsByTagName("script")).toHaveLength(0);
    expect(doc.getElementsByTagName("foreignObject")).toHaveLength(0);
    expect(source).not.toMatch(/\son[a-z]+\s*=/i);
    expect(source).not.toMatch(/@import|javascript:/i);
    expect(source.match(/(?:xlink:)?href\s*=\s*"(?!#)[^"]*"/g) ?? []).toEqual([]);
    expect(svg.getAttribute("role")).toBe("img");
    expect(svg.getElementsByTagName("title")[0]?.textContent?.trim()).toBeTruthy();
    expect(svg.getElementsByTagName("desc")[0]?.textContent?.trim()).toBeTruthy();
    expect(svg.getAttribute("viewBox")).toMatch(/^0 0 \d+(\.\d+)? \d+(\.\d+)?$/);
    expect(Number(svg.getAttribute("width"))).toBeGreaterThan(0);
    expect(Number(svg.getAttribute("height"))).toBeGreaterThan(0);
  });
});
