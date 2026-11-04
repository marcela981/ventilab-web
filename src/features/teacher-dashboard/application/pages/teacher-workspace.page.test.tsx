/*
* Funcionalidad: TeacherWorkspacePage tests
* Descripción: Component tests of /teacher as a tabbed workspace: General by default, Por grupo with ?tab=grupo or with a ?groupId and no tab, an explicit ?tab=general wins over ?groupId, tabs with their roles and panel wiring, selecting a tab is a shallow router.replace that keeps the query, and a visited panel stays mounted (hidden) after switching. The two panels are stubbed. Depends on Testing Library, vitest and the workspace page.
* Versión: 1.0
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { TEACHER_WORKSPACE_COPY, TeacherWorkspacePage } from "./teacher-workspace.page";

const router = vi.hoisted(() => ({
  pathname: "/teacher",
  asPath: "/teacher",
  isReady: true,
  query: {} as Record<string, string>,
  replace: vi.fn(() => Promise.resolve(true)),
  push: vi.fn(() => Promise.resolve(true)),
  prefetch: () => Promise.resolve(),
  events: { on: () => undefined, off: () => undefined, emit: () => undefined },
}));

vi.mock("next/router", () => ({ useRouter: () => router }));
vi.mock("../components/general/general-tab", () => ({ GeneralTab: () => <p>general-panel</p> }));
vi.mock("./teacher-dashboard.page", () => ({ TeacherDashboardPage: () => <p>group-panel</p> }));

beforeEach(() => {
  router.query = {};
  router.isReady = true;
  router.replace.mockClear();
});

function tab(name: string) {
  return screen.getByRole("tab", { name });
}

describe("TeacherWorkspacePage", () => {
  it("opens General by default with proper tab roles", async() => {
    render(<TeacherWorkspacePage />);

    expect(await screen.findByText("general-panel")).toBeTruthy();
    expect(screen.getByRole("tablist", { name: TEACHER_WORKSPACE_COPY.tabsLabel })).toBeTruthy();
    expect(tab("General").getAttribute("aria-selected")).toBe("true");
    expect(tab("Por grupo").getAttribute("aria-selected")).toBe("false");
    expect(tab("General").getAttribute("aria-controls")).toBe("teacher-workspace-panel-general");
    expect(screen.getByRole("tabpanel", { name: "General" }).textContent).toBe("general-panel");
    expect(screen.queryByText("group-panel")).toBeNull();
  });

  it("opens Por grupo with ?tab=grupo", async() => {
    router.query = { tab: "grupo" };
    render(<TeacherWorkspacePage />);

    expect(await screen.findByText("group-panel")).toBeTruthy();
    expect(tab("Por grupo").getAttribute("aria-selected")).toBe("true");
  });

  it("opens Por grupo when a group arrives without a tab", async() => {
    router.query = { groupId: "g1" };
    render(<TeacherWorkspacePage />);

    expect(await screen.findByText("group-panel")).toBeTruthy();
    expect(screen.queryByText("general-panel")).toBeNull();
  });

  it("keeps an explicit General tab even with a group in the URL", async() => {
    router.query = { tab: "general", groupId: "g1" };
    render(<TeacherWorkspacePage />);

    expect(await screen.findByText("general-panel")).toBeTruthy();
  });

  it("renders no tabs nor panels before the router is ready", () => {
    router.isReady = false;
    render(<TeacherWorkspacePage />);

    expect(screen.queryByRole("tablist")).toBeNull();
    expect(screen.queryByText("general-panel")).toBeNull();
  });

  it("selects a tab with a shallow replace and keeps the visited panel mounted", async() => {
    router.query = { groupId: "g1", tab: "general" };
    const { rerender } = render(<TeacherWorkspacePage />);

    await screen.findByText("general-panel");
    fireEvent.click(tab("Por grupo"));

    expect(router.replace).toHaveBeenCalledWith({ pathname: "/teacher", query: { groupId: "g1", tab: "grupo" } }, undefined, { shallow: true });

    router.query = { groupId: "g1", tab: "grupo" };
    rerender(<TeacherWorkspacePage />);

    expect(await screen.findByText("group-panel")).toBeTruthy();
    // General stays mounted, only hidden.
    const general = document.getElementById("teacher-workspace-panel-general");

    expect(general?.hidden).toBe(true);
    expect(general?.textContent).toBe("general-panel");
  });
});
