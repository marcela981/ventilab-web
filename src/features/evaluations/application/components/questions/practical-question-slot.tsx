/*
* Funcionalidad: PracticalQuestionSlot
* Descripción: Slot of a SIMULATION question. When a simulator feature registered a renderer (registerPracticalQuestionRenderer) the slot renders it with the question props; otherwise it renders a disabled card with the case information the question carries (points and clinical case) and the notice "Disponible cuando se habilite el simulador". The student cannot answer it until the simulator exists. Depends on the practical question registry, the evaluation entities and the questions CSS Module.
* Versión: 1.0
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

import ScienceIcon from "@mui/icons-material/Science";
import { createElement } from "react";
import type { ReactElement } from "react";
import { cx } from "@shared/lib/class-names";
import type { PracticalQuestionRendererProps } from "../../entities/practical-question-renderer";
import { getPracticalQuestionRenderer } from "../../entities/practical-question-renderer";
import styles from "../../../UI/questions.module.css";

// TODO(i18n): move to an evaluations namespace in src/i18n.
export const PRACTICAL_COPY = {
  title: "Pregunta práctica en el simulador",
  clinicalCase: "Caso clínico",
  noCase: "Sin caso clínico asociado",
  points: "Puntaje",
  notice: "Disponible cuando se habilite el simulador",
} as const;

function DisabledPracticalCard({ question }: PracticalQuestionRendererProps) {
  return (
    <div role="group" className={cx(styles.practical)} aria-disabled="true" aria-label={PRACTICAL_COPY.title}>
      <h3 className={cx(styles.practicalTitle)}>
        <ScienceIcon aria-hidden="true" />
        {PRACTICAL_COPY.title}
      </h3>
      <dl className={cx(styles.practicalDetails)}>
        <dt>{PRACTICAL_COPY.clinicalCase}</dt>
        <dd>{question.clinicalCaseId ?? PRACTICAL_COPY.noCase}</dd>
        <dt>{PRACTICAL_COPY.points}</dt>
        <dd>{question.points}</dd>
      </dl>
      <p className={cx(styles.practicalNotice)}>{PRACTICAL_COPY.notice}</p>
    </div>
  );
}

// The registered component is module-level and stable; it is not created during render.
function renderRegisteredPracticalQuestion(props: PracticalQuestionRendererProps): ReactElement | null {
  const renderer = getPracticalQuestionRenderer();

  return renderer ? createElement(renderer, props) : null;
}

export function PracticalQuestionSlot(props: PracticalQuestionRendererProps) {
  return renderRegisteredPracticalQuestion(props) ?? <DisabledPracticalCard {...props} />;
}
