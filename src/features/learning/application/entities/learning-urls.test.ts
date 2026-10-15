/*
* Funcionalidad: Learning URL tests
* Descripción: Unit tests of the pure learning URL builders (/learn, section, module, lesson page, print) and of the route parsers (route id and the 1-based pageNumber, which only accepts positive integers). v1.1 (L3): the module completion URL (?completed=1). v1.2 (R1): legacy /teaching lesson URLs resolve to the equivalent lesson page. Depends on vitest.
* Versión: 1.2
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

import { describe, expect, it } from "vitest";
import {
  buildLessonPageUrl,
  resolveLegacyLessonUrl,
  buildModuleCompletedUrl,
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
    expect(buildModuleCompletedUrl("m 1")).toBe("/learn/modules/m%201?completed=1");
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

describe("resolveLegacyLessonUrl (R1)", () => {
  it("maps a legacy /teaching/[moduleId]/[lessonId] query to page 1 of the same lesson", () => {
    expect(resolveLegacyLessonUrl({ moduleId: "module-01-inversion-fisiologica", lessonId: "module-01-inversion-fisiologica" })).toBe(
      "/learn/modules/module-01-inversion-fisiologica/lessons/module-01-inversion-fisiologica/1",
    );
  });

  it("encodes the ids and ignores unrelated legacy params", () => {
    expect(resolveLegacyLessonUrl({ moduleId: "m 1", lessonId: "l/2", tab: "dashboard" })).toBe("/learn/modules/m%201/lessons/l%2F2/1");
  });

  it("returns null when an id is missing, empty or repeated", () => {
    expect(resolveLegacyLessonUrl({ moduleId: "m1" })).toBeNull();
    expect(resolveLegacyLessonUrl({ moduleId: "", lessonId: "l1" })).toBeNull();
    expect(resolveLegacyLessonUrl({ moduleId: ["m1", "m2"], lessonId: "l1" })).toBeNull();
    expect(resolveLegacyLessonUrl({})).toBeNull();
  });
});
