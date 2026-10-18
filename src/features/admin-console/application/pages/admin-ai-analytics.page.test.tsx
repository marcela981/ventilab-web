/*
* Funcionalidad: AdminAiAnalyticsPage tests
* Descripción: /admin/ai with msw and stubbed lazy charts: the telemetry totals render as returned with "—" for the percentiles the API leaves out, the per-day series reach the charts unchanged, the rating groups show their helpful rate and QUEST means, the URL filters reach both stats queries as the Bogota range, an invalid range sends nothing, and a failing stats request shows its error. Depends on Testing Library, msw, vitest and the admin console page and test helpers. v1.1 (B4): a too long closed range sends nothing and its message names AI_ANALYTICS_MAX_RANGE_DAYS.
* Versión: 1.1
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

import { screen, within } from "@testing-library/react";
import { http, HttpResponse } from "msw";
import { setupServer } from "msw/node";
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import type { AiHelpfulChartProps, AiTelemetryChartsProps } from "../components/ai-charts";
import { AI_TOTALS_COPY } from "../components/ai-telemetry-totals";
import { AI_ANALYTICS_MAX_RANGE_DAYS, DATE_RANGE_ERRORS } from "../entities/date-range.entity";
import { ADMIN_AI_COPY, AdminAiAnalyticsPage } from "./admin-ai-analytics.page";
import { apiUrl, envelope, errorResponse, renderAdminConsole } from "./admin-console-test-helpers";

const router = vi.hoisted(() => ({
  pathname: "/admin/ai",
  asPath: "/admin/ai",
  isReady: true,
  query: {} as Record<string, string>,
  replace: vi.fn(() => Promise.resolve(true)),
  push: vi.fn(() => Promise.resolve(true)),
  prefetch: () => Promise.resolve(),
  events: { on: () => undefined, off: () => undefined, emit: () => undefined },
}));

vi.mock("next/router", () => ({ useRouter: () => router }));

vi.mock("../components/lazy-ai-charts", () => ({
  AiTelemetryCharts: ({ days }: AiTelemetryChartsProps) => (
    <div data-testid="telemetry-charts">{days.map((day) => `${day.day}:${day.calls}:${day.latencyP95Ms ?? "none"}`).join(",")}</div>
  ),
  AiHelpfulChart: ({ groups }: AiHelpfulChartProps) => <div data-testid="helpful-chart">{groups.map((group) => group.helpfulRate).join(",")}</div>,
}));

vi.setConfig({ testTimeout: 20_000 });

const server = setupServer();
let telemetryQueries: URLSearchParams[];
let ratingsQueries: URLSearchParams[];
let telemetryStatus: number;

const metrics = {
  calls: 120,
  providerCalls: 110,
  errorCalls: 2,
  errorRate: 0.018,
  fallbackCalls: 4,
  fallbackRate: 0.036,
  inputTokens: 54000,
  outputTokens: 21000,
  costUsd: 0.0312,
  latencyP50Ms: 950,
  latencyP95Ms: 3100,
};

beforeAll(() => {
  server.listen({ onUnhandledRequest: "error" });
});

beforeEach(() => {
  telemetryQueries = [];
  ratingsQueries = [];
  telemetryStatus = 200;
  router.query = {};
  server.use(
    http.get(apiUrl("/api/admin/ai-telemetry/stats"), ({ request }) => {
      telemetryQueries.push(new URL(request.url).searchParams);

      if (telemetryStatus !== 200) {
        return errorResponse("ai-telemetry.invalid_range", telemetryStatus);
      }

      return HttpResponse.json(envelope({
        from: "2026-09-05T00:00:00.000Z",
        to: "2026-10-05T00:00:00.000Z",
        totals: metrics,
        days: [{ ...metrics, day: "2026-10-04" }, { ...metrics, day: "2026-10-05", latencyP95Ms: undefined, calls: 7 }],
      }));
    }),
    http.get(apiUrl("/api/admin/ai-ratings/stats"), ({ request }) => {
      ratingsQueries.push(new URL(request.url).searchParams);

      return HttpResponse.json(envelope({
        from: "2026-09-05T00:00:00.000Z",
        to: "2026-10-05T00:00:00.000Z",
        groups: [{
          useCase: "FREE_CHAT",
          provider: "gemini",
          model: "gemini-2.0-flash",
          promptVersion: "1.0.0",
          ratings: 20,
          helpfulCount: 17,
          helpfulRate: 0.85,
          dimensions: {
            quality: { mean: 4.2, n: 18 },
            understanding: { mean: 4.5, n: 18 },
            trust: { n: 0 },
            expression: { mean: 3.9, n: 10 },
            safety: { mean: 5, n: 2 },
          },
        }],
      }));
    }),
  );
});

afterEach(() => {
  server.resetHandlers();
});

afterAll(() => {
  server.close();
});

function card(label: string): HTMLElement {
  const item = screen.getByText(label).closest("li");

  if (!item) {
    throw new Error(`No card ${label}`);
  }

  return item;
}

describe("AdminAiAnalyticsPage", () => {
  it("shows the API totals with a dash for the missing percentiles", async() => {
    renderAdminConsole(<AdminAiAnalyticsPage />);

    await screen.findByText(AI_TOTALS_COPY.calls);
    expect(within(card(AI_TOTALS_COPY.calls)).getByText("120")).toBeInTheDocument();
    expect(within(card(AI_TOTALS_COPY.errorRate)).getByText("1,8 %")).toBeInTheDocument();
    expect(within(card(AI_TOTALS_COPY.latencyP95)).getByText("3.100 ms")).toBeInTheDocument();
    expect(within(card(AI_TOTALS_COPY.ttftP50)).getByText("—")).toBeInTheDocument();
    expect(within(card(AI_TOTALS_COPY.ttftP95)).getByText("—")).toBeInTheDocument();
    expect(screen.getByTestId("telemetry-charts")).toHaveTextContent("2026-10-04:120:3100,2026-10-05:7:none");
  });

  it("lists the rating groups with the helpful rate and QUEST means", async() => {
    renderAdminConsole(<AdminAiAnalyticsPage />);

    const row = (await screen.findByRole("rowheader", { name: "Chat libre" })).closest("tr") as HTMLElement;

    expect(within(row).getByText("85 %")).toBeInTheDocument();
    expect(within(row).getByText("4,2 (n = 18)")).toBeInTheDocument();
    expect(within(row).getByText("— (n = 0)")).toBeInTheDocument();
    expect(screen.getByTestId("helpful-chart")).toHaveTextContent("0.85");
  });

  it("sends the URL filters to both stats endpoints", async() => {
    router.query = { from: "2026-10-01", to: "2026-10-03", useCase: "FREE_CHAT", promptVersion: "1.0.0" };
    renderAdminConsole(<AdminAiAnalyticsPage />);

    await screen.findByText(AI_TOTALS_COPY.calls);
    expect(telemetryQueries[0]?.get("from")).toBe("2026-10-01T05:00:00.000Z");
    expect(telemetryQueries[0]?.get("to")).toBe("2026-10-04T05:00:00.000Z");
    expect(telemetryQueries[0]?.get("useCase")).toBe("FREE_CHAT");
    expect(telemetryQueries[0]?.has("promptVersion")).toBe(false);
    expect(ratingsQueries[0]?.get("promptVersion")).toBe("1.0.0");
  });

  it("sends nothing for a too long range and names the real maximum", async() => {
    router.query = { from: "2025-01-01", to: "2026-10-01" };
    renderAdminConsole(<AdminAiAnalyticsPage />);

    expect(await screen.findByText(`El rango puede cubrir como máximo ${AI_ANALYTICS_MAX_RANGE_DAYS} días.`)).toBeInTheDocument();
    expect(telemetryQueries).toHaveLength(0);
  });

  it("sends nothing for a reversed range and shows the error of a failing request", async() => {
    router.query = { from: "2026-10-05", to: "2026-10-01" };
    const view = renderAdminConsole(<AdminAiAnalyticsPage />);

    expect(await screen.findByText(DATE_RANGE_ERRORS.order)).toBeInTheDocument();
    expect(telemetryQueries).toHaveLength(0);
    view.unmount();

    router.query = {};
    telemetryStatus = 422;
    renderAdminConsole(<AdminAiAnalyticsPage />);

    expect(await screen.findByText(ADMIN_AI_COPY.telemetryError)).toBeInTheDocument();
  });
});
