/*
* Funcionalidad: useCaseTestRun
* Descripción: State of one server test run of a stored clinical case (T12): POST /api/clinical-cases/{id}/test-run
*   with the parsed form (simulated seconds and optional seed), one request at a time, "running" while it is in
*   flight, the result (engine version, seconds, seed and the metrics timeline) or the Spanish error message. A new
*   run aborts the previous request, and unmounting aborts the one in flight, so a late answer never lands. The
*   service is injectable for tests. Depends on React, the case editor service, DTOs and error messages.
* Versión: 1.0
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

import { useCallback, useEffect, useRef, useState } from "react";
import type { ClinicalCaseTestRunDTO, ClinicalCaseTestRunRequestDTO } from "../../api/dtos/case-editor.dto";
import { runClinicalCaseTest } from "../../api/services/case-editor.service";
import { getCaseEditorErrorMessage } from "../entities/case-editor-errors";

export type CaseTestRunState =
  | { status: "idle" }
  | { status: "running" }
  | { status: "done", result: ClinicalCaseTestRunDTO }
  | { status: "error", message: string };

export type UseCaseTestRunResult = {
  state: CaseTestRunState
  run: (request: ClinicalCaseTestRunRequestDTO) => Promise<void>
};

export function useCaseTestRun(caseId: string, service: typeof runClinicalCaseTest = runClinicalCaseTest): UseCaseTestRunResult {
  const [state, setState] = useState<CaseTestRunState>({ status: "idle" });
  const controllerRef = useRef<AbortController | null>(null);

  useEffect(() => () => controllerRef.current?.abort(), []);

  const run = useCallback(async(request: ClinicalCaseTestRunRequestDTO) => {
    controllerRef.current?.abort();

    const controller = new AbortController();

    controllerRef.current = controller;
    setState({ status: "running" });

    try {
      const result = await service(caseId, request, controller.signal);

      if (!controller.signal.aborted) {
        setState({ status: "done", result });
      }
    } catch (error) {
      if (!controller.signal.aborted) {
        setState({ status: "error", message: getCaseEditorErrorMessage(error) });
      }
    }
  }, [caseId, service]);

  return { state, run };
}
