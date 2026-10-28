/*
* Funcionalidad: TutorAI popup tests
* Descripción: Integration tests of the TutorAI floating button, its lazy popup and the deepen accordion, wired through the viewer prompt store as in the lesson viewer, against msw: the button opens an accessible dialog ("TutorAI", focus inside) that closes with Esc and with the close button and gives the focus back to the button; the Sugerencias / Preguntas / Notas tabs follow the WAI-ARIA keyboard pattern; a page suggestion closes the popup and expands the deepen accordion with the prompt prefilled (not sent); a post-lesson summary opens Preguntas with the message prefilled; "Tomar apunte" opens Notas; the checklist suggestion creates the July checklist note anchored to the page and opens Notas; the accordion is an accessible disclosure whose lazy body streams an answer. RichContent is replaced by plain text. Depends on vitest, Testing Library, msw and the learning test helpers.
* Versión: 0.1
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

import { fireEvent, screen, waitFor, within } from "@testing-library/react";
import { http, HttpResponse } from "msw";
import { setupServer } from "msw/node";
import { useState } from "react";
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import type { LessonPage } from "../../entities/lesson.entity";
import { TUTOR_SUGGESTION_PROMPTS } from "../../entities/tutor-suggestions";
import { deltaFrame, doneFrame, sseResponse, startFrame } from "../../hooks/sse-test-helpers";
import { TutorPromptContext } from "../../hooks/use-tutor-prompt";
import { routerStore } from "../../learning-router-test-helpers";
import { apiUrl, envelope, renderWithSession } from "../../pages/learning-test-helpers";
import { createTutorPromptStore } from "../../session/tutor-prompt-store";
import { DeepenAccordion } from "./deepen-accordion";
import { TutorFab } from "./tutor-fab";

vi.mock("next/router", async() => (await import("../../learning-router-test-helpers")).nextRouterMock);

vi.mock("@shared/rich-content/rich-content", () => ({
  RichContent: ({ content }: { content: unknown }) => <div>{typeof content === "string" ? content : ""}</div>,
}));

const LAZY_WAIT = { timeout: 10_000 };
const PAGES = [{ id: "p1", title: "Ajuste de la PEEP", order: 1 }] as LessonPage[];
let noteBodies: unknown[] = [];
let deepenBodies: unknown[] = [];

// Base handlers survive resetHandlers, so requests of components that outlive a test still find them.
const server = setupServer(
  http.get(apiUrl("/api/tutor/conversations"), () => HttpResponse.json({
    ...envelope([]),
    pagination: { page: 1, pages: 1, limit: 100, total: 0, next: null, previous: null },
  })),
  http.get(apiUrl("/api/notes/lessons/:lessonId"), () => HttpResponse.json(envelope([]))),
  http.post(apiUrl("/api/notes"), async({ request }) => {
    const body = await request.json() as Record<string, unknown>;

    noteBodies.push(body);

    return HttpResponse.json(envelope({
      id: "n-new",
      lessonId: "l1",
      pageId: body.pageId ?? null,
      moduleId: "m1",
      lessonTitle: "Ventilación",
      pageTitle: null,
      content: body.content,
      createdAt: "2026-10-28T00:00:00.000Z",
      updatedAt: "2026-10-28T00:00:00.000Z",
    }));
  }),
  http.post(apiUrl("/api/tutor/pages/:pageId/deepen"), async({ request }) => {
    deepenBodies.push(await request.json());

    return sseResponse([
      startFrame({ conversationId: "conv-1", messageId: "msg-1" }),
      deltaFrame("Respuesta del tutor"),
      doneFrame({ aiCallId: "call-1", conversationId: "conv-1", messageId: "msg-1" }),
    ]);
  }),
  http.get(apiUrl("/api/ai-ratings/mine"), () => HttpResponse.json(envelope(null))),
);

beforeAll(() => {
  server.listen({ onUnhandledRequest: "error" });
});

beforeEach(() => {
  noteBodies = [];
  deepenBodies = [];
  routerStore.reset();
});

afterEach(() => {
  server.resetHandlers();
});

afterAll(() => {
  server.close();
});

// The lesson viewer wiring: one prompt store shared by the accordion (end of the page) and the popup.
function ViewerHarness({ postLesson = false }: { postLesson?: boolean }) {
  const [store] = useState(createTutorPromptStore);

  return (
    <TutorPromptContext.Provider value={store}>
      <DeepenAccordion pageId="p1" />
      <TutorFab moduleId="m1" lessonId="l1" pageId="p1" pageTitle="Ajuste de la PEEP" lessonTitle="Ventilación" pages={PAGES} postLesson={postLesson} />
    </TutorPromptContext.Provider>
  );
}

// The modal hides the rest of the page from assistive technology while it is open (aria-hidden).
const fab = () => screen.getByRole("button", { name: "Abrir TutorAI", hidden: true });
const accordionButton = () => screen.getByRole("button", { name: "¿Te gustaría expandir más este tema?" });

async function openPopup() {
  fab().focus();
  fireEvent.click(fab());

  return screen.findByRole("dialog", { name: "TutorAI" }, LAZY_WAIT);
}

describe("TutorFab and TutorPopup", () => {
  it("opens an accessible dialog, closes it with Esc and the close button and returns the focus", async() => {
    renderWithSession(<ViewerHarness />);

    expect(fab()).toHaveAttribute("aria-haspopup", "dialog");
    expect(fab()).toHaveAttribute("aria-expanded", "false");
    const dialog = await openPopup();

    expect(within(dialog).getByRole("heading", { name: "TutorAI" })).toBeInTheDocument();
    // MUI moves the focus into the modal (its dialog container), away from the button.
    await waitFor(() => expect(dialog.parentElement).toContainElement(document.activeElement as HTMLElement));
    expect(fab()).not.toHaveFocus();
    expect(fab()).toHaveAttribute("aria-expanded", "true");

    fireEvent.keyDown(document.activeElement ?? dialog, { key: "Escape" });
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
    await waitFor(() => expect(fab()).toHaveFocus());

    const reopened = await openPopup();

    fireEvent.click(within(reopened).getByRole("button", { name: "Cerrar TutorAI" }));
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
    await waitFor(() => expect(fab()).toHaveFocus());
  });

  it("moves between the tabs with the keyboard (arrows, Home, End)", async() => {
    renderWithSession(<ViewerHarness />);
    const dialog = await openPopup();
    const tab = (name: string) => within(dialog).getByRole("tab", { name });

    expect(tab("Sugerencias")).toHaveAttribute("aria-selected", "true");
    expect(tab("Preguntas")).toHaveAttribute("tabindex", "-1");

    fireEvent.keyDown(tab("Sugerencias"), { key: "ArrowRight" });
    expect(tab("Preguntas")).toHaveAttribute("aria-selected", "true");
    expect(tab("Preguntas")).toHaveFocus();
    expect(within(dialog).getByRole("tabpanel", { name: "Preguntas" })).toBeVisible();

    fireEvent.keyDown(tab("Preguntas"), { key: "End" });
    expect(tab("Notas")).toHaveAttribute("aria-selected", "true");
    fireEvent.keyDown(tab("Notas"), { key: "ArrowRight" });
    expect(tab("Sugerencias")).toHaveAttribute("aria-selected", "true");
    fireEvent.keyDown(tab("Sugerencias"), { key: "ArrowLeft" });
    expect(tab("Notas")).toHaveFocus();
    fireEvent.keyDown(tab("Notas"), { key: "Home" });
    expect(tab("Sugerencias")).toHaveFocus();
  });

  it("hands a page suggestion to the deepen accordion: closes the popup, expands it and prefills the question", async() => {
    renderWithSession(<ViewerHarness />);
    expect(accordionButton()).toHaveAttribute("aria-expanded", "false");
    const dialog = await openPopup();

    expect(within(dialog).queryByText(/\[condición del contexto\]/)).not.toBeInTheDocument();
    fireEvent.click(within(dialog).getByRole("button", { name: (name) => name.startsWith(TUTOR_SUGGESTION_PROMPTS.mindMap) }));

    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
    expect(accordionButton()).toHaveAttribute("aria-expanded", "true");
    const question = await screen.findByRole("textbox", { name: "Tu pregunta" }, LAZY_WAIT);

    expect(question).toHaveValue(TUTOR_SUGGESTION_PROMPTS.mindMap);
    await waitFor(() => expect(question).toHaveFocus());
    expect(deepenBodies).toEqual([]);
  });

  it("opens Preguntas with the lesson summary prefilled after the lesson", async() => {
    renderWithSession(<ViewerHarness postLesson />);
    const dialog = await openPopup();
    const summary = TUTOR_SUGGESTION_PROMPTS.lessonSummary("Ventilación");

    expect(within(dialog).getByRole("heading", { name: "Al terminar la lección" })).toBeInTheDocument();
    fireEvent.click(within(dialog).getByRole("button", { name: (name) => name.startsWith(summary) }));

    expect(within(dialog).getByRole("tab", { name: "Preguntas" })).toHaveAttribute("aria-selected", "true");
    const panel = within(dialog).getByRole("tabpanel", { name: "Preguntas" });

    expect(await within(panel).findByRole("textbox", { name: "Tu pregunta" })).toHaveValue(summary);
    expect(within(panel).getByRole("button", { name: "Abrir en el asistente" })).toBeDisabled();
  });

  it("opens Notas with Tomar apunte and creates the checklist note after the lesson", async() => {
    renderWithSession(<ViewerHarness postLesson />);
    const dialog = await openPopup();

    fireEvent.click(within(dialog).getByRole("button", { name: /^Tomar apunte/ }));
    expect(within(dialog).getByRole("tab", { name: "Notas" })).toHaveAttribute("aria-selected", "true");

    fireEvent.click(within(dialog).getByRole("tab", { name: "Sugerencias" }));
    fireEvent.click(within(dialog).getByRole("button", { name: /^Crear nota 'Checklist de la lección'/ }));

    await waitFor(() => expect(noteBodies).toHaveLength(1));
    expect(noteBodies[0]).toMatchObject({ lessonId: "l1", pageId: "p1", content: { type: "doc" } });
    expect(JSON.stringify(noteBodies[0])).toContain("Checklist de la lección: Ventilación");
    await waitFor(() => expect(within(dialog).getByRole("tab", { name: "Notas" })).toHaveAttribute("aria-selected", "true"));
  });
});

describe("DeepenAccordion", () => {
  it("is an accessible disclosure whose lazy body streams an answer", async() => {
    renderWithSession(<ViewerHarness />);
    const button = accordionButton();
    const region = document.getElementById(button.getAttribute("aria-controls") ?? "");

    expect(region).not.toBeNull();
    expect(region).not.toBeVisible();

    fireEvent.click(button);
    expect(button).toHaveAttribute("aria-expanded", "true");
    expect(await screen.findByRole("heading", { name: "Expansión de Tema con IA" }, LAZY_WAIT)).toBeInTheDocument();
    expect(screen.getByRole("region", { name: "¿Te gustaría expandir más este tema?" })).toBeVisible();

    fireEvent.click(screen.getByRole("button", { name: "Enviar" }));
    expect(await screen.findByRole("heading", { name: "¿Te fue útil?" })).toBeInTheDocument();
    expect(deepenBodies).toEqual([{}]);

    fireEvent.click(button);
    expect(button).toHaveAttribute("aria-expanded", "false");
    expect(region).not.toBeVisible();
  });
});
