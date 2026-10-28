/*
* Funcionalidad: CurriculumTab tests
* Descripción: The Currículo tab of /learn against a mocked backend (msw) and a reactive mocked next/router (W4, Bloque 2): the three accordions in the July order with Mecánica open by default and "Opcional" on Prerequisitos; one open at a time, ?section= opens another and the arrow keys move between triggers; exactly the tree and summary requests (no per-module request); levels with the "x/y módulos" progress and the lock text; module cards with the five states and the July button texts, where only the button links to the module resolver; error with retry and a progress warning; staff see no locks, drafts with "Borrador" and the "Modo edición" toggle that reveals the CMS links and keeps the module PDF. Depends on vitest, Testing Library, msw, the learning router and test helpers.
* Versión: 0.1
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

import { act, fireEvent, screen, waitFor, within } from "@testing-library/react";
import { http, HttpResponse } from "msw";
import { setupServer } from "msw/node";
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { routerStore } from "../../learning-router-test-helpers";
import {
  apiUrl,
  envelope,
  errorResponse,
  levelProgressItemDto,
  moduleProgressItemDto,
  progressSummaryDto,
  renderWithSession,
  seededTreeDto,
} from "../../pages/learning-test-helpers";
import { resetEditModeStore } from "../../session/edit-mode-store";
import { CurriculumTab } from "./curriculum-tab";

vi.mock("next/router", async() => (await import("../../learning-router-test-helpers")).nextRouterMock);

const server = setupServer();
const requests: string[] = [];

const summary = progressSummaryDto(
  [levelProgressItemDto("level-beginner", 1, 3)],
  [moduleProgressItemDto("m-b1", 2, 2), moduleProgressItemDto("m-b2", 1, 3)],
);

beforeAll(() => {
  server.listen({ onUnhandledRequest: "error" });
});

beforeEach(() => {
  routerStore.reset();
  window.localStorage.clear();
  resetEditModeStore();
  requests.length = 0;
  server.use(
    http.get(apiUrl("/api/curriculum/tree"), () => {
      requests.push("tree");

      return HttpResponse.json(envelope(seededTreeDto()));
    }),
    http.get(apiUrl("/api/progress/summary"), () => {
      requests.push("summary");

      return HttpResponse.json(envelope(summary));
    }),
  );
});

afterEach(() => {
  server.resetHandlers();
});

afterAll(() => {
  server.close();
});

const trigger = (name: RegExp) => screen.getByRole("button", { name });

describe("CurriculumTab", () => {
  it("shows the three July accordions with Mecánica open by default", async() => {
    renderWithSession(<CurriculumTab />);

    expect(await screen.findByRole("heading", { level: 2, name: "Niveles de Aprendizaje" })).toBeInTheDocument();
    expect(screen.getAllByRole("heading", { level: 3 }).map((heading) => heading.textContent)).toEqual([
      "Aprendizaje VentyLab",
      "PrerequisitosOpcional",
      "Aprendizaje Mecánica respiratoria",
    ]);
    expect(trigger(/Mecánica respiratoria/)).toHaveAttribute("aria-expanded", "true");
    expect(trigger(/VentyLab/)).toHaveAttribute("aria-expanded", "false");
    expect(screen.getByRole("region", { name: /Mecánica respiratoria/ })).toBeVisible();
  });

  it("requests only the tree and the progress summary", async() => {
    renderWithSession(<CurriculumTab />);

    await screen.findByRole("heading", { level: 4, name: "Nivel Principiante" });

    await waitFor(() => {
      expect([...requests].sort()).toEqual(["summary", "tree"]);
    });
  });

  it("opens one accordion at a time and moves between triggers with the arrow keys", async() => {
    renderWithSession(<CurriculumTab />);

    await screen.findByRole("heading", { level: 2 });
    fireEvent.click(trigger(/Prerequisitos/));

    expect(trigger(/Prerequisitos/)).toHaveAttribute("aria-expanded", "true");
    expect(trigger(/Mecánica respiratoria/)).toHaveAttribute("aria-expanded", "false");

    fireEvent.click(trigger(/Prerequisitos/));
    expect(trigger(/Prerequisitos/)).toHaveAttribute("aria-expanded", "false");

    fireEvent.keyDown(trigger(/VentyLab/), { key: "ArrowDown" });
    expect(trigger(/Prerequisitos/)).toHaveFocus();
    fireEvent.keyDown(trigger(/Prerequisitos/), { key: "End" });
    expect(trigger(/Mecánica respiratoria/)).toHaveFocus();
  });

  it("opens the accordion of ?section= (section id, level id or key) and follows URL changes", async() => {
    routerStore.reset({ section: "section-ventylab" });
    renderWithSession(<CurriculumTab />);

    await screen.findByRole("heading", { level: 2 });
    expect(trigger(/VentyLab/)).toHaveAttribute("aria-expanded", "true");
    expect(trigger(/Mecánica respiratoria/)).toHaveAttribute("aria-expanded", "false");

    act(() => {
      routerStore.reset({ section: "level-prerequisitos" });
    });

    expect(trigger(/Prerequisitos/)).toHaveAttribute("aria-expanded", "true");
  });

  it("shows the level progress and locks, and the five card states with the July buttons", async() => {
    renderWithSession(<CurriculumTab />);

    const beginner = (await screen.findByRole("heading", { level: 4, name: "Nivel Principiante" })).closest("li") as HTMLElement;

    expect(within(beginner).getByText("En progreso")).toBeInTheDocument();
    expect(within(beginner).getByRole("progressbar", { name: "Progreso de Nivel Principiante" })).toHaveAttribute("aria-valuenow", "33");
    expect(within(beginner).getByText("33 % · 1/3 módulos")).toBeInTheDocument();

    const card = (name: string) => within(beginner).getByRole("article", { name });

    expect(within(card("Módulo m-b1")).getByRole("link", { name: "Módulo completado: Módulo m-b1" })).toHaveAttribute("href", "/learn/modules/m-b1");
    expect(within(card("Módulo m-b1")).getByRole("link")).toHaveTextContent("Completado");
    expect(within(card("Módulo m-b2")).getByRole("link", { name: "Continuar módulo: Módulo m-b2" })).toHaveAttribute("href", "/learn/modules/m-b2");
    expect(within(card("Módulo m-b2")).getByText("1 de 3 lecciones completadas")).toBeInTheDocument();
    expect(within(card("Módulo m-b3")).getByRole("button", { name: "Próximamente: Módulo m-b3" })).toBeDisabled();
    expect(within(card("Módulo m-b3")).queryByRole("link")).not.toBeInTheDocument();

    const intermediate = screen.getByRole("heading", { level: 4, name: "Nivel Intermedio" }).closest("li") as HTMLElement;

    expect(within(intermediate).getByText("Completa el nivel anterior para desbloquear")).toBeInTheDocument();
    expect(within(intermediate).getByText("Bloqueado")).toBeInTheDocument();
    expect(within(intermediate).queryByRole("article")).not.toBeInTheDocument();

    fireEvent.click(trigger(/Prerequisitos/));
    const prerequisites = screen.getByRole("region", { name: /Prerequisitos/ });

    expect(within(prerequisites).getByRole("link", { name: "Comenzar módulo: Módulo m-p1" })).toHaveTextContent("Comenzar");
    expect(screen.queryByText("Borrador VentyLab")).not.toBeInTheDocument();
  });

  it("only links the button of a card: the card itself does not navigate", async() => {
    renderWithSession(<CurriculumTab />);

    const card = await screen.findByRole("article", { name: "Módulo m-b2" });

    expect(within(card).getAllByRole("link")).toHaveLength(1);
    fireEvent.click(card);
    expect(routerStore.push).not.toHaveBeenCalled();
  });

  it("offers a retry when the tree fails and warns when only the progress fails", async() => {
    server.use(http.get(apiUrl("/api/curriculum/tree"), () => errorResponse("internal_error", 500)));
    const { unmount } = renderWithSession(<CurriculumTab />);

    expect(await screen.findByText("No se pudo cargar el currículo")).toBeInTheDocument();
    server.use(http.get(apiUrl("/api/curriculum/tree"), () => HttpResponse.json(envelope(seededTreeDto()))));
    fireEvent.click(screen.getByRole("button", { name: /reintentar/i }));
    expect(await screen.findByRole("heading", { level: 2, name: "Niveles de Aprendizaje" })).toBeInTheDocument();
    unmount();

    server.use(http.get(apiUrl("/api/progress/summary"), () => errorResponse("internal_error", 500)));
    renderWithSession(<CurriculumTab />);

    expect(await screen.findByText("No se pudo cargar tu progreso.")).toBeInTheDocument();
    expect(screen.getByRole("article", { name: "Módulo m-b1" })).toHaveTextContent("Completado");
  });

  it("previews everything for staff, with drafts, the module PDF and the edit mode links", async() => {
    renderWithSession(<CurriculumTab />, "TEACHER");

    const intermediate = (await screen.findByRole("heading", { level: 4, name: "Nivel Intermedio" })).closest("li") as HTMLElement;

    expect(screen.getByText("Vista previa")).toBeInTheDocument();
    expect(within(intermediate).queryByText("Completa el nivel anterior para desbloquear")).not.toBeInTheDocument();
    expect(within(intermediate).getByRole("link", { name: "Comenzar módulo: Módulo m-i1" })).toBeInTheDocument();
    expect(within(intermediate).getByRole("link", { name: "PDF del módulo: Módulo m-i1" })).toHaveAttribute("href", "/learn/modules/m-i1/print");
    expect(screen.queryByRole("link", { name: /Editar en el CMS/ })).not.toBeInTheDocument();

    fireEvent.click(trigger(/VentyLab/));
    const ventylab = screen.getByRole("region", { name: /VentyLab/ });

    expect(within(ventylab).getByRole("heading", { level: 4, name: "Borrador VentyLab" }).closest("li")).toHaveTextContent("Borrador");

    const toggle = screen.getByRole("button", { name: "Modo edición" });

    expect(toggle).toHaveAttribute("aria-pressed", "false");
    fireEvent.click(toggle);

    expect(toggle).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByText("MODO EDICIÓN")).toBeInTheDocument();
    expect(within(ventylab).getByRole("link", { name: "Editar en el CMS: Principiante" })).toHaveAttribute("href", "/content?node=level:ventylab-principiante");
    expect(within(ventylab).getByRole("link", { name: "Editar en el CMS: Módulo m-v1" })).toHaveAttribute("href", "/content?node=module:m-v1");
  });

  it("never shows the edit mode toggle to students", async() => {
    renderWithSession(<CurriculumTab />);

    await screen.findByRole("heading", { level: 2 });
    expect(screen.queryByRole("button", { name: "Modo edición" })).not.toBeInTheDocument();
    expect(screen.queryByRole("link", { name: /PDF del módulo/ })).not.toBeInTheDocument();
  });
});
