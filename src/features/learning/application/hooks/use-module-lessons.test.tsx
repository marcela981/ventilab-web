/*
* Funcionalidad: useModuleLessons tests
* Descripción: Proves that id-keyed learning queries never show the data of a previous id: after switching from module m1 to module m2, the hook reports no lessons (loading) until m2 answers, instead of keeping m1's lessons on screen (L1/L2 review advisory on keepPreviousData). Depends on vitest, Testing Library, msw and the learning test helpers.
* Versión: 1.0
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

import { renderHook, waitFor } from "@testing-library/react";
import { delay, http, HttpResponse } from "msw";
import { setupServer } from "msw/node";
import type { ReactNode } from "react";
import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";
import { apiUrl, envelope, lessonDto, SessionWrapper } from "../pages/learning-test-helpers";
import { useModuleLessons } from "./use-module-lessons";

const server = setupServer();

beforeAll(() => {
  server.listen({ onUnhandledRequest: "error" });
});

afterEach(() => {
  server.resetHandlers();
});

afterAll(() => {
  server.close();
});

function Wrapper({ children }: { children: ReactNode }) {
  return <SessionWrapper role="STUDENT">{children}</SessionWrapper>;
}

describe("useModuleLessons", () => {
  it("does not keep the previous module lessons while another module loads", async() => {
    server.use(
      http.get(apiUrl("/api/modules/:id/lessons"), async({ params }) => {
        if (params.id === "m2") {
          await delay("infinite");
        }

        return HttpResponse.json(envelope([lessonDto(`${String(params.id)}-l1`, 1, 1)]));
      }),
    );

    const { result, rerender } = renderHook(({ id }: { id: string }) => useModuleLessons(id), {
      initialProps: { id: "m1" },
      wrapper: Wrapper,
    });

    await waitFor(() => {
      expect(result.current.lessons?.[0]?.id).toBe("m1-l1");
    });

    rerender({ id: "m2" });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(true);
    });
    expect(result.current.lessons).toBeNull();
  });
});
