/*
* Funcionalidad: Simulator workspace page tests
* Descripción: The /simulador placeholder (W1) waits for the router before reading `?tab=`, falls back to monitoreo for a missing, repeated or unknown tab and loads the existing page of each tab (simular and sesiones → simulator catalog, conexion → lab home, monitoreo → lab live console). Depends on vitest, Testing Library and mocked next/router and feature barrels.
* Versión: 0.1
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { parseWorkspaceTab } from "../entities/workspace-tab.entity";
import { SIMULATOR_WORKSPACE_COPY, SimulatorWorkspacePage } from "./simulator-workspace.page";

const router = vi.hoisted(() => ({ isReady: true, query: {} as Record<string, string | string[]> }));

vi.mock("next/router", () => ({ useRouter: () => router }));
vi.mock("@features/simulator", () => ({ SimulatorCatalogPage: () => <p>catalog page</p> }));
vi.mock("@features/ventilator-lab", () => ({
  LabHomePage: () => <p>lab home page</p>,
  LabLivePage: () => <p>lab live page</p>,
}));

beforeEach(() => {
  router.isReady = true;
  router.query = {};
});

describe("parseWorkspaceTab", () => {
  it.each(["simular", "monitoreo", "conexion", "sesiones"] as const)("keeps %s", (tab) => {
    expect(parseWorkspaceTab(tab)).toBe(tab);
  });

  it.each([undefined, "", "otra", ["simular", "conexion"]])("falls back to monitoreo for %j", (value) => {
    expect(parseWorkspaceTab(value)).toBe("monitoreo");
  });
});

describe("SimulatorWorkspacePage", () => {
  it("shows only the heading until the router is ready", () => {
    router.isReady = false;
    router.query = { tab: "simular" };
    render(<SimulatorWorkspacePage />);

    expect(screen.getByRole("heading", { level: 1, name: SIMULATOR_WORKSPACE_COPY.title })).toBeInTheDocument();
    expect(screen.queryByText(/page$/)).not.toBeInTheDocument();
  });

  it.each([
    ["simular", "catalog page"],
    ["sesiones", "catalog page"],
    ["conexion", "lab home page"],
    ["monitoreo", "lab live page"],
  ])("loads the existing page of the %s tab", async(tab, text) => {
    router.query = { tab };
    render(<SimulatorWorkspacePage />);

    expect(await screen.findByText(text)).toBeInTheDocument();
  });

  it("opens monitoreo without a tab", async() => {
    render(<SimulatorWorkspacePage />);

    expect(await screen.findByText("lab live page")).toBeInTheDocument();
  });
});
