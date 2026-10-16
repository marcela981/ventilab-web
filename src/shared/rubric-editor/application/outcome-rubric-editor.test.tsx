/*
* Funcionalidad: OutcomeRubricEditor tests
* Descripción: Behaviour of the controlled outcome rubric editor (rendered with a stateful host): add criteria with the
*   first unused type (a used type is disabled in the other selects, the add button stops at eight), type-specific
*   fields (window only for TIME_IN_RANGE, penalty only for the safety limits and AI assist usage, the threshold label
*   with its unit), reorder and remove, the weight total with its warning, the validation messages on their fields
*   (and hidden with showIssues off), the policy and passing score, and the disabled state. Depends on Vitest,
*   Testing Library and the rubric-editor module.
* Versión: 1.0
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

import { fireEvent, render, screen, within } from "@testing-library/react";
import { useState } from "react";
import { describe, expect, it, vi } from "vitest";
import { OutcomeRubricEditor } from "./outcome-rubric-editor";
import { emptyOutcomeRubricDraft, OUTCOME_CRITERION_TYPES, outcomeRubricDraftFrom, toOutcomeRubricValue } from "./outcome-rubric.entity";
import type { OutcomeRubricDraft } from "./outcome-rubric.entity";
import { OUTCOME_RUBRIC_COPY } from "./rubric-editor-copy";

type HostProps = {
  initial?: OutcomeRubricDraft
  disabled?: boolean
  showIssues?: boolean
  onValue?: (value: OutcomeRubricDraft) => void
};

function Host({ initial = emptyOutcomeRubricDraft(), disabled = false, showIssues = true, onValue }: HostProps) {
  const [value, setValue] = useState(initial);
  const [counter, setCounter] = useState(0);

  return (
    <OutcomeRubricEditor
      value={value}
      disabled={disabled}
      showIssues={showIssues}
      newKey={() => {
        setCounter((current) => current + 1);

        return `new-${counter}`;
      }}
      onChange={(next) => {
        setValue(next);
        onValue?.(next);
      }}
    />
  );
}

const STORED = outcomeRubricDraftFrom({
  assistancePolicy: "DISABLED",
  passingScore: 70,
  criteria: [
    { type: "TARGETS_REACHED", weight: 60, threshold: 1 },
    { type: "TIME_IN_RANGE", weight: 40, threshold: 80, windowMinutes: 5 },
  ],
});

const typeOf = (position: number) => screen.getByLabelText(OUTCOME_RUBRIC_COPY.type(position)) as HTMLSelectElement;

describe("OutcomeRubricEditor", () => {
  it("adds criteria with the first unused type and disables used types in the other selects", () => {
    render(<Host />);

    expect(screen.getByText(OUTCOME_RUBRIC_COPY.empty)).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: OUTCOME_RUBRIC_COPY.add }));
    fireEvent.click(screen.getByRole("button", { name: OUTCOME_RUBRIC_COPY.add }));

    expect(typeOf(1).value).toBe("TARGETS_REACHED");
    expect(typeOf(2).value).toBe("TIME_TO_STABILIZE");
    expect(within(typeOf(2)).getByRole("option", { name: "Objetivos alcanzados" })).toBeDisabled();
  });

  it("stops adding once every type is used", () => {
    const seven = outcomeRubricDraftFrom({
      assistancePolicy: "DISABLED",
      passingScore: 70,
      criteria: OUTCOME_CRITERION_TYPES.slice(0, 7).map((type) => ({ type, weight: 10, threshold: 1 })),
    });

    render(<Host initial={seven} showIssues={false} />);
    fireEvent.click(screen.getByRole("button", { name: OUTCOME_RUBRIC_COPY.add }));

    expect(screen.getAllByRole("listitem")).toHaveLength(8);
    expect(typeOf(8).value).toBe("AI_ASSIST_USAGE");
    expect(screen.getByRole("button", { name: OUTCOME_RUBRIC_COPY.add })).toBeDisabled();
  }, 15_000);

  it("shows the window only for TIME_IN_RANGE and the penalty only for limits and AI assist, with the threshold unit", () => {
    render(<Host initial={STORED} />);

    expect(screen.getByLabelText(OUTCOME_RUBRIC_COPY.windowMinutes(2))).toHaveValue("5");
    expect(screen.queryByLabelText(OUTCOME_RUBRIC_COPY.windowMinutes(1))).not.toBeInTheDocument();
    expect(screen.queryByLabelText(OUTCOME_RUBRIC_COPY.penaltyPoints(1))).not.toBeInTheDocument();
    expect(screen.getByLabelText("Fracción mínima de objetivos (0 a 1) (criterio 1)")).toHaveValue("1");

    fireEvent.change(typeOf(1), { target: { value: "PLATEAU_PRESSURE_LIMIT" } });

    expect(screen.getByLabelText(OUTCOME_RUBRIC_COPY.penaltyPoints(1))).toBeInTheDocument();
    expect(screen.getByLabelText("Presión meseta máxima (cmH2O) (criterio 1)")).toBeInTheDocument();
  });

  it("reorders and removes criteria", () => {
    const onValue = vi.fn();

    render(<Host initial={STORED} onValue={onValue} />);

    expect(screen.getByRole("button", { name: OUTCOME_RUBRIC_COPY.moveUp(1) })).toBeDisabled();
    expect(screen.getByRole("button", { name: OUTCOME_RUBRIC_COPY.moveDown(2) })).toBeDisabled();

    fireEvent.click(screen.getByRole("button", { name: OUTCOME_RUBRIC_COPY.moveDown(1) }));
    expect(typeOf(1).value).toBe("TIME_IN_RANGE");
    expect(typeOf(2).value).toBe("TARGETS_REACHED");

    fireEvent.click(screen.getByRole("button", { name: OUTCOME_RUBRIC_COPY.remove(1) }));
    expect(screen.getAllByRole("listitem")).toHaveLength(1);
    expect(typeOf(1).value).toBe("TARGETS_REACHED");
    expect(onValue).toHaveBeenCalledTimes(2);
  });

  it("shows the weight total and warns when it is not 100", () => {
    render(<Host initial={STORED} />);

    expect(screen.getByRole("status")).toHaveTextContent("Suma de los pesos: 100 de 100");
    expect(screen.queryByText(OUTCOME_RUBRIC_COPY.weightTotalWarning(100))).not.toBeInTheDocument();

    fireEvent.change(screen.getByLabelText(OUTCOME_RUBRIC_COPY.weight(2)), { target: { value: "30,5" } });

    expect(screen.getByRole("status")).toHaveTextContent("Suma de los pesos: 90,5 de 100");
    expect(screen.getByText(OUTCOME_RUBRIC_COPY.weightTotalWarning(100))).toBeInTheDocument();
  });

  it("shows the validation messages on their fields, and hides them with showIssues off", () => {
    const { unmount } = render(<Host initial={{ ...STORED, passingScore: "120" }} />);

    fireEvent.change(screen.getByLabelText("Fracción mínima de objetivos (0 a 1) (criterio 1)"), { target: { value: "80" } });

    const threshold = screen.getByLabelText("Fracción mínima de objetivos (0 a 1) (criterio 1)");

    expect(threshold).toHaveAttribute("aria-invalid", "true");
    expect(threshold).toHaveAccessibleDescription("el umbral debe ser una fracción mayor que 0 y como máximo 1.");
    expect(screen.getByLabelText(OUTCOME_RUBRIC_COPY.passingScore)).toHaveAccessibleDescription("El puntaje mínimo debe ser un número entre 0 y 100.");

    unmount();
    render(<Host initial={{ ...STORED, passingScore: "120" }} showIssues={false} />);
    expect(screen.getByLabelText(OUTCOME_RUBRIC_COPY.passingScore)).not.toHaveAttribute("aria-invalid", "true");
  });

  it("lists the rubric-level issue when there are no criteria", () => {
    render(<Host initial={{ ...emptyOutcomeRubricDraft(), passingScore: "70" }} />);

    expect(within(screen.getByRole("alert", { name: OUTCOME_RUBRIC_COPY.issues })).getByText("La rúbrica necesita al menos un criterio.")).toBeInTheDocument();
  });

  it("edits the policy and the passing score into a value the backend accepts", () => {
    let latest: OutcomeRubricDraft = STORED;

    render(<Host initial={STORED} onValue={(value) => { latest = value; }} />);

    fireEvent.change(screen.getByLabelText(OUTCOME_RUBRIC_COPY.assistancePolicy), { target: { value: "ALLOWED_WITH_PENALTY" } });
    fireEvent.change(screen.getByLabelText(OUTCOME_RUBRIC_COPY.passingScore), { target: { value: "65" } });

    expect(toOutcomeRubricValue(latest)).toMatchObject({ assistancePolicy: "ALLOWED_WITH_PENALTY", passingScore: 65 });
  });

  it("locks every control when disabled", () => {
    render(<Host initial={STORED} disabled />);

    expect(typeOf(1)).toBeDisabled();
    expect(screen.getByLabelText(OUTCOME_RUBRIC_COPY.weight(1))).toBeDisabled();
    expect(screen.getByLabelText(OUTCOME_RUBRIC_COPY.passingScore)).toBeDisabled();
    expect(screen.getByRole("button", { name: OUTCOME_RUBRIC_COPY.add })).toBeDisabled();
    expect(screen.getByRole("button", { name: OUTCOME_RUBRIC_COPY.remove(1) })).toBeDisabled();
    expect(screen.getByRole("button", { name: OUTCOME_RUBRIC_COPY.moveDown(1) })).toBeDisabled();
  });
});
