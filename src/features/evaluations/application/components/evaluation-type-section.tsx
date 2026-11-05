/*
* Funcionalidad: EvaluationTypeSection
* Descripción: One July accordion of the student evaluation list ("📝 Quizzes", "📋 Talleres", "🎓 Exámenes Finales"): a heading with a disclosure button (aria-expanded, aria-controls, count) and a region labelled by it that holds the tracks (h3) and their levels, each level a list of EvaluationCards (title h4). Open by default when it holds evaluations; an empty section says "Sin evaluaciones asignadas.". The region stays rendered with `hidden` while collapsed. Depends on React, MUI icons, the evaluation grouping entities, EvaluationCard and the evaluations CSS Module. v1.1 (ajustes C2): evaluations without track nor level show the "Otras" heading once (the level label repeated the track title).
* Versión: 1.1
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import { useId, useState } from "react";
import { cx } from "@shared/lib/class-names";
import type { TypeSection } from "../entities/group-evaluations";
import { GROUP_COPY, OTHER_KEY } from "../entities/group-evaluations";
import { EvaluationCard } from "./evaluation-card";
import styles from "../../UI/evaluations.module.css";

export type EvaluationTypeSectionProps = {
  section: TypeSection
};

export function EvaluationTypeSection({ section }: EvaluationTypeSectionProps) {
  const [expanded, setExpanded] = useState(section.count > 0);
  const triggerId = useId();
  const regionId = useId();

  return (
    <section className={cx(styles.typeSection)}>
      <h2 className={cx(styles.typeHeading)}>
        <button
          id={triggerId}
          type="button"
          className={cx(styles.typeTrigger)}
          aria-expanded={expanded}
          aria-controls={regionId}
          onClick={() => setExpanded((value) => !value)}
        >
          <span>{section.label}</span>
          <span className={cx(styles.typeCount)}>{`(${section.count})`}</span>
          <ExpandMoreIcon className={cx(styles.typeIcon, expanded && styles.typeIconExpanded)} aria-hidden="true" />
        </button>
      </h2>
      <div id={regionId} role="region" aria-labelledby={triggerId} hidden={!expanded} className={cx(styles.typeBody)}>
        {section.count === 0 ? <p className={cx(styles.emptySection)}>{GROUP_COPY.emptySection}</p> : null}
        {section.tracks.map((track) => (
          <div key={track.key} className={cx(styles.trackGroup)}>
            <h3 className={cx(styles.trackTitle)}>{track.label}</h3>
            {track.levels.map((level) => (
              <div key={level.key} className={cx(styles.levelGroup)}>
                {track.key === OTHER_KEY && level.key === OTHER_KEY ? null : <p className={cx(styles.levelLabel)}>{level.label}</p>}
                <ul className={cx(styles.grid)} aria-label={`${section.label} · ${track.label} · ${level.label}`}>
                  {level.evaluations.map((evaluation) => (
                    <li key={evaluation.assignmentId}>
                      <EvaluationCard evaluation={evaluation} headingLevel="h4" />
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        ))}
      </div>
    </section>
  );
}
