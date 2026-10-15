/*
* Funcionalidad: PrintLayout tests
* Descripción: Tests of the print layout role guard: the print roles are exactly TEACHER and ADMIN (never an empty or wider list), a STUDENT never sees the printed content and is sent to the student home, and a TEACHER sees it. Depends on vitest, Testing Library, the session context and the learning test helpers.
* Versión: 1.0 (L7 follow-up)
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

import { screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { DEFAULT_ROUTE_BY_ROLE, ROUTES } from "@shared/session/routes.config";
import { renderWithSession } from "../pages/learning-test-helpers";
import { PRINT_ROLES, PrintLayout } from "./print-layout";

const router = vi.hoisted(() => ({
  asPath: "/learn/modules/m1/print",
  isReady: true,
  replace: vi.fn(() => Promise.resolve(true)),
}));

vi.mock("next/router", () => ({ useRouter: () => router }));

afterEach(() => {
  router.replace.mockClear();
});

describe("PrintLayout", () => {
  it("allows exactly the staff roles", () => {
    expect([...PRINT_ROLES].sort()).toEqual(["ADMIN", "TEACHER"]);
    expect([...ROUTES["/learn/modules/[moduleId]/print"].roles].sort()).toEqual(["ADMIN", "TEACHER"]);
  });

  it("denies a STUDENT and sends them to their home", async() => {
    renderWithSession(<PrintLayout><p>Contenido imprimible</p></PrintLayout>, "STUDENT");

    expect(screen.queryByText("Contenido imprimible")).not.toBeInTheDocument();
    await waitFor(() => expect(router.replace).toHaveBeenCalledWith(DEFAULT_ROUTE_BY_ROLE.STUDENT));
  });

  it("renders the content for a TEACHER", () => {
    renderWithSession(<PrintLayout><p>Contenido imprimible</p></PrintLayout>, "TEACHER");

    expect(screen.getByText("Contenido imprimible")).toBeInTheDocument();
    expect(router.replace).not.toHaveBeenCalled();
  });
});
