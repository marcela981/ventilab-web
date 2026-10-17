/*
* Funcionalidad: AiTelemetryTotals
* Descripción: Metric cards of /admin/ai with the `totals` of `GET /api/admin/ai-telemetry/stats` exactly as returned: logged calls, provider calls, error and fallback rates (API 0–1 rates shown as percentages), input and output tokens, estimated cost in USD, latency p50/p95 and time to first token p50/p95 ("—" when the API leaves a percentile out because no call measured it). Depends on @shared/lib, the admin console DTOs, format entity and CSS Module.
* Versión: 1.0
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

import { cx } from "@shared/lib/class-names";
import type { AiTelemetryMetricsDTO } from "../../api/dtos/admin-console.dto";
import { formatCount, formatMs, formatRate, formatUsd } from "../entities/admin-format";
import styles from "../../UI/admin-operations.module.css";

// TODO(i18n): move to an admin-console namespace in src/i18n.
export const AI_TOTALS_COPY = {
  region: "Totales del rango",
  calls: "Llamadas registradas",
  providerCalls: "Llamadas a proveedor",
  errorRate: "Tasa de error",
  fallbackRate: "Tasa de respaldo",
  inputTokens: "Tokens de entrada",
  outputTokens: "Tokens de salida",
  costUsd: "Costo estimado",
  latencyP50: "Latencia p50",
  latencyP95: "Latencia p95",
  ttftP50: "Primer token p50",
  ttftP95: "Primer token p95",
} as const;

export function AiTelemetryTotals({ totals }: { totals: AiTelemetryMetricsDTO }) {
  const metrics: [string, string][] = [
    [AI_TOTALS_COPY.calls, formatCount(totals.calls)],
    [AI_TOTALS_COPY.providerCalls, formatCount(totals.providerCalls)],
    [AI_TOTALS_COPY.errorRate, formatRate(totals.errorRate)],
    [AI_TOTALS_COPY.fallbackRate, formatRate(totals.fallbackRate)],
    [AI_TOTALS_COPY.inputTokens, formatCount(totals.inputTokens)],
    [AI_TOTALS_COPY.outputTokens, formatCount(totals.outputTokens)],
    [AI_TOTALS_COPY.costUsd, formatUsd(totals.costUsd)],
    [AI_TOTALS_COPY.latencyP50, formatMs(totals.latencyP50Ms)],
    [AI_TOTALS_COPY.latencyP95, formatMs(totals.latencyP95Ms)],
    [AI_TOTALS_COPY.ttftP50, formatMs(totals.ttftP50Ms)],
    [AI_TOTALS_COPY.ttftP95, formatMs(totals.ttftP95Ms)],
  ];

  return (
    <ul className={cx(styles.cardGrid)} aria-label={AI_TOTALS_COPY.region}>
      {metrics.map(([label, value]) => (
        <li key={label} className={cx(styles.card)}>
          <p className={cx(styles.metricLabel)}>{label}</p>
          <p className={cx(styles.metricValue)}>{value}</p>
        </li>
      ))}
    </ul>
  );
}
