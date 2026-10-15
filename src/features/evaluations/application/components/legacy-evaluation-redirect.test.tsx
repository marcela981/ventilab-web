/*
* Funcionalidad: Legacy evaluation redirect tests
* Descripción: R1: the redirect component renders nothing and replaces the URL once with the new route of its legacy pattern, without a query string. Depends on vitest, Testing Library, a mocked next/router and legacy-evaluation-redirect.
* Versión: 1.0
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

import { render } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { LegacyEvaluationRedirect } from "./legacy-evaluation-redirect";

const router = { replace: vi.fn(() => Promise.resolve(true)), query: { activityId: "a1", tab: "x" } };
vi.mock("next/router", () => ({ useRouter: () => router }));

describe("LegacyEvaluationRedirect", () => {
  beforeEach(() => {
    router.replace.mockClear();
  });

  it("replaces a legacy grading route with the grading queue once", () => {
    const { container, rerender } = render(<LegacyEvaluationRedirect from="/evaluation/grade/[activityId]" />);
    rerender(<LegacyEvaluationRedirect from="/evaluation/grade/[activityId]" />);

    expect(container).toBeEmptyDOMElement();
    expect(router.replace).toHaveBeenCalledTimes(1);
    expect(router.replace).toHaveBeenCalledWith("/grading");
  });

  it("replaces the legacy builder route with the new builder", () => {
    render(<LegacyEvaluationRedirect from="/evaluation/manage/new" />);

    expect(router.replace).toHaveBeenCalledWith("/evaluations/manage/new");
  });
});
