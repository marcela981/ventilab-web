/*
* Funcionalidad: ModuleNotesAnalysis tests
* Descripción: With msw: the module AI analysis posts the moduleId, shows the result and its "¿Te fue útil?" rating sends the NOTES_ANALYSIS target (the AI call id) with the NOTES_ANALYSIS surface and the MODULE scope (DISENO_BLOQUE4 §2.7). Depends on vitest, msw, Testing Library and the student space test helpers. v1.1 (cierre IA): a DETERMINISTIC analysis shows the fallback label and no rating; the AI quota shows the local reset time.
* Versión: 1.1
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

import { fireEvent, screen, waitFor } from "@testing-library/react";
import { http, HttpResponse } from "msw";
import { setupServer } from "msw/node";
import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";
import { apiUrl, envelope, renderStudentSpace } from "../pages/student-space-test-helpers";
import { MODULE_ANALYSIS_COPY, ModuleNotesAnalysis } from "./module-notes-analysis";

const server = setupServer();
const analyzed: unknown[] = [];
const ratings: unknown[] = [];

beforeAll(() => {
  server.listen({ onUnhandledRequest: "error" });
});

afterEach(() => {
  analyzed.length = 0;
  ratings.length = 0;
  server.resetHandlers();
});

afterAll(() => {
  server.close();
});

describe("ModuleNotesAnalysis", () => {
  it("rates the module analysis with the NOTES_ANALYSIS surface and the MODULE scope", async() => {
    server.use(
      http.post(apiUrl("/api/notes/analyze"), async({ request }) => {
        analyzed.push(await request.json());

        return HttpResponse.json(envelope({
          aiCallId: "call-7",
          summary: "Dominas la fisiología básica.",
          keyConcepts: ["Compliance"],
          gaps: [],
          suggestions: [],
          lessonId: null,
          moduleId: "m1",
          model: "test-model",
          notesAnalyzed: 2,
          scope: "MODULE",
        }));
      }),
      http.put(apiUrl("/api/ai-ratings"), async({ request }) => {
        ratings.push(await request.json());

        return HttpResponse.json(envelope(null));
      }),
    );
    renderStudentSpace(<ModuleNotesAnalysis moduleId="m1" moduleTitle="Fisiología" />);

    fireEvent.click(screen.getByRole("button", { name: MODULE_ANALYSIS_COPY.analyzeModule("Fisiología") }));

    expect(await screen.findByText("Dominas la fisiología básica.")).toBeInTheDocument();
    expect(analyzed).toEqual([{ moduleId: "m1" }]);

    fireEvent.click(screen.getByRole("button", { name: "Sí, fue útil" }));

    await waitFor(() => expect(ratings).toEqual([
      { targetType: "NOTES_ANALYSIS", targetId: "call-7", helpful: true, surface: "NOTES_ANALYSIS", scope: "MODULE" },
    ]));
  });

  it("labels a rule-based analysis (source DETERMINISTIC) and offers no rating", async() => {
    server.use(http.post(apiUrl("/api/notes/analyze"), () => HttpResponse.json(envelope({
      aiCallId: "call-8",
      summary: "Tienes 2 notas con 40 palabras.",
      keyConcepts: ["PEEP"],
      gaps: [],
      suggestions: [],
      lessonId: null,
      moduleId: "m1",
      model: "",
      notesAnalyzed: 2,
      scope: "module",
      source: "DETERMINISTIC",
    }))));
    renderStudentSpace(<ModuleNotesAnalysis moduleId="m1" moduleTitle="Fisiología" />);

    fireEvent.click(screen.getByRole("button", { name: MODULE_ANALYSIS_COPY.analyzeModule("Fisiología") }));

    expect(await screen.findByText("Tienes 2 notas con 40 palabras.")).toBeInTheDocument();
    expect(screen.getByText("Respuesta automática (IA no disponible)")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Sí, fue útil" })).not.toBeInTheDocument();
  });

  it("shows when the analysis can be requested again after the AI quota", async() => {
    server.use(http.post(apiUrl("/api/notes/analyze"), () => HttpResponse.json(
      { success: false, message: "quota", data: null, code: "ai.quota_exceeded", timestamp: "", traceId: "t", pagination: null },
      { status: 429, headers: { "Retry-After": "600" } },
    )));
    renderStudentSpace(<ModuleNotesAnalysis moduleId="m1" moduleTitle="Fisiología" />);

    fireEvent.click(screen.getByRole("button", { name: MODULE_ANALYSIS_COPY.analyzeModule("Fisiología") }));

    expect(await screen.findByText(/^Alcanzaste el límite de uso de la IA\. Podrás usarlo de nuevo a las \d{2}:\d{2}\.$/)).toBeInTheDocument();
  });
});
