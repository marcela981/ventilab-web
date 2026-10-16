/*
* Funcionalidad: Intercambio gaseoso del motor fisiológico
* Descripción: GENERATED — do not edit; run node scripts/sync-sim-engine.mjs. Vendored copy of ventylab-server/src/features/simulation/domain/engine/gas-exchange.ts. Ventilación alveolar, PaCO2 de equilibrio, pH, PAO2, fracción de shunt según la curva de reclutamiento del caso, PaO2 por ecuación de shunt, SpO2 por ecuación de Severinghaus y dinámica de primer orden
* Versión: 1.0
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/
// @ts-nocheck -- vendored backend engine, type-checked by ventylab-server's tsc
import { exp, log10, max, min } from "./engine-math";
import type { ShuntCurvePoint } from "./engine.types";

export const MAX_PACO2_MMHG: number = 150;
export const MIN_ALVEOLAR_VENTILATION_LPM: number = 0.1;
export const BAROMETRIC_PRESSURE_MMHG: number = 760;
export const WATER_VAPOR_PRESSURE_MMHG: number = 47;
export const RESPIRATORY_QUOTIENT: number = 0.8;
export const MAX_SHUNT_FRACTION: number = 0.9;

const MIN_PAO2_MMHG: number = 15;
const MAX_PAO2_MMHG: number = 700;
const PAO2_BISECTION_ITERATIONS: number = 40;

// Alveolar ventilation: VA = (Vt − VD)·RR, accumulated breath by breath (West's Respiratory Physiology, ch. 2)
export function alveolarVolumeMl(tidalVolumeMl: number, deadSpaceMl: number): number {
  return max(0, tidalVolumeMl - deadSpaceMl);
}

// Alveolar ventilation equation: PaCO2 = 0.863·VCO2/VA, VCO2 in mL/min STPD and VA in L/min BTPS (West's Respiratory Physiology, ch. 2)
export function equilibriumPaco2(vco2MlPerMin: number, alveolarVentilationLpm: number): number {
  if (alveolarVentilationLpm <= MIN_ALVEOLAR_VENTILATION_LPM) {
    return MAX_PACO2_MMHG;
  }

  return min(MAX_PACO2_MMHG, (0.863 * vco2MlPerMin) / alveolarVentilationLpm);
}

// Henderson–Hasselbalch equation: pH = 6.1 + log10(HCO3 / (0.03·PaCO2)) (West's Respiratory Physiology, ch. 8)
export function arterialPh(bicarbonateMmolPerL: number, paco2MmHg: number): number {
  return 6.1 + log10(bicarbonateMmolPerL / (0.03 * paco2MmHg));
}

// Alveolar gas equation (simplified): PAO2 = FiO2·(PB − PH2O) − PaCO2/R (West's Respiratory Physiology, ch. 5)
export function alveolarPo2(fio2: number, paco2MmHg: number): number {
  const value: number = fio2 * (BAROMETRIC_PRESSURE_MMHG - WATER_VAPOR_PRESSURE_MMHG) - paco2MmHg / RESPIRATORY_QUOTIENT;

  return max(1, value);
}

export function shuntFractionAtPeep(curve: readonly ShuntCurvePoint[], peepCmH2O: number): number {
  if (curve.length === 0) {
    return 0;
  }

  const sorted: ShuntCurvePoint[] = [...curve].sort((a: ShuntCurvePoint, b: ShuntCurvePoint): number => a.peepCmH2O - b.peepCmH2O);
  const first: ShuntCurvePoint = sorted[0];
  const last: ShuntCurvePoint = sorted[sorted.length - 1];

  if (peepCmH2O <= first.peepCmH2O) {
    return first.shuntFraction;
  }

  if (peepCmH2O >= last.peepCmH2O) {
    return last.shuntFraction;
  }

  for (let index: number = 1; index < sorted.length; index += 1) {
    const upper: ShuntCurvePoint = sorted[index];

    if (peepCmH2O <= upper.peepCmH2O) {
      const lower: ShuntCurvePoint = sorted[index - 1];
      const span: number = upper.peepCmH2O - lower.peepCmH2O;
      const weight: number = span > 0 ? (peepCmH2O - lower.peepCmH2O) / span : 1;

      return lower.shuntFraction + weight * (upper.shuntFraction - lower.shuntFraction);
    }
  }

  return last.shuntFraction;
}

// Severinghaus oxygen dissociation equation: SO2 = 100 / (1 + 23400 / (PO2³ + 150·PO2)) (Severinghaus, J Appl Physiol 1979)
export function severinghausSaturation(po2MmHg: number): number {
  const po2: number = max(0, po2MmHg);

  return 100 / (1 + 23400 / (po2 * po2 * po2 + 150 * po2 + 1e-9));
}

// Oxygen content: CO2content = 1.34·Hb·SO2 + 0.003·PO2, in mL O2/dL (West's Respiratory Physiology, ch. 6)
export function oxygenContent(po2MmHg: number, hemoglobinGPerDl: number): number {
  return 1.34 * hemoglobinGPerDl * (severinghausSaturation(po2MmHg) / 100) + 0.003 * po2MmHg;
}

// Berggren shunt equation Qs/Qt = (CcO2 − CaO2)/(CcO2 − CvO2) with CvO2 = CaO2 − (a−v)DO2 gives CaO2 = CcO2 − Qs/Qt·(a−v)DO2/(1 − Qs/Qt); end-capillary PO2 is assumed equal to PAO2 and PaO2 is recovered by inverting the content curve (Berggren, Acta Physiol Scand 1942)
export function equilibriumPao2(
  alveolarPo2MmHg: number,
  shuntFraction: number,
  hemoglobinGPerDl: number,
  arteriovenousO2DifferenceMlPerDl: number,
): number {
  const shunt: number = min(MAX_SHUNT_FRACTION, max(0, shuntFraction));
  const capillaryContent: number = oxygenContent(alveolarPo2MmHg, hemoglobinGPerDl);
  const arterialContent: number = capillaryContent - (shunt * arteriovenousO2DifferenceMlPerDl) / (1 - shunt);

  if (arterialContent <= oxygenContent(MIN_PAO2_MMHG, hemoglobinGPerDl)) {
    return MIN_PAO2_MMHG;
  }

  let low: number = MIN_PAO2_MMHG;
  let high: number = min(MAX_PAO2_MMHG, max(alveolarPo2MmHg, MIN_PAO2_MMHG));

  for (let iteration: number = 0; iteration < PAO2_BISECTION_ITERATIONS; iteration += 1) {
    const middle: number = (low + high) / 2;

    if (oxygenContent(middle, hemoglobinGPerDl) < arterialContent) {
      low = middle;
    } else {
      high = middle;
    }
  }

  return (low + high) / 2;
}

// First-order lag toward equilibrium: x(t+dt) = x_eq + (x − x_eq)·e^(−dt/τ)
export function firstOrderApproach(current: number, equilibrium: number, dtMs: number, timeConstantMs: number): number {
  if (timeConstantMs <= 0) {
    return equilibrium;
  }

  return equilibrium + (current - equilibrium) * exp(-dtMs / timeConstantMs);
}
