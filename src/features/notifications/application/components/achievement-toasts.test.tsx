/*
* Funcionalidad: AchievementToasts tests
* Descripción: The app-shell achievement listener (W9, Bloque 2): for a student, `achievement:unlocked` shows "¡Logro desbloqueado! {title}" and revalidates the mounted gamification queries (stats and achievements are fetched again); in focus mode the notice toast is dropped (the revalidation still runs); a teacher gets no listener (no toast, no refetch). Depends on vitest, Testing Library, msw, the api-client query hook, the design-system focus mode and the notifications test helpers.
* Versión: 0.1
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

import { screen, waitFor } from "@testing-library/react";
import { http, HttpResponse } from "msw";
import { setupServer } from "msw/node";
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { useApiQuery } from "@shared/api-client/use-api-query";
import { useFocusMode } from "@shared/design-system/components/use-focus-mode";
import { apiUrl, createFakeSocket, envelope, renderNotifications } from "../pages/notifications-test-helpers";
import { ACHIEVEMENT_TOAST_COPY, AchievementToasts } from "./achievement-toasts";

vi.setConfig({ testTimeout: 20_000 });

const server = setupServer();
const counts = { gamification: 0, achievements: 0 };

const achievement = {
  id: "a1",
  code: "first_lesson",
  title: "Primer Paso",
  description: "Completa tu primera lección",
  icon: "🎯",
  unlockedAt: "2026-10-28T15:00:00.000Z",
  xpReward: 50,
};

// Stands for Inicio / Mi Progreso: keeps the gamification queries mounted.
function GamificationReader() {
  useApiQuery("/api/progress/gamification");
  useApiQuery("/api/progress/achievements");

  return null;
}

function FocusMode() {
  useFocusMode(true);

  return null;
}

beforeAll(() => {
  server.listen({ onUnhandledRequest: "error" });
});

beforeEach(() => {
  counts.gamification = 0;
  counts.achievements = 0;
  server.use(
    http.get(apiUrl("/api/progress/gamification"), () => {
      counts.gamification += 1;

      return HttpResponse.json(envelope({ xpTotal: 50, level: 1, xpIntoLevel: 50, nextLevelXp: 500, streakDays: 1, longestStreak: 1, xpToday: 50 }));
    }),
    http.get(apiUrl("/api/progress/achievements"), () => {
      counts.achievements += 1;

      return HttpResponse.json(envelope({ achievements: [achievement], totalUnlocked: 1 }));
    }),
  );
});

afterEach(() => {
  server.resetHandlers();
});

afterAll(() => {
  server.close();
});

describe("AchievementToasts", () => {
  it("shows the unlock toast and revalidates the gamification queries for a student", async() => {
    const socket = createFakeSocket();

    renderNotifications(<><AchievementToasts /><GamificationReader /></>, { socket });
    await waitFor(() => {
      expect(counts).toEqual({ gamification: 1, achievements: 1 });
    });

    socket.dispatch("achievement:unlocked", achievement);

    expect(await screen.findByText(ACHIEVEMENT_TOAST_COPY.unlocked("Primer Paso"))).toBeInTheDocument();
    expect(ACHIEVEMENT_TOAST_COPY.unlocked("Primer Paso")).toBe("¡Logro desbloqueado! Primer Paso");
    await waitFor(() => {
      expect(counts).toEqual({ gamification: 2, achievements: 2 });
    });
  });

  it("drops the toast in focus mode but still revalidates", async() => {
    const socket = createFakeSocket();

    renderNotifications(<><FocusMode /><AchievementToasts /><GamificationReader /></>, { socket });
    await waitFor(() => {
      expect(counts.gamification).toBe(1);
    });

    socket.dispatch("achievement:unlocked", achievement);

    await waitFor(() => {
      expect(counts.gamification).toBe(2);
    });
    expect(screen.queryByText(ACHIEVEMENT_TOAST_COPY.unlocked("Primer Paso"))).not.toBeInTheDocument();
  });

  it("does not listen for staff", async() => {
    const socket = createFakeSocket();

    renderNotifications(<><AchievementToasts /><GamificationReader /></>, { socket, role: "TEACHER" });
    await waitFor(() => {
      expect(counts.gamification).toBe(1);
    });

    socket.dispatch("achievement:unlocked", achievement);

    expect(screen.queryByText(ACHIEVEMENT_TOAST_COPY.unlocked("Primer Paso"))).not.toBeInTheDocument();
    expect(counts.gamification).toBe(1);
  });
});
