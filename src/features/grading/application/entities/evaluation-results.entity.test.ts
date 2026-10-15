/*
* Funcionalidad: Evaluation results entities tests
* Descripción: Verifies the pure formatting rules of the results page: grades in es-CO with one decimal ("—" when missing), rates as es-CO percentages, histogram labels such as "3,0–3,5", the approximate publish estimate (graded attempts of the group's assignments, or graded minus published attempts, never below 0) and the group options taken from the assignments. Depends on vitest and the evaluation results entities.
* Versión: 1.0
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

import { describe, expect, it } from "vitest";
import {
  assignmentGroups,
  formatHistogramLabel,
  formatRate,
  formatStatGrade,
  MISSING_STAT,
  publishEstimate,
} from "./evaluation-results.entity";
import type { EvaluationAssignment } from "./evaluation-results.entity";

const percent = (value: number) => new Intl.NumberFormat("es-CO", { style: "percent", maximumFractionDigits: 1 }).format(value);

function assignment(id: string, groupId: string, groupName: string, graded: number): EvaluationAssignment {
  return {
    id,
    groupId,
    groupName,
    state: "ACTIVE",
    startsAt: "2026-10-06T13:00:00.000Z",
    endsAt: null,
    attemptCounts: { inProgress: 0, submitted: 0, pendingReview: 0, graded },
  };
}

describe("evaluation results formatting", () => {
  it("formats grades and rates in es-CO", () => {
    expect(formatStatGrade(3.62)).toBe("3,6");
    expect(formatStatGrade(null)).toBe(MISSING_STAT);
    expect(formatRate(0.75)).toBe(percent(0.75));
    expect(formatRate(0.75)).toMatch(/^75\s?%$/);
    expect(formatRate(null)).toBe(MISSING_STAT);
  });

  it("labels the API histogram buckets", () => {
    expect(formatHistogramLabel({ from: 3, to: 3.5 })).toBe("3,0–3,5");
    expect(formatHistogramLabel({ from: 4.5, to: 5 })).toBe("4,5–5,0");
  });
});

describe("publishEstimate", () => {
  it("uses graded minus published attempts for every group, never below 0", () => {
    expect(publishEstimate({ gradedCount: 20, publishedCount: 12 }, null)).toEqual({ count: 8, approximate: true });
    expect(publishEstimate({ gradedCount: 3, publishedCount: 5 }, null)).toEqual({ count: 0, approximate: true });
  });

  it("uses the graded attempts of the group's assignments", () => {
    const group = [assignment("a1", "g1", "UCI A", 4), assignment("a2", "g1", "UCI A", 2)];

    expect(publishEstimate({ gradedCount: 20, publishedCount: 0 }, group)).toEqual({ count: 6, approximate: true });
  });
});

describe("assignmentGroups", () => {
  it("lists each group once, sorted by name", () => {
    expect(assignmentGroups([
      assignment("a1", "g2", "Urgencias", 0),
      assignment("a2", "g1", "UCI A", 0),
      assignment("a3", "g2", "Urgencias", 0),
    ])).toEqual([{ id: "g1", label: "UCI A" }, { id: "g2", label: "Urgencias" }]);
  });
});
