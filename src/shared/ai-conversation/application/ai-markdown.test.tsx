/*
* Funcionalidad: AiMarkdown tests
* Descripción: Security and rendering tests of the AI answer markdown: markdown renders after the lazy renderer loads, raw HTML (script, img with onerror) is never injected, javascript:/data:/vbscript: links and images lose their URL, external links open in a new tab with rel noopener noreferrer, and empty content renders nothing. Depends on vitest and Testing Library.
* Versión: 1.0
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { AiMarkdown } from "./ai-markdown";

// The first lazy import transforms react-markdown on demand, which is slow on a loaded machine.
const LAZY_WAIT = { timeout: 10_000 };
const LAZY_TEST_TIMEOUT = 15_000;

describe("AiMarkdown", () => {
  it("renders the markdown of an answer", async() => {
    render(<AiMarkdown content={"## PEEP\n\n- **Presión** positiva"} />);

    expect(await screen.findByRole("heading", { level: 2, name: "PEEP" }, LAZY_WAIT)).toBeInTheDocument();
    expect(screen.getByText("Presión").tagName).toBe("STRONG");
  }, LAZY_TEST_TIMEOUT);

  it("never injects raw HTML such as script or an img with onerror", async() => {
    const { container } = render(
      <AiMarkdown content={"Texto <script>alert(1)</script>\n\n<img src=x onerror=\"alert(1)\">\n\n<b>negrita</b>"} />,
    );

    await screen.findByText(/Texto/, {}, LAZY_WAIT);

    expect(container.querySelector("script")).toBeNull();
    expect(container.querySelector("img")).toBeNull();
    expect(container.querySelector("[onerror]")).toBeNull();
    expect(container.querySelector("b")).toBeNull();
  }, LAZY_TEST_TIMEOUT);

  it("drops javascript:, data: and vbscript: URLs from links and images", async() => {
    const { container } = render(
      <AiMarkdown content={"[uno](javascript:alert(1)) [dos](data:text/html,hola) [tres](vbscript:msgbox(1))\n\n![imagen](javascript:alert(1))"} />,
    );

    await screen.findByText("uno", {}, LAZY_WAIT);

    for (const name of ["uno", "dos", "tres"]) {
      expect(screen.getByText(name).getAttribute("href") ?? "").not.toMatch(/javascript|data:|vbscript/i);
    }

    container.querySelectorAll("img").forEach((image) => {
      expect(image.getAttribute("src") ?? "").not.toMatch(/javascript/i);
      expect(image.getAttribute("onerror")).toBeNull();
    });
  }, LAZY_TEST_TIMEOUT);

  it("opens external links in a new tab with rel noopener noreferrer", async() => {
    render(<AiMarkdown content={"Lee la [guía](https://example.org/guia)."} />);

    const link = await screen.findByRole("link", { name: "guía" }, LAZY_WAIT);

    expect(link).toHaveAttribute("href", "https://example.org/guia");
    expect(link).toHaveAttribute("target", "_blank");
    expect(link).toHaveAttribute("rel", "noopener noreferrer");
  }, LAZY_TEST_TIMEOUT);

  it("renders nothing visible for empty content", () => {
    const { container } = render(<AiMarkdown content="" />);

    expect(container.textContent).toBe("");
    expect(screen.queryByRole("status")).not.toBeInTheDocument();
  });
});
