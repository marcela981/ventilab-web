/*
* Funcionalidad: July layout parameter placement
* Descripción: Where each ventilator parameter of the effective mode goes in the July three-column console (DISENO_BLOQUE5 §6.3, §6.5, §6.9): the input row above the curves (FiO2 | the first of Vt, Pinsp, PS that applies | PEEP; CPAP leaves the middle slot empty), the timing block of the right column (inspiratory time, inspiratory pause), the rate block (respiratory rate) and "Más parámetros" with every other applicable parameter (triggers, PS in SIMV, cycling, apnea time), so no parameter of the mode is lost. Also the July visible labels (the accessible names stay the console descriptions) and the primary modes of the VOL CTRL / PRES CTRL toggle (the other modes go to "Más modos"). Pure, no React. v0.1 (Bloque 5, C2): first version.
* Versión: 0.1
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

/** The two big buttons of the July toggle, in order; any other adapter mode goes to "Más modos". */
export const JULY_PRIMARY_MODES = [
  { id: "VCV", short: "VOL", sub: "CTRL", name: "Volumen control" },
  { id: "PCV", short: "PRES", sub: "CTRL", name: "Presión control" },
] as const;

const PRIMARY_MODE_IDS: ReadonlySet<string> = new Set(JULY_PRIMARY_MODES.map((mode) => mode.id));

export function isPrimaryMode(modeId: string): boolean {
  return PRIMARY_MODE_IDS.has(modeId);
}

/** Candidates of the middle slot of the input row, first applicable wins (SIMV: Vt; PSV: PS; PCV: Pinsp). */
export const JULY_INPUT_MIDDLE = ["tidalVolume", "inspiratoryPressure", "pressureSupport"] as const;

export const JULY_INSPIRATORY_TIME = "inspiratoryTime";
export const JULY_INSPIRATORY_PAUSE = "inspiratoryPause";
export const JULY_RATE = "respiratoryRate";

export type JulyPlacement = {
  /** FiO2 | middle | PEEP; `null` when the slot does not apply to the mode. */
  row: readonly [string | null, string | null, string | null]
  inspiratoryTime: boolean
  inspiratoryPause: boolean
  rate: boolean
  /** Everything else that applies, in the mode table order. */
  more: readonly string[]
};

/** Places the applicable parameters (getParametersForMode order) in the July zones. */
export function julyPlacement(visible: readonly string[]): JulyPlacement {
  const applies = new Set(visible);
  const middle = JULY_INPUT_MIDDLE.find((id) => applies.has(id)) ?? null;
  const row: readonly [string | null, string | null, string | null] = [applies.has("fio2") ? "fio2" : null, middle, applies.has("peep") ? "peep" : null];
  const placed = new Set<string>([JULY_INSPIRATORY_TIME, JULY_INSPIRATORY_PAUSE, JULY_RATE]);

  row.forEach((id) => {
    if (id !== null) {
      placed.add(id);
    }
  });

  return {
    row,
    inspiratoryTime: applies.has(JULY_INSPIRATORY_TIME),
    inspiratoryPause: applies.has(JULY_INSPIRATORY_PAUSE),
    rate: applies.has(JULY_RATE),
    more: visible.filter((id) => !placed.has(id)),
  };
}

/** July visible label of a parameter in a mode; `undefined` keeps the console label. */
export function julyLabel(parameter: string, mode: string): string | undefined {
  switch (parameter) {
    case "fio2":
      return "FiO₂";
    case "tidalVolume":
      return mode === "VCV" ? "Volumen (VCV)" : "Volumen";
    case "inspiratoryPressure":
      return mode === "PCV" ? "PIP (PCV)" : "PIP";
    case "pressureSupport":
      return "Presión de soporte";
    case "peep":
      return "PEEP";
    case JULY_INSPIRATORY_TIME:
      return "Tiempo inspiratorio";
    case JULY_INSPIRATORY_PAUSE:
      return "Pausa inspiratoria";
    case JULY_RATE:
      return "Frecuencia respiratoria";
    default:
      return undefined;
  }
}
