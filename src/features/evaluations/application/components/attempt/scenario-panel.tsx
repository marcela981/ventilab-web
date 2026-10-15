/*
* Funcionalidad: ScenarioPanel
* Descripción: Clinical scenario context of the current question in the attempt player: the scenario rich text and its media in a sticky panel that stays in view (and scrolls on its own when long) while the student answers the questions of that scenario. Depends on RichTextView, EvaluationMediaList, the evaluation entities and the attempt player CSS Module.
* Versión: 1.0
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

import { cx } from "@shared/lib/class-names";
import type { AttemptScenario } from "../../entities/evaluation.entity";
import { EvaluationMediaList } from "../questions/evaluation-media-list";
import { RichTextView } from "../rich-text-view";
import styles from "../../../UI/attempt-player.module.css";

// TODO(i18n): move to an evaluations namespace in src/i18n.
export const SCENARIO_COPY = {
  title: "Escenario clínico",
  media: "Material del escenario",
} as const;

export function ScenarioPanel({ scenario }: { scenario: AttemptScenario }) {
  return (
    <aside className={cx(styles.scenario)} aria-label={SCENARIO_COPY.title}>
      <h2 className={cx(styles.scenarioTitle)}>{SCENARIO_COPY.title}</h2>
      <RichTextView value={scenario.content} />
      <EvaluationMediaList media={scenario.media} label={SCENARIO_COPY.media} />
    </aside>
  );
}
