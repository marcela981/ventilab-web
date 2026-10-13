/*
* Funcionalidad: Test environment sanity check
* Descripción: Verifies that Vitest runs with jsdom, React Testing Library and the jest-dom matchers registered in vitest.setup.ts.
* Versión: 1.0
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

describe("test environment", () => {
  it("renders React components into jsdom with jest-dom matchers", () => {
    render(<p>VentyLab</p>);

    expect(screen.getByText("VentyLab")).toBeInTheDocument();
  });
});
