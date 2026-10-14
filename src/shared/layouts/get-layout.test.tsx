/*
* Funcionalidad: getLayout selection tests
* Descripción: Verifies resolvePageLayout, the pure helper `pages/_app.js` uses to decide whether a page brings its own layout (getLayout) or keeps the legacy shell. Depends on vitest and Testing Library.
* Versión: 1.0
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

import { render, screen } from "@testing-library/react";
import type { ReactElement } from "react";
import { describe, expect, it } from "vitest";
import { resolvePageLayout } from "./get-layout";
import type { NextPageWithLayout } from "./get-layout";

function Page() {
  return <p>Página</p>;
}

describe("resolvePageLayout", () => {
  it("returns null for a page without getLayout (legacy shell)", () => {
    expect(resolvePageLayout(Page)).toBeNull();
  });

  it("returns null for invalid values", () => {
    expect(resolvePageLayout(null)).toBeNull();
    expect(resolvePageLayout(undefined)).toBeNull();
    expect(resolvePageLayout({ getLayout: "nope" })).toBeNull();
  });

  it("returns the page's getLayout so the page renders inside it", () => {
    const WithLayout: NextPageWithLayout = () => <p>Página</p>;

    WithLayout.getLayout = (page: ReactElement) => <section aria-label="layout">{page}</section>;

    const getLayout = resolvePageLayout(WithLayout);

    expect(getLayout).toBe(WithLayout.getLayout);

    render(<>{getLayout?.(<WithLayout />)}</>);

    expect(screen.getByRole("region", { name: "layout" })).toContainElement(screen.getByText("Página"));
  });
});
