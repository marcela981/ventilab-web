/*
* Funcionalidad: Command panel tests
* Descripción: The explicit way out of the unreported block (T8 review fix 2, W5): «Usar los valores que informa el
*   equipo» is offered only when the block can be lifted, calls the handler once per click and explains that the next
*   change is built from the reported values. v1.1 (T8 review fix 3, W1): the accepted values named by the notice are listed next to the button. Depends on vitest, Testing Library, the lab test helpers and the command
*   panel. v1.2 (Bloque 5, C8): the July collapsible panel (closed "Comandos recientes (n)" with the latest command; the
*   notice stays visible; opens by itself when «Usar los valores…» becomes available).
* Versión: 1.2
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

import { fireEvent, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { renderLab } from "../pages/lab-test-helpers";
import { COMMAND_PANEL_COPY, CommandPanel } from "./command-panel";

const BASE = { notice: null, busyReason: "bloqueado", recent: [], recentLoading: false, recentFailed: false };

describe("CommandPanel", () => {
  it("offers «Usar los valores que informa el equipo» only while the block can be lifted", () => {
    const onUseReported = vi.fn();
    const { rerender } = renderLab(<CommandPanel {...BASE} onUseReported={onUseReported} />);

    expect(screen.getByText(COMMAND_PANEL_COPY.useReportedHint)).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: COMMAND_PANEL_COPY.useReported }));
    expect(onUseReported).toHaveBeenCalledTimes(1);

    rerender(<CommandPanel {...BASE} />);
    expect(screen.queryByRole("button", { name: COMMAND_PANEL_COPY.useReported })).not.toBeInTheDocument();
  });

  it("lists the accepted values the notice names next to the way out (T8 review fix 3, W1)", () => {
    const line = "Vt: aceptado 600 mL, el equipo informa 500 mL — el próximo comando enviará 500 mL";

    renderLab(<CommandPanel {...BASE} notice={{ tone: "warning", message: "bloqueado", details: [line] }} onUseReported={vi.fn()} />);

    expect(screen.getByRole("listitem")).toHaveTextContent(line);
    expect(screen.getByRole("button", { name: COMMAND_PANEL_COPY.useReported })).toBeInTheDocument();
  });

  it("collapsible (July): closed by default with the count and the latest command; the notice stays visible", () => {
    const recent = [{ id: "c1", status: "APPLIED", summary: "FR 14 → 16 rpm", reason: null, createdAt: null, latencyMs: null }] as const;
    const { rerender } = renderLab(
      <CommandPanel {...BASE} busyReason={null} recent={recent} notice={{ tone: "info", message: "Comando aplicado", details: [] }} collapsible />,
    );
    const toggle = screen.getByRole("button", { name: COMMAND_PANEL_COPY.titleCount(1) });

    expect(toggle).toHaveAttribute("aria-expanded", "false");
    expect(screen.getByText("Comando aplicado")).toBeVisible();
    expect(screen.getByText(/^Último: FR 14 → 16 rpm/)).toBeInTheDocument();
    expect(screen.getByText(COMMAND_PANEL_COPY.hint)).not.toBeVisible();

    fireEvent.click(toggle);
    expect(toggle).toHaveAttribute("aria-expanded", "true");
    expect(screen.getByText(COMMAND_PANEL_COPY.hint)).toBeVisible();
    fireEvent.click(toggle);

    rerender(<CommandPanel {...BASE} recent={recent} collapsible onUseReported={vi.fn()} />);
    expect(toggle).toHaveAttribute("aria-expanded", "true");
  });
});
