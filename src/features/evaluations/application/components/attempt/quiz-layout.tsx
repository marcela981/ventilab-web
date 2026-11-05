/*
* Funcionalidad: QuizLayout
* Descripción: QUIZ body of the attempt player, as July's QuizRenderer: every question visible at once ("Pregunta i de N"), the clinical scenario shown before the first question that uses it, immediate feedback under each choice question once answered ("¡Correcto! 🎉" / `Casi. La respuesta correcta era "{x}"` and the explanation, announced through an aria-live region) and "Enviar quiz" at the end. Depends on the attempt components and the attempt player CSS Module. v1.1 (ajustes C1): no immediate feedback; every answer is autosaved with its save status and the results wait for the teacher release.
* Versión: 1.1
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

import { Fragment } from "react";
import { cx } from "@shared/lib/class-names";
import { findScenario } from "../../entities/attempt-progress";
import type { AttemptLayoutProps } from "./attempt-question-block";
import { AttemptQuestionBlock } from "./attempt-question-block";
import { PAGER_COPY } from "./exam-layout";
import { ScenarioPanel } from "./scenario-panel";
import styles from "../../../UI/attempt-player.module.css";

export function QuizLayout(props: AttemptLayoutProps) {
  const { attempt, submitButton } = props;
  const { questions } = attempt;
  const total = questions.length;

  if (total === 0) {
    return <p>{PAGER_COPY.emptyAttempt}</p>;
  }

  return (
    <div className={cx(styles.quizList)}>
      {questions.map((question, position) => {
        const scenario = findScenario(attempt.scenarios, question);
        const firstOfScenario = scenario !== null && questions[position - 1]?.scenarioId !== question.scenarioId;

        return (
          <Fragment key={question.id}>
            {firstOfScenario ? <ScenarioPanel scenario={scenario} /> : null}
            <AttemptQuestionBlock {...props} kind="quiz" question={question} position={position + 1} total={total} />
          </Fragment>
        );
      })}
      <div className={cx(styles.submitRow)}>{submitButton}</div>
    </div>
  );
}
