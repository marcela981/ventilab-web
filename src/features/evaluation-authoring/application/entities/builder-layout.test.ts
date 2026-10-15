/*
* Funcionalidad: Builder layout tests
* Descripción: Unit tests of the pure ordering rules of the evaluation builder: the layout built from scenarios and questions (top level first, unknown scenarios fall back to the top level), moving a question inside its group, into a scenario and back to the top level, the no-op drops, the `PUT .../questions/order` payload (global order plus the scenarioId of every question) and the scenario reorder. Depends on vitest and the builder entities.
* Versión: 1.0
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

import { describe, expect, it } from "vitest";
import {
  layoutFrom,
  moveQuestion,
  moveScenario,
  ROOT_DROPPABLE_ID,
  scenarioDroppableId,
  toOrderItems,
  toQuestionOrderItems,
} from "./builder-layout";
import type { QuestionLayout } from "./builder-layout";
import type { BuilderQuestion, BuilderScenario } from "./evaluation-builder.entity";

function question(id: string, order: number, scenarioId: string | null): BuilderQuestion {
  return {
    id,
    scenarioId,
    order,
    type: "OPEN_TEXT",
    prompt: { type: "doc", content: [] },
    points: 1,
    explanation: null,
    mediaIds: [],
    media: [],
    clinicalCaseId: null,
    rubric: null,
    options: [],
  };
}

function scenario(id: string, order: number): BuilderScenario {
  return { id, order, content: { type: "doc", content: [] }, mediaIds: [], media: [] };
}

const layout: QuestionLayout = {
  root: ["q1", "q2"],
  scenarios: [
    { id: "s1", questionIds: ["q3"] },
    { id: "s2", questionIds: [] },
  ],
};

describe("layoutFrom", () => {
  it("groups the questions by scenario in order, top level first", () => {
    const result = layoutFrom(
      [scenario("s2", 1), scenario("s1", 0)],
      [question("q3", 2, "s1"), question("q1", 0, null), question("q2", 1, "s2"), question("q4", 3, "missing")],
    );

    expect(result).toEqual({
      root: ["q1", "q4"],
      scenarios: [
        { id: "s1", questionIds: ["q3"] },
        { id: "s2", questionIds: ["q2"] },
      ],
    });
  });
});

describe("moveQuestion", () => {
  it("reorders inside the same group", () => {
    const next = moveQuestion(layout, { droppableId: ROOT_DROPPABLE_ID, index: 0 }, { droppableId: ROOT_DROPPABLE_ID, index: 1 });

    expect(next?.root).toEqual(["q2", "q1"]);
  });

  it("moves a question into a scenario and back to the top level", () => {
    const into = moveQuestion(layout, { droppableId: ROOT_DROPPABLE_ID, index: 1 }, { droppableId: scenarioDroppableId("s2"), index: 0 });

    expect(into).toEqual({ root: ["q1"], scenarios: [{ id: "s1", questionIds: ["q3"] }, { id: "s2", questionIds: ["q2"] }] });

    const back = moveQuestion(layout, { droppableId: scenarioDroppableId("s1"), index: 0 }, { droppableId: ROOT_DROPPABLE_ID, index: 0 });

    expect(back).toEqual({ root: ["q3", "q1", "q2"], scenarios: [{ id: "s1", questionIds: [] }, { id: "s2", questionIds: [] }] });
  });

  it("returns null for a drop outside, in place or on an unknown group", () => {
    expect(moveQuestion(layout, { droppableId: ROOT_DROPPABLE_ID, index: 0 }, null)).toBeNull();
    expect(moveQuestion(layout, { droppableId: ROOT_DROPPABLE_ID, index: 0 }, { droppableId: ROOT_DROPPABLE_ID, index: 0 })).toBeNull();
    expect(moveQuestion(layout, { droppableId: ROOT_DROPPABLE_ID, index: 0 }, { droppableId: scenarioDroppableId("nope"), index: 0 })).toBeNull();
  });
});

describe("toQuestionOrderItems", () => {
  it("numbers every question globally and sends its scenario", () => {
    expect(toQuestionOrderItems(layout)).toEqual([
      { id: "q1", order: 0, scenarioId: null },
      { id: "q2", order: 1, scenarioId: null },
      { id: "q3", order: 2, scenarioId: "s1" },
    ]);
  });
});

describe("moveScenario", () => {
  it("reorders the scenarios with their questions", () => {
    const next = moveScenario(layout, 0, 1);

    expect(next?.scenarios.map((item) => item.id)).toEqual(["s2", "s1"]);
    expect(toOrderItems(next?.scenarios.map((item) => item.id) ?? [])).toEqual([{ id: "s2", order: 0 }, { id: "s1", order: 1 }]);
    expect(moveScenario(layout, 1, 1)).toBeNull();
  });
});
