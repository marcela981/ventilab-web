/*
* Funcionalidad: Legacy route redirects tests
* Descripción: The legacy routes redirect (temporary, 307) to the migrated screens through the next.config `redirects()` rules of config/legacy-redirects.mjs: /panel and /panel/students → /teacher, /panel/students/[id] → /teacher/students/[id], /panel/admin → /admin/users, /panel/settings → /admin/settings; the seven /evaluation/** routes → /evaluations, /evaluations/manage, /evaluations/manage/new or /grading; /teaching/[moduleId]/[lessonId] and /teaching?moduleId=&lessonId= → page 1 of the same lesson, any other /teaching → /learn. Concrete paths are resolved with Next's own matchers (path-match, matchHas, prepareDestination) in rule order, so the order of the list is tested too; static destinations are routes of the session route table and next.config.mjs serves exactly this list. v1.0 covered only the panel getServerSideProps helpers. Depends on vitest, Next's routing utils and the session route table. v2.1 (W1 Bloque 1): /simulador is no longer redirected (it is the workspace); /simulator, /lab and /lab/live go to /simulador with their `tab` (query passed through, the rule's tab wins), exact paths only: the case editor, the session pages, /lab/reservations and /lab/recordings/** are left alone; no rule targets another rule's source (no cycles). v2.2 (W3, Bloque 2): /learn/:sectionId goes to the Currículo tab; /learn and its module routes are not redirected.
* Versión: 2.2
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

import { readFileSync } from "node:fs";
import type { IncomingMessage } from "node:http";
import { join } from "node:path";
import { getPathMatch } from "next/dist/shared/lib/router/utils/path-match";
import { matchHas, prepareDestination } from "next/dist/shared/lib/router/utils/prepare-destination";
import { describe, expect, it } from "vitest";
import { LEGACY_REDIRECTS } from "../../../config/legacy-redirects.mjs";
import { findRoute } from "./routes.config";

const REQUEST = { headers: {} } as unknown as IncomingMessage;

// First matching rule wins, as in Next; returns the destination path plus the query Next passes through.
function resolve(url: string): string | null {
  const { pathname, searchParams } = new URL(url, "https://ventylab.test");
  const query = Object.fromEntries(searchParams.entries());

  for (const rule of LEGACY_REDIRECTS) {
    const params = getPathMatch(rule.source, { removeUnnamedParams: true, strict: true })(pathname);

    if (!params) {
      continue;
    }

    const hasParams = rule.has ? matchHas(REQUEST, query, [...rule.has]) : {};

    if (!hasParams) {
      continue;
    }

    const { parsedDestination } = prepareDestination({
      appendParamsToQuery: false,
      destination: rule.destination,
      params: { ...params, ...hasParams },
      query,
    });
    const search = new URLSearchParams(parsedDestination.query as Record<string, string>).toString();

    return search ? `${parsedDestination.pathname}?${search}` : parsedDestination.pathname;
  }

  return null;
}

describe("legacy redirect rules", () => {
  it("are all temporary redirects (307 until after the thesis defense)", () => {
    expect(LEGACY_REDIRECTS.length).toBeGreaterThan(0);

    for (const rule of LEGACY_REDIRECTS) {
      expect(rule.permanent).toBe(false);
      expect(rule.source.startsWith("/")).toBe(true);
      expect(rule.destination.startsWith("/")).toBe(true);
    }
  });

  it("list every legacy source once per condition", () => {
    expect(LEGACY_REDIRECTS.map((rule) => `${rule.source}${rule.has ? " (query)" : ""}`)).toEqual([
      "/simulator",
      "/lab",
      "/lab/live",
      "/panel",
      "/panel/students",
      "/panel/students/:id",
      "/panel/admin",
      "/panel/settings",
      "/evaluation",
      "/evaluation/manage",
      "/evaluation/manage/new",
      "/evaluation/manage/:activityId/edit",
      "/evaluation/grade",
      "/evaluation/grade/:activityId",
      "/evaluation/:activityId",
      "/teaching/:moduleId/:lessonId",
      "/teaching (query)",
      "/teaching",
      "/learn/:sectionId",
    ]);
  });

  it.each([
    ["/simulator", "/simulador?tab=simular"],
    ["/lab", "/simulador?tab=conexion"],
    ["/lab/live", "/simulador?tab=monitoreo"],
    ["/panel", "/teacher"],
    ["/panel/students", "/teacher"],
    ["/panel/students/u1", "/teacher/students/u1"],
    ["/panel/students/u%201", "/teacher/students/u%201"],
    ["/panel/admin", "/admin/users"],
    ["/panel/settings", "/admin/settings"],
  ])("redirects %s to %s", (from, to) => {
    expect(resolve(from)).toBe(to);
  });

  it.each([
    ["/evaluation", "/evaluations"],
    ["/evaluation/a1", "/evaluations"],
    ["/evaluation/manage", "/evaluations/manage"],
    ["/evaluation/manage/new", "/evaluations/manage/new"],
    ["/evaluation/manage/a1/edit", "/evaluations/manage"],
    ["/evaluation/grade", "/grading"],
    ["/evaluation/grade/a1", "/grading"],
  ])("redirects the legacy evaluation route %s to %s", (from, to) => {
    expect(resolve(from)).toBe(to);
  });

  it("keeps the request query on the simulator redirects and lets the rule's tab win", () => {
    expect(resolve("/simulator?x=1")).toBe("/simulador?x=1&tab=simular");
    expect(resolve("/lab/live?reservationId=r1")).toBe("/simulador?reservationId=r1&tab=monitoreo");
    expect(resolve("/lab?tab=sesiones")).toBe("/simulador?tab=conexion");
  });

  it.each([
    "/simulador",
    "/simulador?tab=sesiones",
    "/simulator/cases",
    "/simulator/cases/new",
    "/simulator/cases/c1/edit",
    "/simulator/sessions/s1",
    "/simulator/sessions/s1/result",
    "/simulator/sessions/s1/replay",
    "/lab/reservations",
    "/lab/recordings",
    "/lab/recordings/r1",
  ])("does not redirect %s", (path) => {
    expect(resolve(path)).toBeNull();
  });

  it("has no cycles: no destination is redirected again", () => {
    for (const rule of LEGACY_REDIRECTS) {
      const destination = rule.destination.replace(/:[A-Za-z]+/g, "x");

      expect(resolve(destination), rule.destination).toBeNull();
    }
  });

  it("maps a legacy lesson path to page 1 of the same lesson", () => {
    expect(resolve("/teaching/module-01-inversion-fisiologica/module-01-inversion-fisiologica")).toBe(
      "/learn/modules/module-01-inversion-fisiologica/lessons/module-01-inversion-fisiologica/1",
    );
  });

  it("maps the legacy lesson query form to page 1 of the same lesson", () => {
    expect(resolve("/teaching?moduleId=m1&lessonId=l2")).toBe("/learn/modules/m1/lessons/l2/1?moduleId=m1&lessonId=l2");
  });

  it("sends any other /teaching visit to /learn", () => {
    expect(resolve("/teaching")).toBe("/learn");
    expect(resolve("/teaching?moduleId=m1")).toBe("/learn?moduleId=m1");
    expect(resolve("/teaching?moduleId=&lessonId=l1")).toBe("/learn?moduleId=&lessonId=l1");
  });

  it("sends a legacy section page to the Currículo tab with that section open", () => {
    expect(resolve("/learn/section-mecanica")).toBe("/learn?tab=curriculo&section=section-mecanica");
    expect(resolve("/learn/s1?tab=inicio")).toBe("/learn?tab=curriculo&section=s1");
  });

  it("leaves the new routes alone", () => {
    expect(resolve("/evaluations")).toBeNull();
    expect(resolve("/teacher/students/u1")).toBeNull();
    expect(resolve("/learn")).toBeNull();
    expect(resolve("/learn?tab=progreso")).toBeNull();
    expect(resolve("/learn/modules/m1")).toBeNull();
    expect(resolve("/learn/modules/m1/print")).toBeNull();
    expect(resolve("/learn/modules/m1/lessons/l1/2")).toBeNull();
    expect(resolve("/dashboard")).toBeNull();
  });

  it("only targets routes of the route table", () => {
    for (const rule of LEGACY_REDIRECTS) {
      const pattern = rule.destination
        .replace(/[?].*$/, "")
        .replace(/:id\b/, "[userId]")
        .replace(/:moduleId\b/, "[moduleId]")
        .replace(/:lessonId\b/, "[lessonId]")
        .replace(/\/1$/, "/[pageNumber]");

      expect(findRoute(pattern), rule.destination).not.toBeNull();
    }
  });

  it("are the redirects served by next.config.mjs", () => {
    const config = readFileSync(join(process.cwd(), "next.config.mjs"), "utf8");

    expect(config).toContain("import { LEGACY_REDIRECTS } from './config/legacy-redirects.mjs';");
    expect(config).toMatch(/async redirects\(\) \{\s*return LEGACY_REDIRECTS\.map/);
    expect(config).toContain("Temporary (307) until after the thesis defense; then switch to permanent (308).");
  });
});
