/*
* Funcionalidad: Session divergence dialog tests
* Descripción: Verifies that the blocking divergence dialog is an alertdialog named by its title whose accessible
*   description carries both the explanation and the server detail of the refusal, and that "Recargar sesión" calls
*   the reload. Depends on vitest and Testing Library.
* Versión: 1.0
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { DIVERGENCE_COPY, DivergenceDialog } from "./divergence-dialog";

describe("DivergenceDialog", () => {
  it("describes the dialog with the explanation and the server detail", () => {
    const onReload = vi.fn();

    render(<DivergenceDialog open detail="El servidor rechazó el evento." onReload={onReload} />);

    const dialog = screen.getByRole("alertdialog", { name: DIVERGENCE_COPY.title });

    expect(dialog).toHaveAccessibleDescription(`${DIVERGENCE_COPY.description} El servidor rechazó el evento.`);
    fireEvent.click(screen.getByRole("button", { name: DIVERGENCE_COPY.reload }));
    expect(onReload).toHaveBeenCalledTimes(1);
  });

  it("describes the dialog with the explanation only when there is no detail", () => {
    render(<DivergenceDialog open detail={null} onReload={() => undefined} />);

    expect(screen.getByRole("alertdialog", { name: DIVERGENCE_COPY.title })).toHaveAccessibleDescription(DIVERGENCE_COPY.description);
  });
});
