/*
* Funcionalidad: Exam practical slot registration tests
* Descripción: Verifies that importing the composition module registers the simulator renderer in the evaluations
*   PracticalQuestionSlot (rendered through the public evaluations barrel, which otherwise shows its disabled card)
*   and that the registered component is lazy: the exam slot module is not evaluated by the registration and is only
*   loaded when a SIMULATION question renders (the loading text shows first). The slot module is replaced by a probe
*   that records its evaluation. Depends on vitest and Testing Library.
* Versión: 1.0
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import type { AttemptQuestion } from "@features/evaluations";

// The evaluations barrel loads every evaluations page: give the first import time.
vi.setConfig({ testTimeout: 30_000 });

const probe = vi.hoisted(() => ({ evaluated: false }));

vi.mock("../application/components/exam-practical-slot", () => {
  probe.evaluated = true;

  return {
    ExamPracticalSlot: ({ question }: { question: AttemptQuestion }) => <p>{`Slot del simulador ${question.id}`}</p>,
  };
});

const QUESTION: AttemptQuestion = {
  id: "q1",
  scenarioId: null,
  position: 0,
  type: "SIMULATION",
  prompt: null,
  media: [],
  points: 4,
  clinicalCaseId: "case-1",
  options: [],
  answer: null,
};

describe("register-exam-practical-slot", () => {
  it("registers a lazy renderer that the evaluations slot uses", async() => {
    const { PracticalQuestionSlot } = await import("@features/evaluations");

    await import("./register-exam-practical-slot");

    // Registering does not load the slot code.
    expect(probe.evaluated).toBe(false);

    render(<PracticalQuestionSlot question={QUESTION} answer={null} onChange={() => undefined} />);

    expect(screen.getByText("Cargando la parte práctica…")).toBeInTheDocument();
    expect(await screen.findByText("Slot del simulador q1")).toBeInTheDocument();
    expect(probe.evaluated).toBe(true);
    expect(screen.queryByText("Disponible cuando se habilite el simulador")).not.toBeInTheDocument();
  });
});
