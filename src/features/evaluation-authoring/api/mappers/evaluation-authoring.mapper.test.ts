/*
* Funcionalidad: Evaluation authoring mapper tests
* Descripción: Unit tests of the authoring mapper and list entities: an evaluation summary maps to a list item with its counts and canManage flag, the list page takes total and pages from the envelope pagination (one page when it is missing), the list query omits the "all" type, the default status and an empty search and turns the 0-based page index into the 1-based API page, and the client-side module filter and options work on the loaded page only. Depends on vitest, the authoring mapper and entities and the test helpers.
* Versión: 1.0
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

import { describe, expect, it } from "vitest";
import { EMPTY_EVALUATION_FILTERS, filterByModule, moduleOptions, toEvaluationListQuery } from "../../application/entities/evaluation-authoring.entity";
import { evaluationSummaryDto } from "../../application/pages/authoring-test-helpers";
import { toEvaluationListItem, toEvaluationListPage } from "./evaluation-authoring.mapper";

describe("evaluation authoring mapper", () => {
  it("maps a summary to a list item", () => {
    const item = toEvaluationListItem(evaluationSummaryDto("e1", {
      type: "EXAM",
      status: "READY",
      moduleId: "module-01",
      questionCount: 10,
      scenarioCount: 2,
      assignmentCount: 3,
      canManage: false,
    }));

    expect(item).toEqual({
      id: "e1",
      title: "Evaluación e1",
      type: "EXAM",
      status: "READY",
      moduleId: "module-01",
      levelId: null,
      questionCount: 10,
      scenarioCount: 2,
      assignmentCount: 3,
      canManage: false,
      createdByName: "Laura Gómez",
      updatedAt: "2026-10-02T15:30:00.000Z",
    });
  });

  it("reads total and pages from the pagination, or one page without it", () => {
    const items = [evaluationSummaryDto("e1"), evaluationSummaryDto("e2")];

    expect(toEvaluationListPage(items, { total: 42, pages: 5, page: 2, limit: 10, next: null, previous: null }))
      .toMatchObject({ total: 42, pages: 5, page: 2 });
    expect(toEvaluationListPage(items, null)).toMatchObject({ total: 2, pages: 1, page: 1 });
  });
});

describe("evaluation list entities", () => {
  it("builds the list query from the filters", () => {
    expect(toEvaluationListQuery(EMPTY_EVALUATION_FILTERS, 0, 10))
      .toEqual({ sortBy: "updatedAt", sortOrder: "desc", page: 1, limit: 10 });
    expect(toEvaluationListQuery({ search: "  peep ", type: "EXAM", status: "ARCHIVED" }, 2, 25))
      .toEqual({ type: "EXAM", status: "ARCHIVED", search: "peep", sortBy: "updatedAt", sortOrder: "desc", page: 3, limit: 25 });
  });

  it("filters the loaded page by module and lists its modules", () => {
    const items = [
      toEvaluationListItem(evaluationSummaryDto("e1", { moduleId: "module-02" })),
      toEvaluationListItem(evaluationSummaryDto("e2", { moduleId: "module-01" })),
      toEvaluationListItem(evaluationSummaryDto("e3", { moduleId: "module-02" })),
      toEvaluationListItem(evaluationSummaryDto("e4")),
    ];

    expect(moduleOptions(items)).toEqual(["module-01", "module-02"]);
    expect(filterByModule(items, "module-02").map((item) => item.id)).toEqual(["e1", "e3"]);
    expect(filterByModule(items, "all")).toHaveLength(4);
  });
});
