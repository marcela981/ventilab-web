/*
* Funcionalidad: Evaluation grouping
* Descripción: Pure grouping of the student evaluation list as in July (DISENO_BLOQUE3 §3, decision 11 of §7b): evaluation type in the July order (Quizzes, Talleres, Exámenes Finales) → curriculum track (Mecánica, VentyLab, any other track by name, then "Otras" for evaluations without a track) → level by its order within the track ("Otras" for evaluations without a level, always last). Every type section is returned, even empty, so the page can say "Sin evaluaciones asignadas."; tracks and levels are only returned when they hold evaluations. The order of the evaluations inside a level is kept. Also isEvaluationCompleted: the "Completado ✓" chip (a submitted attempt and none in progress). Depends on the evaluation entities.
* Versión: 1.0
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

import type { EvaluationType, MyEvaluation } from "./evaluation.entity";
import { findInProgressAttempt, findLastSubmittedAttempt } from "./evaluation.entity";

// July order of the accordions.
export const EVALUATION_TYPE_ORDER: readonly EvaluationType[] = ["QUIZ", "WORKSHOP", "EXAM"];

// TODO(i18n): move to an evaluations namespace in src/i18n.
export const GROUP_COPY = {
  sections: {
    QUIZ: "📝 Quizzes",
    WORKSHOP: "📋 Talleres",
    EXAM: "🎓 Exámenes Finales",
  } satisfies Record<EvaluationType, string>,
  tracks: {
    mecanica: "Mecánica",
    ventylab: "VentyLab",
  } as Readonly<Record<string, string>>,
  other: "Otras",
  emptySection: "Sin evaluaciones asignadas.",
  emptyAll: "No tienes evaluaciones asignadas todavía.",
  completed: "Completado ✓",
} as const;

export const OTHER_KEY = "__other__";

export type LevelGroup = {
  key: string
  label: string
  evaluations: MyEvaluation[]
};

export type TrackGroup = {
  key: string
  label: string
  levels: LevelGroup[]
};

export type TypeSection = {
  type: EvaluationType
  label: string
  count: number
  tracks: TrackGroup[]
};

const KNOWN_TRACKS = ["mecanica", "ventylab"];

function trackRank(key: string): number {
  const known = KNOWN_TRACKS.indexOf(key);

  if (known >= 0) {
    return known;
  }

  return key === OTHER_KEY ? Number.MAX_SAFE_INTEGER : KNOWN_TRACKS.length;
}

function trackLabel(key: string): string {
  if (key === OTHER_KEY) {
    return GROUP_COPY.other;
  }

  return GROUP_COPY.tracks[key] ?? key.charAt(0).toUpperCase() + key.slice(1);
}

type LevelBucket = LevelGroup & { order: number };

function groupTracks(evaluations: readonly MyEvaluation[]): TrackGroup[] {
  const tracks = new Map<string, Map<string, LevelBucket>>();

  for (const evaluation of evaluations) {
    const trackKey = evaluation.track?.trim() || OTHER_KEY;
    const levelKey = evaluation.levelId ?? OTHER_KEY;
    const levels = tracks.get(trackKey) ?? new Map<string, LevelBucket>();
    const bucket = levels.get(levelKey) ?? {
      key: levelKey,
      label: levelKey === OTHER_KEY ? GROUP_COPY.other : evaluation.levelTitle?.trim() || GROUP_COPY.other,
      order: levelKey === OTHER_KEY ? Number.MAX_SAFE_INTEGER : evaluation.levelOrder ?? Number.MAX_SAFE_INTEGER - 1,
      evaluations: [],
    };

    bucket.evaluations.push(evaluation);
    levels.set(levelKey, bucket);
    tracks.set(trackKey, levels);
  }

  return [...tracks.entries()]
    .sort(([a], [b]) => trackRank(a) - trackRank(b) || a.localeCompare(b, "es"))
    .map(([key, levels]) => ({
      key,
      label: trackLabel(key),
      levels: [...levels.values()]
        .sort((a, b) => a.order - b.order || a.label.localeCompare(b.label, "es"))
        .map(({ key: levelKey, label, evaluations: items }) => ({ key: levelKey, label, evaluations: items })),
    }));
}

export function groupEvaluations(evaluations: readonly MyEvaluation[]): TypeSection[] {
  return EVALUATION_TYPE_ORDER.map((type) => {
    const ofType = evaluations.filter((item) => item.type === type);

    return { type, label: GROUP_COPY.sections[type], count: ofType.length, tracks: groupTracks(ofType) };
  });
}

// July's "Completado ✓": the student submitted an attempt and has none in progress.
export function isEvaluationCompleted(evaluation: MyEvaluation): boolean {
  return findLastSubmittedAttempt(evaluation) !== null && findInProgressAttempt(evaluation) === null;
}
