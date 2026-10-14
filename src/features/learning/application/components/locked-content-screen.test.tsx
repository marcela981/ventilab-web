/*
* Funcionalidad: LockedContentScreen tests
* Descripción: Renders the lock screen: title of the locked content, the missing prerequisites as links (or plain text when the tree does not know them), the fallback message when the backend lists none, and the back link. Depends on vitest and Testing Library.
* Versión: 1.0
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { LockedContentScreen } from "./locked-content-screen";

describe("LockedContentScreen", () => {
  it("shows the locked content and links every missing prerequisite", () => {
    render(
      <LockedContentScreen
        title="Ventilación avanzada"
        prerequisites={[
          { id: "m1", title: "Fundamentos", href: "/learn/modules/m1" },
          { id: "m2", title: "Módulo oculto", href: null },
        ]}
        backHref="/learn/s1"
        backLabel="Volver a la sección"
      />,
    );

    expect(screen.getByRole("heading", { name: "Contenido bloqueado" })).toBeInTheDocument();
    expect(screen.getByText(/Ventilación avanzada/)).toBeInTheDocument();

    const list = screen.getByRole("list", { name: "Prerrequisitos pendientes" });

    expect(within(list).getByRole("link", { name: "Fundamentos" })).toHaveAttribute("href", "/learn/modules/m1");
    expect(within(list).getByText("Módulo oculto").closest("a")).toBeNull();
    expect(screen.getByRole("link", { name: "Volver a la sección" })).toHaveAttribute("href", "/learn/s1");
  });

  it("explains the lock even when the backend lists no prerequisite", () => {
    render(<LockedContentScreen title="Módulo 3" prerequisites={[]} backHref="/learn" backLabel="Volver" />);

    expect(screen.getByText("Completa los prerrequisitos de este contenido para desbloquearlo.")).toBeInTheDocument();
    expect(screen.queryByRole("list")).not.toBeInTheDocument();
  });
});
