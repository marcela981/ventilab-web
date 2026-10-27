/*
* Funcionalidad: Patient metrics tests
* Descripción: The display-only values of the Simular Paciente form with the July formulas: ARDSNet PCI by sex (one
*   decimal), BMI (one decimal) and its July label, the 6–8 mL/kg PCI tidal volume computed from the unrounded PCI,
*   and null values when sex, height or weight are missing. Depends on Vitest and the metrics entity.
* Versión: 0.1
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

import { describe, expect, it } from "vitest";
import { bmiLabel, computePatientMetrics, predictedBodyWeightKg } from "./patient-metrics.entity";

describe("patient metrics", () => {
  it("uses the ARDSNet predicted body weight for each sex", () => {
    expect(predictedBodyWeightKg("MALE", 152.4)).toBeCloseTo(50);
    expect(predictedBodyWeightKg("FEMALE", 152.4)).toBeCloseTo(45.5);
    expect(predictedBodyWeightKg("MALE", 175)).toBeCloseTo(70.566);
  });

  it("computes PCI, BMI and the 6–8 mL/kg tidal volume like July", () => {
    expect(computePatientMetrics("MALE", 175, 70)).toEqual({
      idealBodyWeightKg: 70.6,
      bmi: 22.9,
      tidalVolume: { minMl: 423, maxMl: 565 },
    });
    expect(computePatientMetrics("FEMALE", 160, 65)).toEqual({
      idealBodyWeightKg: 52.4,
      bmi: 25.4,
      tidalVolume: { minMl: 314, maxMl: 419 },
    });
  });

  it("leaves a value empty when its inputs are missing", () => {
    expect(computePatientMetrics(null, 175, 70)).toEqual({ idealBodyWeightKg: null, bmi: 22.9, tidalVolume: null });
    expect(computePatientMetrics("MALE", null, 70)).toEqual({ idealBodyWeightKg: null, bmi: null, tidalVolume: null });
    expect(computePatientMetrics("MALE", 175, null)).toEqual({ idealBodyWeightKg: 70.6, bmi: null, tidalVolume: { minMl: 423, maxMl: 565 } });
  });

  it("labels the BMI with the July bands", () => {
    expect(bmiLabel(18.4)).toBe("Bajo peso");
    expect(bmiLabel(22.9)).toBe("Normal");
    expect(bmiLabel(27)).toBe("Sobrepeso");
    expect(bmiLabel(30)).toBe("Obesidad");
  });
});
