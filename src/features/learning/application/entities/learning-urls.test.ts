/*
* Funcionalidad: Learning URL tests
* Descripción: Unit tests of the pure learning URL builders (/learn, section, module, lesson page, print) and of the route parsers (route id and the 1-based pageNumber, which only accepts positive integers). Depends on vitest.
* Versión: 1.0
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

import { describe, expect, it } from "vitest";
import {
  buildLessonPageUrl,
  buildLevelUrl,
  buildModulePrintUrl,
  buildModuleUrl,
  buildSectionUrl,
  LEARN_HOME_URL,
  levelAnchorId,
  parsePageNumber,
  parseRouteId,
} from "./learning-urls";

describe("learning URL builders", () => {
  it("builds every learning route and encodes the ids", () => {
    expect(LEARN_HOME_URL).toBe("/learn");
    expect(buildSectionUrl("s1")).toBe("/learn/s1");
    expect(buildModuleUrl("m 1")).toBe("/learn/modules/m%201");
    expect(buildLessonPageUrl("m1", "l/1", 3)).toBe("/learn/modules/m1/lessons/l%2F1/3");
    expect(buildModulePrintUrl("m1")).toBe("/learn/modules/m1/print");
  });

  it("defaults the lesson page to the first page", () => {
    expect(buildLessonPageUrl("m1", "l1")).toBe("/learn/modules/m1/lessons/l1/1");
  });

  it("links a level to its anchor inside the section page, or inside /learn when it has no section", () => {
    expect(levelAnchorId("lv1")).toBe("level-lv1");
    expect(buildLevelUrl("lv1", "s1")).toBe("/learn/s1#level-lv1");
    expect(buildLevelUrl("lv1", null)).toBe("/learn#level-lv1");
  });
});

describe("parsePageNumber", () => {
  it("accepts positive integers", () => {
    expect(parsePageNumber("1")).toBe(1);
    expect(parsePageNumber("12")).toBe(12);
  });

  it.each([undefined, null, "", "0", "-1", "1.5", "01", "abc", "2e3", " 2", ["1"], 3, "99999999999999999999"])(
    "rejects %j",
    (value) => {
      expect(parsePageNumber(value)).toBeNull();
    },
  );
});

describe("parseRouteId", () => {
  it("returns a non-empty string id and rejects anything else", () => {
    expect(parseRouteId("abc")).toBe("abc");
    expect(parseRouteId("")).toBeNull();
    expect(parseRouteId(undefined)).toBeNull();
    expect(parseRouteId(["a", "b"])).toBeNull();
  });
});
