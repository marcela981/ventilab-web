/*
* Funcionalidad: Builder layout
* Descripción: Pure ordering rules of the evaluation builder. The layout groups the question ids: questions without a scenario at the top level, then each scenario (in scenario order) with its questions. moveQuestion applies one drag-and-drop result (source and destination droppable plus index; the droppable ids are "root" and "scenario:<id>") and returns the new layout, or null when nothing moves; toQuestionOrderItems turns a layout into the body of `PUT /api/evaluations/{id}/questions/order` (global 0-based order, top level first, and the scenarioId of every question: null detaches it, an id moves it into that scenario); moveScenario and toOrderItems do the same for `PUT .../scenarios/order`. No dependencies besides the builder entities.
* Versión: 1.0
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

import type { BuilderQuestion, BuilderScenario } from "./evaluation-builder.entity";

export type ScenarioGroup = { id: string, questionIds: string[] };

export type QuestionLayout = {
  root: string[]
  scenarios: ScenarioGroup[]
};

export type DragLocation = { droppableId: string, index: number };

export const ROOT_DROPPABLE_ID = "root";
export const SCENARIOS_DROPPABLE_ID = "scenarios";
const SCENARIO_PREFIX = "scenario:";

export function scenarioDroppableId(scenarioId: string): string {
  return `${SCENARIO_PREFIX}${scenarioId}`;
}

// null for the top level.
export function scenarioIdOf(droppableId: string): string | null {
  return droppableId.startsWith(SCENARIO_PREFIX) ? droppableId.slice(SCENARIO_PREFIX.length) : null;
}

const byOrder = (a: { order: number }, b: { order: number }): number => a.order - b.order;

export function layoutFrom(scenarios: readonly BuilderScenario[], questions: readonly BuilderQuestion[]): QuestionLayout {
  const sorted = [...questions].sort(byOrder);
  const known = new Set(scenarios.map((scenario) => scenario.id));

  return {
    root: sorted.filter((question) => question.scenarioId === null || !known.has(question.scenarioId)).map((question) => question.id),
    scenarios: [...scenarios].sort(byOrder).map((scenario) => ({
      id: scenario.id,
      questionIds: sorted.filter((question) => question.scenarioId === scenario.id).map((question) => question.id),
    })),
  };
}

function listOf(layout: QuestionLayout, droppableId: string): string[] | null {
  const scenarioId = scenarioIdOf(droppableId);

  if (scenarioId === null) {
    return droppableId === ROOT_DROPPABLE_ID ? layout.root : null;
  }

  return layout.scenarios.find((scenario) => scenario.id === scenarioId)?.questionIds ?? null;
}

function withList(layout: QuestionLayout, droppableId: string, list: string[]): QuestionLayout {
  const scenarioId = scenarioIdOf(droppableId);

  if (scenarioId === null) {
    return { ...layout, root: list };
  }

  return {
    ...layout,
    scenarios: layout.scenarios.map((scenario) => (scenario.id === scenarioId ? { ...scenario, questionIds: list } : scenario)),
  };
}

export function moveQuestion(layout: QuestionLayout, source: DragLocation, destination: DragLocation | null): QuestionLayout | null {
  if (!destination) {
    return null;
  }

  if (source.droppableId === destination.droppableId && source.index === destination.index) {
    return null;
  }

  const from = listOf(layout, source.droppableId);
  const to = listOf(layout, destination.droppableId);

  if (!from || !to || source.index < 0 || source.index >= from.length) {
    return null;
  }

  const nextFrom = [...from];
  const [moved] = nextFrom.splice(source.index, 1);

  if (moved === undefined) {
    return null;
  }

  if (source.droppableId === destination.droppableId) {
    nextFrom.splice(Math.min(destination.index, nextFrom.length), 0, moved);

    return withList(layout, source.droppableId, nextFrom);
  }

  const nextTo = [...to];

  nextTo.splice(Math.min(destination.index, nextTo.length), 0, moved);

  return withList(withList(layout, source.droppableId, nextFrom), destination.droppableId, nextTo);
}

export type QuestionOrderItem = { id: string, order: number, scenarioId: string | null };

export function toQuestionOrderItems(layout: QuestionLayout): QuestionOrderItem[] {
  const entries: Array<{ id: string, scenarioId: string | null }> = [
    ...layout.root.map((id) => ({ id, scenarioId: null })),
    ...layout.scenarios.flatMap((scenario) => scenario.questionIds.map((id) => ({ id, scenarioId: scenario.id }))),
  ];

  return entries.map((entry, order) => ({ id: entry.id, order, scenarioId: entry.scenarioId }));
}

export function moveScenario(layout: QuestionLayout, fromIndex: number, toIndex: number): QuestionLayout | null {
  if (fromIndex === toIndex || fromIndex < 0 || fromIndex >= layout.scenarios.length) {
    return null;
  }

  const scenarios = [...layout.scenarios];
  const [moved] = scenarios.splice(fromIndex, 1);

  if (!moved) {
    return null;
  }

  scenarios.splice(Math.min(toIndex, scenarios.length), 0, moved);

  return { ...layout, scenarios };
}

export function toOrderItems(ids: readonly string[]): Array<{ id: string, order: number }> {
  return ids.map((id, order) => ({ id, order }));
}
