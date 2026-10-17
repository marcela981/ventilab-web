/*
* Funcionalidad: AdminAiAnalyticsPage
* Descripción: Page /admin/ai (ADMIN): AI usage and quality from the API only. Filters in the URL (Bogota days from/to sent as an ISO range with `to` exclusive, use case, provider, model; prompt version and rated output type for the ratings). Telemetry (`GET /api/admin/ai-telemetry/stats`): total cards and lazy per-day charts (calls, latency and time to first token p50/p95, error and fallback rates, tokens, cost) straight from `days[]`. Ratings (`GET /api/admin/ai-ratings/stats`): table of groups with helpful rate and QUEST dimension means, plus a lazy chart of the helpful rate per group. CSV buttons download `/api/admin/ai-telemetry/export.csv` and `/api/admin/ai-ratings/export.csv` with the same filters (notice when X-Export-Truncated). New filters never show the previous result (no keepPreviousData) and every failure is shown. No metric is computed on the client. v1.1 (review): changing the filters clears both CSV truncation notices, so they only describe exports of the current filters. Depends on MUI, next/head, next/router, React, @shared/lib, the design-system components, the admin console components, entities, hooks, service and CSS Module.
* Versión: 1.1
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

import DownloadIcon from "@mui/icons-material/Download";
import Alert from "@mui/material/Alert";
import Head from "next/head";
import { useRouter } from "next/router";
import { useMemo } from "react";
import { AsyncButton } from "@shared/design-system/components/async-button";
import { ErrorState } from "@shared/design-system/components/error-state";
import { PageHeader } from "@shared/design-system/components/page-header";
import { CardSkeleton } from "@shared/design-system/components/skeleton";
import { cx } from "@shared/lib/class-names";
import { formatDateTime } from "@shared/lib/format";
import { exportAiRatingsCsv, exportAiTelemetryCsv } from "../../api/services/admin-operations.service";
import { AiFilters } from "../components/ai-filters";
import { AiRatingsTable } from "../components/ai-ratings-table";
import { AiTelemetryTotals } from "../components/ai-telemetry-totals";
import { AiHelpfulChart, AiTelemetryCharts } from "../components/lazy-ai-charts";
import { getAdminConsoleErrorMessage } from "../entities/admin-console-error-messages";
import { readAiFilters, toAiFiltersQuery, toAiRatingsQuery, toAiTelemetryQuery } from "../entities/ai-analytics.entity";
import type { AiFilters as AiFiltersValue } from "../entities/ai-analytics.entity";
import { DATE_RANGE_ERRORS, isIsoRange, toIsoRange } from "../entities/date-range.entity";
import { useAiRatingStats, useAiTelemetryStats } from "../hooks/use-ai-analytics";
import { useCsvExport } from "../hooks/use-csv-export";
import styles from "../../UI/admin-operations.module.css";

const MAX_RANGE_DAYS = 366;

// TODO(i18n): move to an admin-console namespace in src/i18n.
export const ADMIN_AI_COPY = {
  documentTitle: "Analítica de IA | VentyLab",
  title: "Analítica de IA",
  subtitle: "Uso, latencia, costo y calidad percibida de las respuestas de IA, tal como los calcula el servidor.",
  defaultRange: "Sin fechas, el servidor usa los últimos 30 días. Las fechas se interpretan en hora de Bogotá; los días de las gráficas son días UTC.",
  range: (from: string, to: string) => `Rango consultado: ${from} – ${to}.`,
  exportTelemetry: "Exportar llamadas (CSV)",
  exportRatings: "Exportar calificaciones (CSV)",
  telemetryFile: "ia-llamadas.csv",
  ratingsFile: "ia-calificaciones.csv",
  truncatedTelemetry: "La exportación de llamadas quedó truncada por el límite del servidor. Acota el rango o los filtros para obtener el resto.",
  truncatedRatings: "La exportación de calificaciones quedó truncada por el límite del servidor. Acota el rango o los filtros para obtener el resto.",
  telemetryTitle: "Telemetría de llamadas",
  telemetryLoading: "Cargando la telemetría de IA…",
  telemetryError: "No se pudo cargar la telemetría de IA",
  noDays: "No hubo llamadas de IA en este rango.",
  ratingsTitle: "Calificaciones de los usuarios",
  ratingsLoading: "Cargando las calificaciones de IA…",
  ratingsError: "No se pudieron cargar las calificaciones de IA",
  noRatings: "No hay calificaciones en este rango.",
} as const;

export function AdminAiAnalyticsPage() {
  const router = useRouter();
  const filters = useMemo(() => readAiFilters(router.query), [router.query]);
  const range = toIsoRange(filters.fromDay, filters.toDay, MAX_RANGE_DAYS);
  const validRange = isIsoRange(range) ? range : null;
  const ready = router.isReady && validRange !== null;
  const telemetryQuery = ready && validRange ? toAiTelemetryQuery(filters, validRange) : null;
  const ratingsQuery = ready && validRange ? toAiRatingsQuery(filters, validRange) : null;
  const telemetry = useAiTelemetryStats(telemetryQuery);
  const ratings = useAiRatingStats(ratingsQuery);
  const telemetryCsv = useCsvExport();
  const ratingsCsv = useCsvExport();

  const setFilters = (next: AiFiltersValue) => {
    // New filters mean different exports: the previous truncation notices no longer apply.
    telemetryCsv.reset();
    ratingsCsv.reset();
    void router.replace({ pathname: router.pathname, query: toAiFiltersQuery(next) }, undefined, { shallow: true });
  };

  const renderTelemetry = () => {
    if (telemetry.error) {
      return (
        <ErrorState
          title={ADMIN_AI_COPY.telemetryError}
          description={getAdminConsoleErrorMessage(telemetry.error)}
          onRetry={() => void telemetry.reload()}
        />
      );
    }

    if (!telemetry.value) {
      return telemetryQuery ? <CardSkeleton label={ADMIN_AI_COPY.telemetryLoading} /> : null;
    }

    const { totals, days, from, to } = telemetry.value;

    return (
      <>
        <p className={cx(styles.note)}>{ADMIN_AI_COPY.range(formatDateTime(from), formatDateTime(to))}</p>
        <AiTelemetryTotals totals={totals} />
        {days.length === 0 ? <p className={cx(styles.note)}>{ADMIN_AI_COPY.noDays}</p> : (
          <div className={cx(styles.chartGrid)}>
            <AiTelemetryCharts days={days} />
          </div>
        )}
      </>
    );
  };

  const renderRatings = () => {
    if (ratings.error) {
      return (
        <ErrorState
          title={ADMIN_AI_COPY.ratingsError}
          description={getAdminConsoleErrorMessage(ratings.error)}
          onRetry={() => void ratings.reload()}
        />
      );
    }

    if (!ratings.value) {
      return ratingsQuery ? <CardSkeleton label={ADMIN_AI_COPY.ratingsLoading} /> : null;
    }

    if (ratings.value.groups.length === 0) {
      return <p className={cx(styles.note)}>{ADMIN_AI_COPY.noRatings}</p>;
    }

    return (
      <>
        <AiRatingsTable groups={ratings.value.groups} />
        <AiHelpfulChart groups={ratings.value.groups} />
      </>
    );
  };

  return (
    <div className={cx(styles.page)}>
      <Head>
        <title>{ADMIN_AI_COPY.documentTitle}</title>
      </Head>
      <PageHeader
        title={ADMIN_AI_COPY.title}
        subtitle={ADMIN_AI_COPY.subtitle}
        actions={(
          <div className={cx(styles.filterActions)}>
            <AsyncButton
              variant="outlined"
              startIcon={<DownloadIcon />}
              loading={telemetryCsv.exporting}
              disabled={!telemetryQuery}
              onClick={() => (telemetryQuery ? telemetryCsv.run(() => exportAiTelemetryCsv(telemetryQuery), ADMIN_AI_COPY.telemetryFile) : undefined)}
            >
              {ADMIN_AI_COPY.exportTelemetry}
            </AsyncButton>
            <AsyncButton
              variant="outlined"
              startIcon={<DownloadIcon />}
              loading={ratingsCsv.exporting}
              disabled={!ratingsQuery}
              onClick={() => (ratingsQuery ? ratingsCsv.run(() => exportAiRatingsCsv(ratingsQuery), ADMIN_AI_COPY.ratingsFile) : undefined)}
            >
              {ADMIN_AI_COPY.exportRatings}
            </AsyncButton>
          </div>
        )}
      />
      <div className={cx(styles.content)}>
        <AiFilters value={filters} onChange={setFilters} />
        <p className={cx(styles.note)}>{ADMIN_AI_COPY.defaultRange}</p>
        {isIsoRange(range) ? null : <Alert severity="error">{DATE_RANGE_ERRORS[range]}</Alert>}
        {telemetryCsv.truncated ? <Alert severity="warning">{ADMIN_AI_COPY.truncatedTelemetry}</Alert> : null}
        {ratingsCsv.truncated ? <Alert severity="warning">{ADMIN_AI_COPY.truncatedRatings}</Alert> : null}
        <section className={cx(styles.section)} aria-labelledby="ai-telemetry-title">
          <h2 id="ai-telemetry-title" className={cx(styles.sectionTitle)}>{ADMIN_AI_COPY.telemetryTitle}</h2>
          {renderTelemetry()}
        </section>
        <section className={cx(styles.section)} aria-labelledby="ai-ratings-title">
          <h2 id="ai-ratings-title" className={cx(styles.sectionTitle)}>{ADMIN_AI_COPY.ratingsTitle}</h2>
          {renderRatings()}
        </section>
      </div>
    </div>
  );
}
