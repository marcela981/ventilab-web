/*
* Funcionalidad: Case editor test helpers
* Descripción: Shared fixtures of the case editor tests: the backend envelope (with optional pagination) and error
*   bodies (with a translated message, as the 422/400 range and definition errors carry the field there), a list item
*   factory, a complete simulation-ready definition (GET /definition) and a render helper that mounts a page inside an
*   isolated SWR cache and the global ToastProvider (as pages/_app.js does). Test-only code. Depends on Testing
*   Library, msw, SWR, the design-system toast provider and the case editor DTOs.
* Versión: 1.0
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

import { render } from "@testing-library/react";
import { HttpResponse } from "msw";
import type { ReactElement } from "react";
import { SWRConfig } from "swr";
import { ToastProvider } from "@shared/design-system/components/toast-provider";
import { BACKEND_ORIGIN } from "@shared/lib/env";
import type { ClinicalCaseDefinitionDTO, ClinicalCaseListItemDTO, ClinicalCaseSummaryDTO } from "../../api/dtos/case-editor.dto";

export const apiUrl = (path: string): string => `${BACKEND_ORIGIN}${path}`;

export type TestPagination = { total: number, pages: number, page: number, limit: number };

export const envelope = (data: unknown, pagination: TestPagination | null = null) => ({
  success: true,
  message: null,
  data,
  code: null,
  timestamp: "",
  traceId: "t",
  pagination: pagination ? { ...pagination, next: null, previous: null } : null,
});

export const errorResponse = (code: string, status: number, message: string = code) => HttpResponse.json(
  { success: false, message, data: null, code, timestamp: "", traceId: "t", pagination: null },
  { status },
);

export function caseItemDto(id: string, overrides: Partial<ClinicalCaseSummaryDTO> = {}): ClinicalCaseListItemDTO {
  return {
    clinicalCase: {
      id,
      title: `Caso ${id}`,
      description: `Historia del caso ${id}`,
      educationalGoal: "Ventilación protectora",
      mainDiagnosis: "SDRA moderado",
      pathology: "SDRA",
      difficulty: "INTERMEDIATE",
      patientAge: 54,
      patientWeight: 80,
      comorbidities: [],
      ...overrides,
    },
    userAttempts: { hasAttempted: false, bestScore: null, isSuccessful: false, lastAttempt: null },
  };
}

/** The generated type of the definition blocks is an opaque object (`Record<string, never>`), hence the final cast. */
export function definitionDto(id: string, overrides: Partial<Record<keyof ClinicalCaseDefinitionDTO, unknown>> = {}): ClinicalCaseDefinitionDTO {
  const definition = {
    id,
    title: "SDRA en paciente obeso",
    description: "Paciente de **52 años** con neumonía.",
    summary: "SDRA moderado, IMC 40",
    history: { presentIllness: "Disnea progresiva de 3 días", relevantHistory: ["Obesidad", "HTA"] },
    patientAge: 52,
    patientWeight: 120,
    patientSex: "FEMALE",
    patientHeightCm: 165,
    mainDiagnosis: "SDRA moderado",
    comorbidities: ["Obesidad"],
    labData: { ph: 7.3 },
    difficulty: "INTERMEDIATE",
    pathology: "SDRA",
    educationalGoal: "Ventilación protectora por peso predicho",
    mechanics: {
      complianceMlPerCmH2O: 30,
      resistanceCmH2OPerLps: 12,
      deadSpaceMl: 150,
      vco2MlPerMin: 220,
      bicarbonateMmolPerL: 24,
      hemoglobinGPerDl: 13,
      arteriovenousO2DifferenceMlPerDl: 5,
      basalShuntFraction: 0.25,
      recruitmentCurve: [{ peepCmH2O: 5, shuntFraction: 0.3 }, { peepCmH2O: 10, shuntFraction: 0.2 }],
      patientEffort: { amplitudeCmH2O: 0, rateBpm: 0, inspiratoryFraction: 0.35 },
      hemodynamics: { baselineMapMmHg: 85, meanAirwayPressureThresholdCmH2O: 15, mapDropPerCmH2O: 1 },
      gasTimeConstants: { paco2TimeConstantMin: 3, oxygenTimeConstantS: 30 },
      deterioration: { ratePerMin: 0, maxComplianceLossFraction: 0.3, maxShuntIncrease: 0.1 },
    },
    initialVentilatorSettings: {
      mode: "VCV",
      tidalVolumeMl: 420,
      respiratoryRateBpm: 18,
      peepCmH2O: 8,
      fio2: 0.6,
      inspiratoryTimeS: 1,
      flowPattern: "SQUARE",
      inspiratoryPauseS: 0,
      inspiratoryPressureCmH2O: 15,
      pressureSupportCmH2O: 10,
      triggerType: "FLOW",
      flowTriggerLpm: 2,
      pressureTriggerCmH2O: 2,
      cycleOffPercent: 25,
      apneaTimeS: 20,
      simvMandatoryType: "VCV",
    },
    initialState: { paco2MmHg: 48, pao2MmHg: 62 },
    events: [{ simTimeMs: 300000, type: "SECRETIONS", resistanceFactor: 1.5 }],
    targets: { spo2Percent: { min: 88, max: 95 }, plateauPressureMaxCmH2O: 30 },
    defaultRubric: {
      assistancePolicy: "DISABLED",
      passingScore: 70,
      criteria: [{ type: "TARGETS_REACHED", weight: 100, threshold: 0.8 }],
    },
    status: "DRAFT",
    isActive: false,
    validatedByExpert: false,
    validatedById: null,
    createdById: "teacher-1",
    simulationReady: true,
    createdAt: "2026-10-08T10:00:00.000Z",
    updatedAt: "2026-10-08T10:00:00.000Z",
    ...overrides,
  };

  return definition as unknown as ClinicalCaseDefinitionDTO;
}

export function renderWithProviders(ui: ReactElement) {
  return render(
    <SWRConfig value={{ provider: () => new Map(), dedupingInterval: 0, shouldRetryOnError: false }}>
      <ToastProvider>{ui}</ToastProvider>
    </SWRConfig>,
  );
}
