/*
* Funcionalidad: LearnWorkspace tests
* Descripción: The /learn workspace shell (W3, Bloque 2): nothing is read before the router is ready; a missing or unknown `?tab=` opens Currículo; the top tabs switch with a shallow router.replace that keeps the rest of the query; arrow keys move between tabs; each panel loads on its first visit and then stays mounted (hidden), so the Currículo panel mounts once across tab switches; staff only get Currículo (no tab list, `?tab=` ignored); the tree and progress summary are requested once each. Depends on vitest, Testing Library, msw, the learning router and test helpers and mocked panels. v0.2 (W8, Bloque 2): the Inicio wave (student summary, gamification, recent activity) starts once with the panel for students and never for staff. v0.3 (W9, Bloque 2): the Mi Progreso wave (gamification, calendar, achievements, tree, progress summary) starts once with its panel.
* Versión: 0.3
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

import { act, fireEvent, screen, waitFor } from "@testing-library/react";
import { http, HttpResponse } from "msw";
import { setupServer } from "msw/node";
import { useEffect } from "react";
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { routerStore } from "../../learning-router-test-helpers";
import { apiUrl, envelope, progressSummaryDto, renderWithSession, treeDto } from "../../pages/learning-test-helpers";
import { LearnWorkspace } from "./learn-workspace";

const counters = vi.hoisted(() => ({ curriculumMounts: 0, curriculumUnmounts: 0 }));

vi.mock("next/router", async() => (await import("../../learning-router-test-helpers")).nextRouterMock);

function CountingCurriculumTab() {
  useEffect(() => {
    counters.curriculumMounts += 1;

    return () => {
      counters.curriculumUnmounts += 1;
    };
  }, []);

  return <h2>curriculum panel</h2>;
}

vi.mock("../curriculum/curriculum-tab", () => ({ CurriculumTab: CountingCurriculumTab }));
vi.mock("../home/home-tab", () => ({ HomeTab: () => <h2>home panel</h2> }));
vi.mock("../progress/progress-tab", () => ({ ProgressTab: () => <h2>progress panel</h2> }));

const server = setupServer();
const requests: string[] = [];

beforeAll(() => {
  server.listen({ onUnhandledRequest: "error" });
});

beforeEach(() => {
  routerStore.reset();
  counters.curriculumMounts = 0;
  counters.curriculumUnmounts = 0;
  requests.length = 0;
  server.use(
    http.get(apiUrl("/api/curriculum/tree"), () => {
      requests.push("tree");

      return HttpResponse.json(envelope(treeDto()));
    }),
    http.get(apiUrl("/api/progress/summary"), () => {
      requests.push("summary");

      return HttpResponse.json(envelope(progressSummaryDto()));
    }),
    http.get(apiUrl("/api/me/summary"), () => {
      requests.push("me-summary");

      return HttpResponse.json(envelope(null), { status: 503 });
    }),
    http.get(apiUrl("/api/progress/gamification"), () => {
      requests.push("gamification");

      return HttpResponse.json(envelope(null), { status: 503 });
    }),
    http.get(apiUrl("/api/progress/activity"), () => {
      requests.push("calendar");

      return HttpResponse.json(envelope({ days: [] }));
    }),
    http.get(apiUrl("/api/progress/achievements"), () => {
      requests.push("achievements");

      return HttpResponse.json(envelope({ achievements: [], totalUnlocked: 0 }));
    }),
    http.get(apiUrl("/api/progress/activity/recent"), () => {
      requests.push("recent");

      return HttpResponse.json(envelope([]));
    }),
  );
});

afterEach(() => {
  server.resetHandlers();
});

afterAll(() => {
  server.close();
});

describe("LearnWorkspace", () => {
  it("renders no panel until the router is ready, then opens Currículo by default", async() => {
    routerStore.reset({}, false);
    renderWithSession(<LearnWorkspace />);

    expect(screen.queryByRole("tablist")).not.toBeInTheDocument();
    expect(screen.queryByText("curriculum panel")).not.toBeInTheDocument();

    act(() => {
      routerStore.setReady();
    });

    expect(await screen.findByText("curriculum panel")).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: "Currículo" })).toHaveAttribute("aria-selected", "true");
    expect(screen.getAllByRole("tab").map((tab) => tab.textContent)).toEqual(["Inicio", "Currículo", "Mi Progreso"]);
  });

  it("falls back to Currículo for an unknown tab and opens a known one from the URL", async() => {
    routerStore.reset({ tab: "nope" });
    const { unmount } = renderWithSession(<LearnWorkspace />);

    expect(await screen.findByText("curriculum panel")).toBeInTheDocument();
    unmount();

    routerStore.reset({ tab: "progreso" });
    renderWithSession(<LearnWorkspace />);

    expect(await screen.findByText("progress panel")).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: "Mi Progreso" })).toHaveAttribute("aria-selected", "true");
  });

  it("switches tabs with a shallow replace that keeps the query and keeps visited panels mounted", async() => {
    routerStore.reset({ section: "mecanica" });
    renderWithSession(<LearnWorkspace />);

    await screen.findByText("curriculum panel");
    fireEvent.click(screen.getByRole("tab", { name: "Inicio" }));

    expect(routerStore.replace).toHaveBeenCalledWith(
      { pathname: "/learn", query: { section: "mecanica", tab: "inicio" } },
      undefined,
      { shallow: true },
    );
    expect(await screen.findByText("home panel")).toBeVisible();
    expect(screen.getByText("curriculum panel")).not.toBeVisible();

    fireEvent.click(screen.getByRole("tab", { name: "Currículo" }));

    await waitFor(() => {
      expect(screen.getByText("curriculum panel")).toBeVisible();
    });
    expect(counters.curriculumMounts).toBe(1);
    expect(counters.curriculumUnmounts).toBe(0);
  });

  it("moves between tabs with the arrow keys", async() => {
    renderWithSession(<LearnWorkspace />);

    await screen.findByText("curriculum panel");
    fireEvent.keyDown(screen.getByRole("tab", { name: "Currículo" }), { key: "ArrowRight" });

    expect(await screen.findByText("progress panel")).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: "Mi Progreso" })).toHaveFocus();
  });

  it("only shows Currículo to staff and ignores the URL tab", async() => {
    routerStore.reset({ tab: "progreso" });
    renderWithSession(<LearnWorkspace />, "TEACHER");

    expect(await screen.findByText("curriculum panel")).toBeInTheDocument();
    expect(screen.queryByRole("tablist")).not.toBeInTheDocument();
    expect(screen.queryByText("progress panel")).not.toBeInTheDocument();
    expect(screen.getByRole("tabpanel", { name: /^Aprender/ })).toBeInTheDocument();
  });

  it("starts the Inicio wave (summary, gamification, recent activity) once, in parallel, with the panel", async() => {
    routerStore.reset({ tab: "inicio" });
    renderWithSession(<LearnWorkspace />);

    await screen.findByText("home panel");

    await waitFor(() => {
      expect([...requests].sort()).toEqual(["gamification", "me-summary", "recent"]);
    });
  });

  it("starts the Mi Progreso wave once, in parallel, with the panel", async() => {
    routerStore.reset({ tab: "progreso" });
    renderWithSession(<LearnWorkspace />);

    await screen.findByText("progress panel");

    await waitFor(() => {
      expect([...requests].sort()).toEqual(["achievements", "calendar", "gamification", "summary", "tree"]);
    });
  });

  it("never requests the Inicio data for staff, even with ?tab=inicio", async() => {
    routerStore.reset({ tab: "inicio" });
    renderWithSession(<LearnWorkspace />, "ADMIN");

    await screen.findByText("curriculum panel");

    await waitFor(() => {
      expect([...requests].sort()).toEqual(["summary", "tree"]);
    });
    expect(screen.queryByText("home panel")).not.toBeInTheDocument();
  });

  it("requests the tree and the progress summary once each for the Currículo tab", async() => {
    renderWithSession(<LearnWorkspace />);

    await screen.findByText("curriculum panel");

    await waitFor(() => {
      expect([...requests].sort()).toEqual(["summary", "tree"]);
    });
  });
});
