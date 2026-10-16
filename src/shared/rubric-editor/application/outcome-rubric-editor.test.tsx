/*
* Funcionalidad: OutcomeRubricEditor tests
* Descripción: Behaviour of the controlled outcome rubric editor (rendered with a stateful host): add criteria with the
*   first unused type (a used type is disabled in the other selects, the add button stops at eight), type-specific
*   fields (window only for TIME_IN_RANGE, penalty only for the safety limits and AI assist usage, the threshold label
*   with its unit), reorder and remove, the weight total with its warning, the validation messages on their fields
*   (and hidden with showIssues off), the policy and passing score, and the disabled state. Depends on Vitest,
*   Testing Library and the rubric-editor module. v1.1 (review of 4134725): focus after reorder and removal with the
*   live announcement, the invalid row of an unknown stored type, the weight 0 hint and the total with 2 decimals.
*   v1.2 (review of b23709c): an identical announcement is a new node; a refused reorder never moves the focus later.
*   v1.3 (final review): a host that renders a clone of the reordered or reduced list still gets the focus restored.
* Versión: 1.3
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

const totalText = () => screen.getByText(/Suma de los pesos/);
const announcer = () => screen.getByRole("status", { name: OUTCOME_RUBRIC_COPY.announcements });
const button = (name: string) => screen.getByRole("button", { name });

const THREE = outcomeRubricDraftFrom({
  assistancePolicy: "DISABLED",
  passingScore: 70,
  criteria: [
    { type: "TARGETS_REACHED", weight: 40, threshold: 1 },
    { type: "TIME_TO_STABILIZE", weight: 30, threshold: 300 },
    { type: "TIME_IN_RANGE", weight: 30, threshold: 80, windowMinutes: 5 },
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

    expect(totalText()).toHaveTextContent("Suma de los pesos: 100 de 100");
    expect(screen.queryByText(OUTCOME_RUBRIC_COPY.weightTotalWarning(100))).not.toBeInTheDocument();

    fireEvent.change(screen.getByLabelText(OUTCOME_RUBRIC_COPY.weight(2)), { target: { value: "30,5" } });

    expect(totalText()).toHaveTextContent("Suma de los pesos: 90,50 de 100");
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

describe("OutcomeRubricEditor focus and announcements", () => {
  it("keeps the focus on the moved criterion and announces its new position", () => {
    render(<Host initial={THREE} />);

    button(OUTCOME_RUBRIC_COPY.moveDown(1)).focus();
    fireEvent.click(button(OUTCOME_RUBRIC_COPY.moveDown(1)));

    expect(typeOf(2).value).toBe("TARGETS_REACHED");
    expect(button(OUTCOME_RUBRIC_COPY.moveDown(2))).toHaveFocus();
    expect(announcer()).toHaveTextContent("Criterio movido a la posición 2 de 3.");
  });

  it("moves the focus to the other arrow when the moved criterion reaches an edge", () => {
    render(<Host initial={THREE} />);

    fireEvent.click(button(OUTCOME_RUBRIC_COPY.moveUp(2)));

    expect(typeOf(1).value).toBe("TIME_TO_STABILIZE");
    expect(button(OUTCOME_RUBRIC_COPY.moveDown(1))).toHaveFocus();
    expect(announcer()).toHaveTextContent("Criterio movido a la posición 1 de 3.");
  });

  it("focuses the next criterion after a removal, else the previous one, else the add button", () => {
    render(<Host initial={THREE} />);

    fireEvent.click(button(OUTCOME_RUBRIC_COPY.remove(2)));
    expect(typeOf(2).value).toBe("TIME_IN_RANGE");
    expect(button(OUTCOME_RUBRIC_COPY.remove(2))).toHaveFocus();
    expect(announcer()).toHaveTextContent("Criterio 2 eliminado.");

    fireEvent.click(button(OUTCOME_RUBRIC_COPY.remove(2)));
    expect(button(OUTCOME_RUBRIC_COPY.remove(1))).toHaveFocus();

    fireEvent.click(button(OUTCOME_RUBRIC_COPY.remove(1)));
    expect(button(OUTCOME_RUBRIC_COPY.add)).toHaveFocus();
    expect(announcer()).toHaveTextContent("Criterio 1 eliminado. La rúbrica no tiene criterios.");
  });

  it("announces an identical text again with a new node", () => {
    render(<Host initial={THREE} />);

    fireEvent.click(button(OUTCOME_RUBRIC_COPY.remove(2)));

    const first = within(announcer()).getByText("Criterio 2 eliminado.");

    fireEvent.click(button(OUTCOME_RUBRIC_COPY.remove(2)));

    const second = within(announcer()).getByText("Criterio 2 eliminado.");

    expect(second).not.toBe(first);
    expect(second.getAttribute("data-announcement")).not.toBe(first.getAttribute("data-announcement"));
  });

  it("restores the focus when the host renders a clone of the reordered or reduced list", () => {
    // A host that stores a copy of what it receives (normalisation, immutable store), never the same object.
    function CloningHost() {
      const [value, setValue] = useState(THREE);

      return <OutcomeRubricEditor value={value} newKey={() => "k"} onChange={(next) => setValue(structuredClone(next))} />;
    }

    render(<CloningHost />);
    fireEvent.click(button(OUTCOME_RUBRIC_COPY.moveDown(1)));
    expect(typeOf(2).value).toBe("TARGETS_REACHED");
    expect(button(OUTCOME_RUBRIC_COPY.moveDown(2))).toHaveFocus();

    fireEvent.click(button(OUTCOME_RUBRIC_COPY.remove(2)));
    expect(button(OUTCOME_RUBRIC_COPY.remove(2))).toHaveFocus();
  });

  it("drops the focus request when the host does not render the reordered list", () => {
    // A host that refuses reorders but accepts other edits.
    function RefusingHost() {
      const [value, setValue] = useState(THREE);

      return (
        <OutcomeRubricEditor
          value={value}
          newKey={() => "k"}
          onChange={(next) => {
            if (next.criteria.map((criterion) => criterion.key).join() === value.criteria.map((criterion) => criterion.key).join()) {
              setValue(next);
            }
          }}
        />
      );
    }

    render(<RefusingHost />);
    fireEvent.click(button(OUTCOME_RUBRIC_COPY.moveDown(1)));
    expect(typeOf(1).value).toBe("TARGETS_REACHED");

    const policy = screen.getByLabelText(OUTCOME_RUBRIC_COPY.assistancePolicy) as HTMLSelectElement;

    policy.focus();
    fireEvent.change(policy, { target: { value: "ALLOWED_WITH_PENALTY" } });
    expect(policy).toHaveFocus();
  });
});

describe("OutcomeRubricEditor review fixes", () => {
  it("shows an unknown stored type as an invalid row the author must fix", () => {
    let latest: OutcomeRubricDraft | null = null;
    const stored = outcomeRubricDraftFrom({
      assistancePolicy: "DISABLED",
      passingScore: 70,
      criteria: [{ type: "LEGACY_SCORE", weight: 100, threshold: 1 }],
    });

    render(<Host initial={stored} onValue={(value) => { latest = value; }} />);

    const select = typeOf(1);

    expect(select.value).toBe("");
    expect(within(select).getByRole("option", { name: "Tipo desconocido: LEGACY_SCORE" })).toBeDisabled();
    expect(within(select).getByRole("option", { name: "Objetivos alcanzados" })).not.toBeDisabled();
    expect(select).toHaveAttribute("aria-invalid", "true");
    expect(select).toHaveAccessibleDescription("El tipo guardado «LEGACY_SCORE» no existe; elige un tipo de criterio.");
    expect(toOutcomeRubricValue(stored)).toBeNull();

    fireEvent.change(select, { target: { value: "TARGETS_REACHED" } });

    expect(typeOf(1)).not.toHaveAttribute("aria-invalid", "true");
    expect(latest === null ? null : toOutcomeRubricValue(latest)).not.toBeNull();
  });

  it("hints that a criterion of weight 0 does not count for the grade", () => {
    render(<Host initial={STORED} />);

    const weight = screen.getByLabelText(OUTCOME_RUBRIC_COPY.weight(1));

    expect(weight).not.toHaveAccessibleDescription();
    fireEvent.change(weight, { target: { value: "0" } });
    expect(weight).toHaveAccessibleDescription("Peso 0: este criterio no cuenta para la nota.");
  });

  it("shows two decimals, or more when needed, while the total is not 100", () => {
    render(<Host initial={STORED} />);

    fireEvent.change(screen.getByLabelText(OUTCOME_RUBRIC_COPY.weight(2)), { target: { value: "39,999" } });

    expect(totalText()).toHaveTextContent("Suma de los pesos: 99,999 de 100");
  });
});
