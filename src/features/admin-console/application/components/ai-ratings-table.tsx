/*
* Funcionalidad: AiRatingsTable
* Descripción: Table of the rating groups of `GET /api/admin/ai-ratings/stats` in /admin/ai: use case, provider, model, prompt version, number of ratings, helpful rate (API 0–1 rate as a percentage) and the mean of each QUEST dimension (quality, understanding, trust, expression, safety) with the n that answered it; a dimension without answers shows "—". Values exactly as returned. Depends on @shared/lib, the admin console AI analytics and format entities and CSS Module.
* Versión: 1.0
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

import { cx } from "@shared/lib/class-names";
import { formatCount, formatDecimal, formatRate } from "../entities/admin-format";
import { QUEST_DIMENSION_LABELS, QUEST_DIMENSIONS, aiUseCaseLabel } from "../entities/ai-analytics.entity";
import type { AiRatingGroup } from "../entities/ai-analytics.entity";
import styles from "../../UI/admin-operations.module.css";

// TODO(i18n): move to an admin-console namespace in src/i18n.
export const AI_RATINGS_TABLE_COPY = {
  caption: "Calificaciones de IA por caso de uso, proveedor, modelo y versión del prompt",
  useCase: "Caso de uso",
  provider: "Proveedor",
  model: "Modelo",
  promptVersion: "Prompt",
  ratings: "Calificaciones",
  helpful: "Útil",
  dimension: (mean: string, n: string) => `${mean} (n = ${n})`,
} as const;

export function AiRatingsTable({ groups }: { groups: readonly AiRatingGroup[] }) {
  return (
    <div className={cx(styles.results, styles.tableContainer)}>
      <table className={cx(styles.table)}>
        <caption className={cx(styles.visuallyHidden)}>{AI_RATINGS_TABLE_COPY.caption}</caption>
        <thead>
          <tr>
            <th scope="col">{AI_RATINGS_TABLE_COPY.useCase}</th>
            <th scope="col">{AI_RATINGS_TABLE_COPY.provider}</th>
            <th scope="col">{AI_RATINGS_TABLE_COPY.model}</th>
            <th scope="col">{AI_RATINGS_TABLE_COPY.promptVersion}</th>
            <th scope="col" className={cx(styles.numeric)}>{AI_RATINGS_TABLE_COPY.ratings}</th>
            <th scope="col" className={cx(styles.numeric)}>{AI_RATINGS_TABLE_COPY.helpful}</th>
            {QUEST_DIMENSIONS.map((dimension) => (
              <th key={dimension} scope="col" className={cx(styles.numeric)}>{QUEST_DIMENSION_LABELS[dimension]}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {groups.map((group) => (
            <tr key={`${group.useCase}|${group.provider}|${group.model}|${group.promptVersion}`}>
              <th scope="row">{aiUseCaseLabel(group.useCase)}</th>
              <td>{group.provider}</td>
              <td className={cx(styles.mono)}>{group.model}</td>
              <td className={cx(styles.mono)}>{group.promptVersion}</td>
              <td className={cx(styles.numeric)}>{formatCount(group.ratings)}</td>
              <td className={cx(styles.numeric)}>{formatRate(group.helpfulRate)}</td>
              {QUEST_DIMENSIONS.map((dimension) => {
                const stats = group.dimensions[dimension];

                return (
                  <td key={dimension} className={cx(styles.numeric)}>
                    {AI_RATINGS_TABLE_COPY.dimension(formatDecimal(stats.mean), formatCount(stats.n))}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
