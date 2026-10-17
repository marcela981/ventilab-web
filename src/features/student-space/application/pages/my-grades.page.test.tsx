/*
* Funcionalidad: My grades page tests
* Descripción: /me/grades with msw: the table shows evaluation (link to the attempt result), module ("Sin módulo" without one), type, attempt, points and the es-CO grade with its passed/failed text exactly as the API returns them; the type and module filters select rows of the returned list (module options from the returned grades, plus "Sin módulo") and show their own empty state; no average is shown; empty state without grades; retryable load error. Depends on vitest, msw, Testing Library and the student space test helpers. v1.1 (B2 closure): module column and module filter.
* Versión: 1.1
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

import { fireEvent, screen, within } from "@testing-library/react";
import { http, HttpResponse } from "msw";
import { setupServer } from "msw/node";
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import type { MyEvaluationGradeDTO } from "../../api/dtos/student-space.dto";
import { apiUrl, envelope, errorResponse, gradeDto, renderStudentSpace } from "./student-space-test-helpers";
import { MY_GRADES_COPY, MyGradesPage } from "./my-grades.page";

const server = setupServer();

vi.setConfig({ testTimeout: 20_000 });

let grades: MyEvaluationGradeDTO[];
let fail: boolean;

beforeAll(() => {
  server.listen({ onUnhandledRequest: "error" });
});

beforeEach(() => {
  fail = false;
  grades = [
    gradeDto("a1", { evaluationTitle: "Parcial final", grade: 4.5, passed: true, moduleId: "m2", moduleTitle: "Modos ventilatorios" }),
    gradeDto("a2", { evaluationTitle: "Quiz de PEEP", evaluationType: "QUIZ", grade: 2.8, passed: false, score: null, maxScore: null, attemptNumber: 2 }),
    gradeDto("a3", { evaluationTitle: "Taller de curvas", evaluationType: "WORKSHOP", moduleId: "m1", moduleTitle: "Fisiología" }),
  ];
  server.use(
    http.get(apiUrl("/api/my-evaluations/grades"), () => (fail ? errorResponse("internal_error", 500) : HttpResponse.json(envelope(grades)))),
  );
});

afterEach(() => {
  server.resetHandlers();
});

afterAll(() => {
  server.close();
});

async function table(): Promise<HTMLElement> {
  return screen.findByRole("table", { name: MY_GRADES_COPY.tableLabel });
}

function selectIn(filter: string, label: string) {
  fireEvent.mouseDown(screen.getByRole("combobox", { name: filter }));
  fireEvent.click(screen.getByRole("option", { name: label }));
}

const selectType = (label: string) => selectIn(MY_GRADES_COPY.typeFilter, label);

describe("MyGradesPage", () => {
  it("lists the published grades as the API returns them", async() => {
    renderStudentSpace(<MyGradesPage />);

    const grid = await table();
    const [, first, second] = within(grid).getAllByRole("row");

    expect(within(first as HTMLElement).getByRole("link", { name: MY_GRADES_COPY.openResult("Parcial final") }))
      .toHaveAttribute("href", "/evaluations/ev-a1/attempts/a1/result");
    expect(within(first as HTMLElement).getByText("Examen")).toBeInTheDocument();
    expect(within(first as HTMLElement).getByText("Modos ventilatorios")).toBeInTheDocument();
    expect(within(first as HTMLElement).getByText("4,5")).toBeInTheDocument();
    expect(within(first as HTMLElement).getByText("9 de 10")).toBeInTheDocument();
    expect(within(first as HTMLElement).getByText("Aprobada")).toBeInTheDocument();
    expect(within(second as HTMLElement).getByText("2,8")).toBeInTheDocument();
    expect(within(second as HTMLElement).getByText("No aprobada")).toBeInTheDocument();
    expect(within(second as HTMLElement).getByText("—")).toBeInTheDocument();
    expect(within(second as HTMLElement).getByText(MY_GRADES_COPY.noModule)).toBeInTheDocument();
    expect(screen.queryByText(/promedio/i)).not.toBeInTheDocument();
  });

  it("filters the returned rows by type", async() => {
    renderStudentSpace(<MyGradesPage />);
    await table();

    selectType("Quiz");
    expect(screen.queryByText("Parcial final")).not.toBeInTheDocument();
    expect(screen.getByText("Quiz de PEEP")).toBeInTheDocument();

    selectType("Examen");
    expect(screen.getByText("Parcial final")).toBeInTheDocument();
    expect(screen.queryByText("Quiz de PEEP")).not.toBeInTheDocument();
  });

  it("filters the returned rows by module and combines it with the type", async() => {
    renderStudentSpace(<MyGradesPage />);
    await table();

    fireEvent.mouseDown(screen.getByRole("combobox", { name: MY_GRADES_COPY.moduleFilter }));
    expect(screen.getAllByRole("option").map((option) => option.textContent))
      .toEqual([MY_GRADES_COPY.allModules, "Fisiología", "Modos ventilatorios", MY_GRADES_COPY.noModule]);
    fireEvent.click(screen.getByRole("option", { name: "Fisiología" }));
    expect(screen.getByText("Taller de curvas")).toBeInTheDocument();
    expect(screen.queryByText("Parcial final")).not.toBeInTheDocument();

    selectIn(MY_GRADES_COPY.moduleFilter, MY_GRADES_COPY.noModule);
    expect(screen.getByText("Quiz de PEEP")).toBeInTheDocument();
    expect(screen.queryByText("Taller de curvas")).not.toBeInTheDocument();

    selectType("Examen");
    expect(screen.getByText(MY_GRADES_COPY.emptyTypeTitle)).toBeInTheDocument();
  });

  it("shows the empty state without grades", async() => {
    grades = [];
    renderStudentSpace(<MyGradesPage />);

    expect(await screen.findByText(MY_GRADES_COPY.emptyTitle)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: MY_GRADES_COPY.emptyAction })).toHaveAttribute("href", "/evaluations");
  });

  it("shows a retryable load error", async() => {
    fail = true;
    renderStudentSpace(<MyGradesPage />);

    expect(await screen.findByText(MY_GRADES_COPY.loadErrorTitle)).toBeInTheDocument();

    fail = false;
    fireEvent.click(screen.getByRole("button", { name: "Reintentar" }));
    expect(await table()).toBeInTheDocument();
  });
});
