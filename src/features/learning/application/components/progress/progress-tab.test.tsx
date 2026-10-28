/*
* Funcionalidad: ProgressTab tests
* Descripción: Mi Progreso tab of /learn (W9, Bloque 2): one request per endpoint (gamification, 12-week calendar with from/to, achievements, tree, progress summary); "Nivel {n}" with the server XP and the labelled level bar; "Racha consecutiva" with current and longest streak; the lazy calendar with an accessible focusable summary and an aria-label (date, activities, XP) per day; "Logros (n)" with the unlocked achievements and their date; "Hitos" and "Árbol de Habilidades" derived from the curriculum; the July empty state without progress; the retryable error when the stats fail and the stale warning (card hidden) when another read fails. Depends on vitest, Testing Library, msw, the learning test helpers and the activity calendar selectors.
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
import { formatDate } from "@shared/lib/format";
import { bogotaDate, calendarRange } from "../../entities/activity-calendar.entity";
import {
  apiUrl,
  envelope,
  errorResponse,
  progressItem,
  progressSummaryDto,
  renderWithSession,
  seededTreeDto,
} from "../../pages/learning-test-helpers";
import { PROGRESS_CARDS_COPY } from "./progress-cards";
import { PROGRESS_TAB_COPY, ProgressTab } from "./progress-tab";

type Schemas = components["schemas"];

vi.setConfig({ testTimeout: 20_000 });

const server = setupServer();

const statsDto = (overrides: Partial<Schemas["GamificationStatsDTO"]> = {}): Schemas["GamificationStatsDTO"] => ({
  xpTotal: 1250,
  level: 3,
  xpIntoLevel: 250,
  nextLevelXp: 1500,
  streakDays: 4,
  longestStreak: 9,
  xpToday: 75,
  ...overrides,
});

const achievementsDto = (): Schemas["AchievementsDTO"] => ({
  totalUnlocked: 2,
  achievements: [
    { id: "a2", code: "streak_3", title: "Constancia", description: "Tres días seguidos", icon: "🔥", unlockedAt: "2026-10-27T15:00:00.000Z", xpReward: 30 },
    { id: "a1", code: "first_lesson", title: "Primer Paso", description: null, icon: null, unlockedAt: "2026-10-20T15:00:00.000Z", xpReward: 50 },
  ],
});

const levelProgress = (levelId: string, percentage: number, completedLessons: number, totalLessons: number) => ({
  levelId, sectionId: null, completedModules: 0, totalModules: 0, ...progressItem(percentage, completedLessons, totalLessons),
});

const summaryDto = () => ({
  ...progressSummaryDto([
    levelProgress("level-prerequisitos", 100, 2, 2),
    levelProgress("level-beginner", 50, 3, 6),
  ]),
  ...progressItem(40, 5, 12),
});

type Reply<T> = T | "fail";

let stats: Reply<Schemas["GamificationStatsDTO"]>;
let achievements: Reply<Schemas["AchievementsDTO"]>;
let calendarDays: Reply<Schemas["ActivityDayDTO"][]>;
let summary: ReturnType<typeof summaryDto>;
let requests: string[];
let calendarQuery: URLSearchParams | null;

beforeAll(() => {
  server.listen({ onUnhandledRequest: "error" });
});

beforeEach(() => {
  stats = statsDto();
  achievements = achievementsDto();
  calendarDays = [{ date: bogotaDate(new Date()), count: 3, xp: 55 }];
  summary = summaryDto();
  requests = [];
  calendarQuery = null;
  const reply = <T,>(value: Reply<T>) => (value === "fail" ? errorResponse("internal_error", 500) : HttpResponse.json(envelope(value)));

  server.use(
    http.get(apiUrl("/api/progress/gamification"), () => {
      requests.push("gamification");

      return reply(stats);
    }),
    http.get(apiUrl("/api/progress/activity"), ({ request }) => {
      requests.push("calendar");
      calendarQuery = new URL(request.url).searchParams;

      return calendarDays === "fail" ? errorResponse("internal_error", 500) : HttpResponse.json(envelope({ days: calendarDays }));
    }),
    http.get(apiUrl("/api/progress/achievements"), () => {
      requests.push("achievements");

      return reply(achievements);
    }),
    http.get(apiUrl("/api/curriculum/tree"), () => {
      requests.push("tree");

      return HttpResponse.json(envelope(seededTreeDto()));
    }),
    http.get(apiUrl("/api/progress/summary"), () => {
      requests.push("summary");

      return HttpResponse.json(envelope(summary));
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

describe("ProgressTab", () => {
  it("shows level, streak, calendar, achievements, milestones and skill tree from one request each", async() => {
    renderWithSession(<ProgressTab />);

    expect(screen.getAllByRole("status", { name: PROGRESS_TAB_COPY.loading }).length).toBeGreaterThan(0);

    const level = await screen.findByRole("region", { name: PROGRESS_CARDS_COPY.level(3) });

    expect(within(level).getByText(PROGRESS_CARDS_COPY.xpTotal(1250))).toBeInTheDocument();
    expect(within(level).getByRole("progressbar", { name: PROGRESS_CARDS_COPY.levelAria(50) })).toHaveAttribute("aria-valuenow", "50");
    expect(within(level).getByText(PROGRESS_CARDS_COPY.levelSpan(250, 500, 4))).toBeInTheDocument();

    const streak = region(PROGRESS_CARDS_COPY.streakTitle);

    expect(within(streak).getByText("4 días")).toBeInTheDocument();
    expect(within(streak).getByText(PROGRESS_CARDS_COPY.streakActive)).toBeInTheDocument();
    expect(within(streak).getByText(PROGRESS_CARDS_COPY.longestStreak(9))).toBeInTheDocument();

    const logros = region(PROGRESS_CARDS_COPY.achievementsTitle(2));

    expect(within(logros).getByText("Constancia")).toBeInTheDocument();
    expect(within(logros).getByText(`${PROGRESS_CARDS_COPY.unlockedAt(formatDate("2026-10-27T15:00:00.000Z"))} · ${PROGRESS_CARDS_COPY.reward(30)}`)).toBeInTheDocument();
    expect(within(logros).getByText("Primer Paso")).toBeInTheDocument();

    const milestones = region(PROGRESS_CARDS_COPY.milestonesTitle);

    expect(within(milestones).getByRole("progressbar", { name: PROGRESS_CARDS_COPY.milestoneAria("Nivel Principiante") })).toHaveAttribute("aria-valuenow", "50");
    expect(within(milestones).getByText(PROGRESS_CARDS_COPY.milestoneAchieved)).toBeInTheDocument();

    const tree = region(PROGRESS_CARDS_COPY.skillTreeTitle);

    expect(within(tree).getByRole("region", { name: PROGRESS_TAB_COPY.branches.mecanica })).toBeInTheDocument();
    expect(within(tree).getByRole("progressbar", { name: PROGRESS_CARDS_COPY.skillAria("Nivel Intermedio") })).toHaveAttribute("aria-valuenow", "0");
    expect(within(tree).getAllByText(PROGRESS_CARDS_COPY.skillStates.locked).length).toBeGreaterThan(0);

    await screen.findByRole("region", { name: "Calendario de actividad" });
    expect([...requests].sort()).toEqual(["achievements", "calendar", "gamification", "summary", "tree"]);
    const range = calendarRange(bogotaDate(new Date()));

    expect(calendarQuery?.get("from")).toBe(range.from);
    expect(calendarQuery?.get("to")).toBe(range.to);
  });

  it("labels every past calendar day and exposes a keyboard-reachable summary", async() => {
    renderWithSession(<ProgressTab />);

    const calendar = await screen.findByRole("region", { name: "Calendario de actividad" });
    const group = within(calendar).getByRole("group", { name: "1 día con actividad en las últimas 12 semanas · 3 actividades" });

    expect(group).toHaveAttribute("tabindex", "0");
    const days = within(group).getAllByRole("img");

    expect(days.length).toBeGreaterThanOrEqual(78);
    expect(days.length).toBeLessThanOrEqual(84);
    expect(days.filter((day) => /: 3 actividades · 55 XP$/.test(day.getAttribute("aria-label") ?? ""))).toHaveLength(1);
    expect(days.every((day) => /^[a-záéíóúñ]+, \d{1,2} de [a-z]+ de \d{4}: /.test(day.getAttribute("aria-label") ?? ""))).toBe(true);
    expect(days.filter((day) => day.getAttribute("aria-label")?.endsWith("sin actividad"))).toHaveLength(days.length - 1);
  });

  it("shows the July empty state without XP, achievements or completed lessons", async() => {
    stats = statsDto({ xpTotal: 0, level: 1, xpIntoLevel: 0, nextLevelXp: 500, streakDays: 0, longestStreak: 0, xpToday: 0 });
    achievements = { achievements: [], totalUnlocked: 0 };
    summary = { ...progressSummaryDto(), ...progressItem(0, 0, 12) };
    renderWithSession(<ProgressTab />);

    expect(await screen.findByText(PROGRESS_TAB_COPY.emptyTitle)).toBeInTheDocument();
    expect(screen.getByText(PROGRESS_TAB_COPY.emptyDescription)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: PROGRESS_TAB_COPY.emptyAction })).toHaveAttribute("href", "/learn?tab=curriculo");
  });

  it("shows only the unlocked achievements with the July empty text when there are none", async() => {
    achievements = { achievements: [], totalUnlocked: 0 };
    renderWithSession(<ProgressTab />);

    const logros = await screen.findByRole("region", { name: PROGRESS_CARDS_COPY.achievementsTitle(0) });

    expect(within(logros).getByText(PROGRESS_CARDS_COPY.achievementsEmptyDescription)).toBeInTheDocument();
  });

  it("shows a retryable error when the stats fail", async() => {
    stats = "fail";
    renderWithSession(<ProgressTab />);

    expect(await screen.findByText(PROGRESS_TAB_COPY.loadErrorTitle)).toBeInTheDocument();

    stats = statsDto();
    fireEvent.click(screen.getByRole("button", { name: "Reintentar" }));

    expect(await screen.findByRole("region", { name: PROGRESS_CARDS_COPY.level(3) })).toBeInTheDocument();
  });

  it("warns and hides the card whose read failed", async() => {
    calendarDays = "fail";
    renderWithSession(<ProgressTab />);

    expect(await screen.findByText(new RegExp(PROGRESS_TAB_COPY.staleWarning))).toBeInTheDocument();
    expect(screen.getByRole("region", { name: PROGRESS_CARDS_COPY.level(3) })).toBeInTheDocument();
    await waitFor(() => {
      expect(screen.queryByRole("status", { name: PROGRESS_TAB_COPY.loadingCalendar })).not.toBeInTheDocument();
    });
    expect(screen.queryByRole("region", { name: "Calendario de actividad" })).not.toBeInTheDocument();
  });
});
