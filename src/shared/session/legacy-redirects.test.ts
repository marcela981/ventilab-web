/*
* Funcionalidad: Legacy route redirects tests
* Descripción: The legacy staff panel routes redirect (temporary) to the migrated screens: /panel and /panel/students → /teacher, /panel/students/[id] → /teacher/students/[id] (encoded; a missing id goes to /teacher), /panel/admin → /admin/users, /panel/settings → /admin/settings; every destination is a route of the session route table. Depends on vitest and the session modules.
* Versión: 1.0
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

import { describe, expect, it } from "vitest";
import { LEGACY_PANEL_REDIRECTS, legacyPanelRedirect, legacyStudentDetailRedirect } from "./legacy-redirects";
import { findRoute } from "./routes.config";

describe("legacy panel redirects", () => {
  it.each([
    ["/panel", "/teacher"],
    ["/panel/students", "/teacher"],
    ["/panel/admin", "/admin/users"],
    ["/panel/settings", "/admin/settings"],
  ] as const)("redirects %s to %s", (from, to) => {
    expect(legacyPanelRedirect(from)).toEqual({ redirect: { destination: to, permanent: false } });
  });

  it("redirects a student detail to the teacher student page", () => {
    expect(legacyStudentDetailRedirect("u 1")).toEqual({ redirect: { destination: "/teacher/students/u%201", permanent: false } });
    expect(legacyStudentDetailRedirect(undefined)).toEqual({ redirect: { destination: "/teacher", permanent: false } });
    expect(legacyStudentDetailRedirect(["a", "b"])).toEqual({ redirect: { destination: "/teacher", permanent: false } });
  });

  it("only targets routes of the route table", () => {
    for (const to of Object.values(LEGACY_PANEL_REDIRECTS)) {
      expect(findRoute(to)).not.toBeNull();
    }
  });
});
