/*
* Funcionalidad: HomeTab tests
* Descripción: Inicio tab of /learn (W8, Bloque 2): one request per endpoint (summary, gamification, recent activity); "Continuar donde quedaste" with the lesson, the API module percentage and the link to the module resolver; "XP Hoy" from the server stats; pending evaluations, unread notifications and the merged "Actividad Reciente" (ledger plus summary items, with server XP); every card hidden when its data is absent or empty, with the July empty state when none has data; skeletons while loading, a retryable error when nothing loads and a stale-data warning when one read fails. Depends on vitest, Testing Library, msw, the learning test helpers and the generated schema types.
* Versión: 0.1
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

import { fireEvent, screen, waitFor, within } from "@testing-library/react";
import { http, HttpResponse } from "msw";
import { setupServer } from "msw/node";
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import type { components } from "@shared/api-client/generated/schema";
import { apiUrl, envelope, errorResponse, renderWithSession } from "../../pages/learning-test-helpers";
import { HOME_TAB_COPY, HomeTab } from "./home-tab";
import { RECENT_ACTIVITY_COPY } from "./recent-activity-block";
import { XP_TODAY_COPY } from "./xp-today-card";

type Schemas = components["schemas"];

vi.setConfig({ testTimeout: 20_000 });

const NOW = new Date("2026-10-28T15:00:00.000Z");
const server = setupServer();

const emptyProgress = { id: null, title: null, percentage: 0, completedLessons: 0, totalLessons: 0, completed: false };

function summaryDto(overrides: Partial<Schemas["MySummaryDTO"]> = {}): Schemas["MySummaryDTO"] {
  return {
    progress: { overall: emptyProgress, sections: [] },
    continueLearning: { moduleId: "m1", moduleTitle: "Inversión fisiológica", lessonId: "l1", lessonTitle: "Ecuación del movimiento", percent: 40 },
    activeEvaluations: [{
      assignmentId: "as-1",
      evaluationId: "ev-1",
      evaluationTitle: "Parcial de ventilación",
      evaluationType: "EXAM",
      startsAt: "2026-10-27T13:00:00.000Z",
      endsAt: "2026-10-30T13:00:00.000Z",
    }],
    upcomingEvaluations: [],
    grades: [{
      attemptId: "at-1",
      evaluationId: "ev-3",
      evaluationTitle: "Taller de curvas",
      evaluationType: "WORKSHOP",
      attemptNumber: 1,
      grade: 4.2,
      passed: true,
      publishedAt: "2026-10-26T15:00:00.000Z",
      moduleId: null,
      moduleTitle: null,
    }],
    latestNotes: [],
    latestConversations: [{ id: "c1", title: "Dudas sobre compliance", scope: "LESSON", refId: "l1", updatedAt: "2026-10-28T12:00:00.000Z" }],
    latestSimulationSessions: [],
    upcomingReservations: [],
    unreadNotifications: 3,
    ...overrides,
  };
}

const statsDto = (overrides: Partial<Schemas["GamificationStatsDTO"]> = {}): Schemas["GamificationStatsDTO"] => ({
  xpTotal: 1250,
  level: 3,
  xpIntoLevel: 250,
  nextLevelXp: 1500,
  streakDays: 4,
  longestStreak: 6,
  xpToday: 75,
  ...overrides,
});

const recentDto = (): Schemas["RecentActivityItemDTO"][] => [
  { id: "e1", kind: "LESSON_COMPLETED", refId: "l9", xp: 50, occurredAt: "2026-10-28T14:00:00.000Z", title: "Presión positiva" },
  { id: "e2", kind: "EVALUATION_PASSED", refId: "ev-3", xp: 100, occurredAt: "2026-10-26T15:00:00.000Z", title: "Taller de curvas" },
];

let summary: Schemas["MySummaryDTO"] | "fail";
let stats: Schemas["GamificationStatsDTO"] | "fail";
let recent: Schemas["RecentActivityItemDTO"][] | "fail";
let counts: { summary: number, gamification: number, recent: number };

beforeAll(() => {
  server.listen({ onUnhandledRequest: "error" });
});

beforeEach(() => {
  summary = summaryDto();
  stats = statsDto();
  recent = recentDto();
  counts = { summary: 0, gamification: 0, recent: 0 };
  server.use(
    http.get(apiUrl("/api/me/summary"), () => {
      counts.summary += 1;

      return summary === "fail" ? errorResponse("internal_error", 500) : HttpResponse.json(envelope(summary));
    }),
    http.get(apiUrl("/api/progress/gamification"), () => {
      counts.gamification += 1;

      return stats === "fail" ? errorResponse("internal_error", 500) : HttpResponse.json(envelope(stats));
    }),
    http.get(apiUrl("/api/progress/activity/recent"), ({ request }) => {
      counts.recent += 1;
      expect(new URL(request.url).searchParams.get("limit")).toBe("10");

      return recent === "fail" ? errorResponse("internal_error", 500) : HttpResponse.json(envelope(recent));
    }),
  );
});

afterEach(() => {
  server.resetHandlers();
});

afterAll(() => {
  server.close();
});

const region = (name: string) => screen.getByRole("region", { name });

describe("HomeTab", () => {
  it("shows skeletons first, then every card with real data from one request per endpoint", async() => {
    renderWithSession(<HomeTab now={NOW} />);

    expect(screen.getAllByRole("status", { name: HOME_TAB_COPY.loading }).length).toBeGreaterThan(0);

    const resume = await screen.findByRole("region", { name: "Continuar donde quedaste" });

    expect(within(resume).getByText("Ecuación del movimiento")).toBeInTheDocument();
    expect(within(resume).getByRole("progressbar", { name: "Progreso del módulo Inversión fisiológica" })).toHaveAttribute("aria-valuenow", "40");
    expect(within(resume).getByRole("link", { name: "Continuar con la lección Ecuación del movimiento" })).toHaveAttribute("href", "/learn/modules/m1");

    const xp = region(XP_TODAY_COPY.title);

    expect(within(xp).getByText(XP_TODAY_COPY.value(75))).toBeInTheDocument();
    expect(within(xp).getByText(XP_TODAY_COPY.level(3, 1250))).toBeInTheDocument();

    expect(within(region(HOME_TAB_COPY.evaluationsTitle)).getByRole("link", { name: "Parcial de ventilación" })).toHaveAttribute("href", "/evaluations/ev-1");
    expect(within(region("Notificaciones")).getByText("3")).toBeInTheDocument();

    const activity = region(RECENT_ACTIVITY_COPY.title);
    const rows = within(activity).getAllByRole("listitem");

    // Newest first; the passed-evaluation fact is dropped in favour of the grade (same evaluation).
    expect(rows.map((row) => row.getAttribute("data-activity-kind"))).toEqual(["LESSON_COMPLETED", "CONVERSATION", "GRADE"]);
    expect(within(rows[0] as HTMLElement).getByText(/\+50 XP/)).toBeInTheDocument();
    expect(within(activity).getByRole("link", { name: "Taller de curvas" })).toHaveAttribute("href", "/evaluations/ev-3/attempts/at-1/result");

    expect(counts).toEqual({ summary: 1, gamification: 1, recent: 1 });
    expect(screen.queryByText(/Plan Semanal/)).not.toBeInTheDocument();
    expect(screen.queryByText(/Reto del Día/)).not.toBeInTheDocument();
  });

  it("hides each card whose data is absent or empty", async() => {
    summary = summaryDto({ continueLearning: null, activeEvaluations: [], upcomingEvaluations: [], unreadNotifications: 0 });
    renderWithSession(<HomeTab now={NOW} />);

    expect(await screen.findByRole("region", { name: XP_TODAY_COPY.title })).toBeInTheDocument();
    expect(screen.getByRole("region", { name: RECENT_ACTIVITY_COPY.title })).toBeInTheDocument();
    expect(screen.queryByRole("region", { name: "Continuar donde quedaste" })).not.toBeInTheDocument();
    expect(screen.queryByRole("region", { name: HOME_TAB_COPY.evaluationsTitle })).not.toBeInTheDocument();
    expect(screen.queryByRole("region", { name: "Notificaciones" })).not.toBeInTheDocument();
    expect(screen.queryByText(HOME_TAB_COPY.emptyTitle)).not.toBeInTheDocument();
  });

  it("shows the July empty state when no card has data", async() => {
    summary = summaryDto({
      continueLearning: null,
      activeEvaluations: [],
      grades: [],
      latestConversations: [],
      unreadNotifications: 0,
    });
    stats = "fail";
    recent = [];
    renderWithSession(<HomeTab now={NOW} />);

    expect(await screen.findByText(HOME_TAB_COPY.emptyTitle)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: HOME_TAB_COPY.emptyAction })).toHaveAttribute("href", "/learn?tab=curriculo");
    expect(screen.queryByRole("region")).not.toBeInTheDocument();
  });

  it("warns over shown data when one read fails and retries every read", async() => {
    recent = "fail";
    renderWithSession(<HomeTab now={NOW} />);

    expect(await screen.findByText(new RegExp(HOME_TAB_COPY.staleWarning))).toBeInTheDocument();
    expect(screen.getByRole("region", { name: "Continuar donde quedaste" })).toBeInTheDocument();

    recent = recentDto();
    fireEvent.click(screen.getByRole("button", { name: HOME_TAB_COPY.retry }));

    await waitFor(() => {
      expect(screen.queryByText(new RegExp(HOME_TAB_COPY.staleWarning))).not.toBeInTheDocument();
    });
    expect(counts.recent).toBe(2);
  });

  it("shows a retryable error when nothing could be read", async() => {
    summary = "fail";
    stats = "fail";
    recent = "fail";
    renderWithSession(<HomeTab now={NOW} />);

    expect(await screen.findByText(HOME_TAB_COPY.loadErrorTitle)).toBeInTheDocument();

    summary = summaryDto();
    stats = statsDto();
    recent = recentDto();
    fireEvent.click(screen.getByRole("button", { name: "Reintentar" }));

    expect(await screen.findByRole("region", { name: "Continuar donde quedaste" })).toBeInTheDocument();
  });
});
