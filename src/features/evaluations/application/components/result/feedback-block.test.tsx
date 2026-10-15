/*
* Funcionalidad: FeedbackBlock tests
* Descripción: Verifies that a PENDING feedback item shows "Generando retroalimentación…" and, only once the backup polling gave up (pollingStopped), the hint asking the student to reload the page. Depends on vitest, Testing Library and the FeedbackBlock component.
* Versión: 1.0
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import type { FeedbackItem } from "../../entities/attempt-feedback";
import { FEEDBACK_COPY, FeedbackBlock } from "./feedback-block";

const pending = { id: "f1", questionId: "q1", status: "PENDING", source: null, content: null } as FeedbackItem;

describe("FeedbackBlock", () => {
  it("shows the generating state without the reload hint while polling continues", () => {
    render(<FeedbackBlock item={pending} title="Retroalimentación" />);

    expect(screen.getByText(FEEDBACK_COPY.generating)).toBeInTheDocument();
    expect(screen.queryByText(FEEDBACK_COPY.pollingStopped)).not.toBeInTheDocument();
  });

  it("asks to reload once the polling stopped", () => {
    render(<FeedbackBlock item={pending} title="Retroalimentación" pollingStopped />);

    expect(screen.getByRole("alert")).toHaveTextContent(FEEDBACK_COPY.pollingStopped);
  });
});
