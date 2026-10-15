/*
* Funcionalidad: GradingPendingBadgeSync tests
* Descripción: Verifies the pending-grading navigation badge feed against MSW: a teacher's count comes from `pagination.total` of a one-row queue page (limit=1), a zero total clears the badge, the count refreshes every 60 s, and students send no request. Depends on vitest, Testing Library, msw, the session context, the nav-badges registry and the grading badge sync and test helpers.
* Versión: 1.0
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
import { NavBadgeProvider, useNavBadgeCounts } from "@shared/layouts/nav-badges";
import type { Role } from "@shared/session/session.entity";
import { SessionContext } from "@shared/session/session-context";
import type { SessionContextValue } from "@shared/session/session-context";
import { apiUrl, envelope, queueItemDto, renderWithSwr } from "../pages/grading-test-helpers";
import { PENDING_COUNT_REFRESH_MS } from "../hooks/use-pending-grading-count";
import { GradingPendingBadgeSync } from "./lazy-grading-pending-badge-sync";

const server = setupServer();
let total: number;
let queueQueries: URLSearchParams[] = [];

function sessionValue(role: Role): SessionContextValue {
  return {
    status: "authenticated",
    user: { id: "u1", email: "laura@ventylab.demo", name: "Laura", image: null, role },
    role,
    permissions: [],
    error: null,
    hasRole: (...roles: Role[]) => roles.includes(role),
    hasPermission: () => false,
    establishSession: vi.fn(),
    signOut: vi.fn(() => Promise.resolve()),
    reloadSession: vi.fn(),
    handleRoleChanged: vi.fn(),
  };
}

function BadgeProbe() {
  const counts = useNavBadgeCounts();

  return <output aria-label="pendientes">{counts.gradingPending === undefined ? "sin insignia" : String(counts.gradingPending)}</output>;
}

function renderSync(role: Role) {
  return renderWithSwr(
    <SessionContext.Provider value={sessionValue(role)}>
      <NavBadgeProvider>
        <GradingPendingBadgeSync />
        <BadgeProbe />
      </NavBadgeProvider>
    </SessionContext.Provider>,
  );
}

beforeAll(() => {
  server.listen({ onUnhandledRequest: "error" });
});

beforeEach(() => {
  total = 7;
  queueQueries = [];
  server.use(
    http.get(apiUrl("/api/evaluation-grading/queue"), ({ request }) => {
      const params = new URL(request.url).searchParams;

      queueQueries.push(params);

      return HttpResponse.json(envelope(total > 0 ? [queueItemDto("a1")] : [], { total, pages: total, page: 1, limit: 1 }));
    }),
  );
});

afterEach(() => {
  server.resetHandlers();
  vi.useRealTimers();
});

afterAll(() => {
  server.close();
});

describe("GradingPendingBadgeSync", () => {
  it("feeds the badge with the queue total read from a one-row page", async() => {
    renderSync("TEACHER");

    await waitFor(() => {
      expect(screen.getByLabelText("pendientes")).toHaveTextContent("7");
    });
    expect(Object.fromEntries(queueQueries[0] ?? [])).toEqual({ page: "1", limit: "1" });
  });

  it("hides the badge when nothing is pending", async() => {
    total = 0;
    renderSync("ADMIN");

    await waitFor(() => {
      expect(queueQueries).toHaveLength(1);
    });
    expect(screen.getByLabelText("pendientes")).toHaveTextContent("sin insignia");
  });

  it("refreshes the count every 60 seconds", async() => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    renderSync("TEACHER");

    await waitFor(() => {
      expect(screen.getByLabelText("pendientes")).toHaveTextContent("7");
    });

    total = 3;
    await vi.advanceTimersByTimeAsync(PENDING_COUNT_REFRESH_MS + 100);

    await waitFor(() => {
      expect(screen.getByLabelText("pendientes")).toHaveTextContent("3");
    });
  });

  it("sends no request for students", async() => {
    renderSync("STUDENT");

    await new Promise((resolve) => {
      setTimeout(resolve, 50);
    });
    expect(queueQueries).toHaveLength(0);
    expect(screen.getByLabelText("pendientes")).toHaveTextContent("sin insignia");
  });
});
