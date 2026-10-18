/*
* Funcionalidad: GradingPendingBadgeSync tests
* Descripción: Verifies the pending-grading navigation badge feed against MSW: a teacher's count comes from `pagination.total` of a one-row queue page (limit=1), a zero total clears the badge, the count refreshes every 120 s, and students send no request. Depends on vitest, Testing Library, msw, the session context, the nav-badges registry and the grading badge sync and test helpers. v1.1 (G1 review W2/S3/S4/S5): the sync polls only while a badge host (AppShell) is mounted; the zero case flips a shown badge (7) to none; the student case asserts after the loader chunk resolves; a session that turns into a student or signs out clears the badge; a render error of the loader renders nothing. v1.2 (closure B2): the count is `pending` of `GET /api/evaluation-grading/queue/count` and no queue page is read for its pagination total.
* Versión: 1.2
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

import { act, render, screen, waitFor } from "@testing-library/react";
import { http, HttpResponse } from "msw";
import { setupServer } from "msw/node";
import type { ReactElement } from "react";
import { SWRConfig } from "swr";
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { NavBadgeProvider, useNavBadgeCounts, useNavBadgeHost } from "@shared/layouts/nav-badges";
import type { Role } from "@shared/session/session.entity";
import { SessionContext } from "@shared/session/session-context";
import type { SessionContextValue } from "@shared/session/session-context";
import { apiUrl, envelope } from "../pages/grading-test-helpers";
import { PENDING_COUNT_REFRESH_MS } from "../hooks/use-pending-grading-count";
import { BadgeErrorBoundary, GradingPendingBadgeSync } from "./lazy-grading-pending-badge-sync";

const server = setupServer();
let total: number;
let queueQueries: URLSearchParams[] = [];
let queuePageReads = 0;

type Viewer = Role | "ANONYMOUS";

function sessionValue(viewer: Viewer): SessionContextValue {
  const role = viewer === "ANONYMOUS" ? null : viewer;

  return {
    status: role ? "authenticated" : "unauthenticated",
    user: role ? { id: "u1", email: "laura@ventylab.demo", name: "Laura", image: null, role } : null,
    role,
    permissions: [],
    error: null,
    hasRole: (...roles: Role[]) => role !== null && roles.includes(role),
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

// Stands in for the AppShell, which registers itself as the badge host.
function BadgeHost() {
  useNavBadgeHost();

  return null;
}

// The SWR cache lives outside the tree so a rerender keeps it.
function tree(viewer: Viewer, withHost: boolean, cache: Map<string, unknown>): ReactElement {
  return (
    <SWRConfig value={{ provider: () => cache as never, dedupingInterval: 0, shouldRetryOnError: false }}>
      <SessionContext.Provider value={sessionValue(viewer)}>
        <NavBadgeProvider>
          <GradingPendingBadgeSync />
          {withHost ? <BadgeHost /> : null}
          <BadgeProbe />
        </NavBadgeProvider>
      </SessionContext.Provider>
    </SWRConfig>
  );
}

function renderSync(viewer: Viewer, withHost = true) {
  const cache = new Map<string, unknown>();
  const view = render(tree(viewer, withHost, cache));

  return { ...view, rerenderAs: (next: Viewer, nextHost = withHost) => view.rerender(tree(next, nextHost, cache)) };
}

// Resolves the lazy loader chunk and flushes React, so "no request" assertions are not timing-based.
async function settleLazyChunk() {
  await import("./grading-pending-badge-loader");
  await act(async() => {
    await Promise.resolve();
  });
}

const badge = () => screen.getByLabelText("pendientes");

beforeAll(() => {
  server.listen({ onUnhandledRequest: "error" });
});

beforeEach(() => {
  total = 7;
  queueQueries = [];
  queuePageReads = 0;
  server.use(
    http.get(apiUrl("/api/evaluation-grading/queue/count"), ({ request }) => {
      queueQueries.push(new URL(request.url).searchParams);

      return HttpResponse.json(envelope({ pending: total }));
    }),
    // The badge never reads a queue page for its pagination total.
    http.get(apiUrl("/api/evaluation-grading/queue"), () => {
      queuePageReads += 1;

      return HttpResponse.json(envelope([]));
    }),
  );
});

afterEach(() => {
  server.resetHandlers();
  vi.useRealTimers();
  vi.restoreAllMocks();
});

afterAll(() => {
  server.close();
});

describe("GradingPendingBadgeSync", () => {
  it("feeds the badge with the pending count of the count endpoint", async() => {
    renderSync("TEACHER");

    await waitFor(() => expect(badge()).toHaveTextContent("7"));
    expect(Object.fromEntries(queueQueries[0] ?? [])).toEqual({});
    expect(queuePageReads).toBe(0);
  });

  it("does not poll while no badge host (AppShell) is mounted", async() => {
    const { rerenderAs } = renderSync("TEACHER", false);

    await settleLazyChunk();
    expect(queueQueries).toHaveLength(0);
    expect(badge()).toHaveTextContent("sin insignia");

    rerenderAs("TEACHER", true);
    await waitFor(() => expect(badge()).toHaveTextContent("7"));
  });

  it("refreshes every 120 seconds and hides the badge when the total drops to zero", async() => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    renderSync("ADMIN");

    await waitFor(() => expect(badge()).toHaveTextContent("7"));

    total = 3;
    await vi.advanceTimersByTimeAsync(PENDING_COUNT_REFRESH_MS + 100);
    await waitFor(() => expect(badge()).toHaveTextContent("3"));

    total = 0;
    await vi.advanceTimersByTimeAsync(PENDING_COUNT_REFRESH_MS + 100);
    await waitFor(() => expect(badge()).toHaveTextContent("sin insignia"));
  });

  it("sends no request for students", async() => {
    renderSync("STUDENT");

    await settleLazyChunk();
    expect(queueQueries).toHaveLength(0);
    expect(badge()).toHaveTextContent("sin insignia");
  });

  it("clears the badge when the teacher becomes a student", async() => {
    const { rerenderAs } = renderSync("TEACHER");

    await waitFor(() => expect(badge()).toHaveTextContent("7"));
    rerenderAs("STUDENT");

    await waitFor(() => expect(badge()).toHaveTextContent("sin insignia"));
  });

  it("clears the badge when the session signs out", async() => {
    const { rerenderAs } = renderSync("TEACHER");

    await waitFor(() => expect(badge()).toHaveTextContent("7"));
    rerenderAs("ANONYMOUS");

    await waitFor(() => expect(badge()).toHaveTextContent("sin insignia"));
  });
});

describe("BadgeErrorBoundary", () => {
  function Broken(): null {
    throw new Error("badge failed");
  }

  it("renders nothing when the badge fails to render", () => {
    vi.spyOn(console, "error").mockImplementation(() => undefined);

    const { container } = render(
      <div>
        <BadgeErrorBoundary>
          <Broken />
        </BadgeErrorBoundary>
        <p>Contenido</p>
      </div>,
    );

    expect(screen.getByText("Contenido")).toBeInTheDocument();
    expect(container.querySelectorAll("p")).toHaveLength(1);
  });
});
