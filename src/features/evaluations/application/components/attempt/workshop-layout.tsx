/*
* Funcionalidad: WorkshopLayout
* Descripción: WORKSHOP body of the attempt player, as July's TallerRenderer: "Paso n de N" with a progress bar, the clinical scenario of the step, one question at a time (AttemptQuestionBlock: "Pista 💡" / "Ocultar pista" before answering, immediate feedback with the explanation after answering), Anterior and Siguiente, and on the last step "Enviar taller" instead of Siguiente. The focus moves to the question heading on every step change and Alt+←/→ change the step outside text fields (useQuestionPager). Depends on MUI, the attempt components, useQuestionPager and the attempt player CSS Module.
* Versión: 1.0
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

import Button from "@mui/material/Button";
import LinearProgress from "@mui/material/LinearProgress";
import { cx } from "@shared/lib/class-names";
import { findScenario } from "../../entities/attempt-progress";
import { useQuestionPager } from "../../hooks/use-question-pager";
import type { AttemptLayoutProps } from "./attempt-question-block";
import { AttemptQuestionBlock } from "./attempt-question-block";
import { PAGER_COPY } from "./exam-layout";
import { ScenarioPanel } from "./scenario-panel";
import styles from "../../../UI/attempt-player.module.css";

// TODO(i18n): move to an evaluations namespace in src/i18n.
export const WORKSHOP_COPY = {
  step: (position: number, total: number) => `Paso ${position} de ${total}`,
} as const;

export function WorkshopLayout(props: AttemptLayoutProps) {
  const { attempt, index, onIndexChange, submitButton } = props;
  const { questions } = attempt;
  const total = questions.length;
  const headingRef = useQuestionPager({ index, total, onIndexChange });
  const question = questions[index];
  const scenario = findScenario(attempt.scenarios, question);
  const isLast = index >= total - 1;
  const step = WORKSHOP_COPY.step(index + 1, total);

  if (!question) {
    return <p>{PAGER_COPY.emptyAttempt}</p>;
  }

  return (
    <div className={cx(styles.content, scenario && styles.contentWithScenario)}>
      <div className={cx(styles.progress)}>
        <p className={cx(styles.progressLabel)}>{step}</p>
        <LinearProgress variant="determinate" value={((index + 1) / total) * 100} aria-label={step} />
      </div>
      {scenario ? <ScenarioPanel scenario={scenario} /> : null}
      <AttemptQuestionBlock {...props} kind="workshop" question={question} position={index + 1} total={total} headingRef={headingRef} />
      <div className={cx(styles.pager)}>
        <Button variant="outlined" disabled={index === 0} onClick={() => onIndexChange(index - 1)}>
          {PAGER_COPY.previous}
        </Button>
        {isLast ? submitButton : (
          <Button variant="contained" onClick={() => onIndexChange(index + 1)}>
            {PAGER_COPY.next}
          </Button>
        )}
      </div>
    </div>
  );
}
