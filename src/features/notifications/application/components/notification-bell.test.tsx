/*
* Funcionalidad: Notification bell tests
* Descripción: The bell entry renders nothing without a session; the bell menu shows the unread count in its accessible name and badge, opens the latest notifications on click, marks one as read and navigates to its deep link, only marks one without a link, marks all as read, refreshes the count on `notification:new`; NotificationToasts shows each `notification:new` title as a toast, dropped while focus mode is active. Depends on vitest, msw, Testing Library, next/router and next/link (mocked), the session context, the design-system focus mode and the notifications test helpers. v1.1 (B2 closure): the notification without a link is a typed GRADE_PUBLISHED with null data.
* Versión: 1.1
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

import { render, screen, waitFor, within, fireEvent } from "@testing-library/react";
import { http, HttpResponse } from "msw";
import { setupServer } from "msw/node";
import type { ReactNode } from "react";
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { useFocusMode } from "@shared/design-system/components/use-focus-mode";
import { SessionContext } from "@shared/session/session-context";
import type { SessionContextValue } from "@shared/session/session-context";
import type { NotificationDTO } from "../../api/dtos/notifications.dto";
import { apiUrl, createFakeSocket, envelope, notificationDto, renderNotifications } from "../pages/notifications-test-helpers";
import { NotificationBell } from "./notification-bell";
import { NOTIFICATION_BELL_COPY, NotificationBellMenu } from "./notification-bell-menu";
import { NotificationToasts } from "./notification-toasts";

const router = { push: vi.fn(() => Promise.resolve(true)) };

vi.mock("next/router", () => ({ useRouter: () => router }));
vi.mock("next/link", () => ({
  default: ({ href, children, ...rest }: { href: string, children: ReactNode }) => (
    <a href={href} {...rest}>
      {children}
    </a>
  ),
}));

const server = setupServer();
const NOW = new Date("2026-10-16T14:00:00.000Z");

vi.setConfig({ testTimeout: 20_000 });

let items: NotificationDTO[];
let unread: number;
let countRequests: number;
let listQueries: Record<string, string>[];
let patched: string[];

beforeAll(() => {
  server.listen({ onUnhandledRequest: "error" });
});

beforeEach(() => {
  router.push.mockClear();
  unread = 2;
  countRequests = 0;
  listQueries = [];
  patched = [];
  items = [
    notificationDto("n1"),
    notificationDto("n2", { title: "Aviso sin enlace", variant: { type: "GRADE_PUBLISHED", data: null } }),
  ];
  server.use(
    http.get(apiUrl("/api/notifications/unread-count"), () => {
      countRequests += 1;

      return HttpResponse.json(envelope({ count: unread }));
    }),
    http.get(apiUrl("/api/notifications"), ({ request }) => {
      listQueries.push(Object.fromEntries(new URL(request.url).searchParams));

      return HttpResponse.json(envelope(items, { total: items.length, pages: 1, page: 1, limit: 8 }));
    }),
    http.patch(apiUrl("/api/notifications/:id/read"), ({ params }) => {
      patched.push(String(params.id));

      return HttpResponse.json(envelope(items[0]));
    }),
    http.patch(apiUrl("/api/notifications/read-all"), () => {
      patched.push("all");
      unread = 0;

      return HttpResponse.json(envelope({ updated: 2 }));
    }),
  );
});

afterEach(() => {
  server.resetHandlers();
});

afterAll(() => {
  server.close();
});

async function openBell(): Promise<HTMLElement> {
  fireEvent.click(await screen.findByRole("button", { name: NOTIFICATION_BELL_COPY.labelWithUnread(2) }));

  return screen.findByRole("presentation");
}

describe("NotificationBell", () => {
  it("renders nothing without an authenticated session", () => {
    const anonymous = { status: "unauthenticated" } as unknown as SessionContextValue;
    const { container } = render(
      <SessionContext.Provider value={anonymous}>
        <NotificationBell />
      </SessionContext.Provider>,
    );

    expect(container).toBeEmptyDOMElement();
  });
});

describe("NotificationBellMenu", () => {
  it("shows the unread count and reads the latest notifications only when opened", async() => {
    renderNotifications(<NotificationBellMenu now={NOW} />);

    const button = await screen.findByRole("button", { name: NOTIFICATION_BELL_COPY.labelWithUnread(2) });

    expect(button).toHaveAttribute("aria-expanded", "false");
    expect(listQueries).toEqual([]);

    const popover = await openBell();

    expect(await within(popover).findByText("Calificación publicada n1")).toBeInTheDocument();
    expect(within(popover).getAllByText("hace 1 hora")).toHaveLength(2);
    expect(listQueries).toEqual([{ page: "1", limit: "8" }]);
    expect(within(popover).getByRole("link", { name: NOTIFICATION_BELL_COPY.viewAll })).toHaveAttribute("href", "/notifications");
  });

  it("marks a notification as read and then opens its deep link", async() => {
    renderNotifications(<NotificationBellMenu now={NOW} />);
    const popover = await openBell();

    fireEvent.click(await within(popover).findByText("Calificación publicada n1"));

    await waitFor(() => expect(router.push).toHaveBeenCalledWith("/evaluations/ev-1/attempts/at-n1/result"));
    expect(patched).toEqual(["n1"]);
  });

  it("only marks a notification without a deep link", async() => {
    renderNotifications(<NotificationBellMenu now={NOW} />);
    const popover = await openBell();

    fireEvent.click(await within(popover).findByText("Aviso sin enlace"));

    await waitFor(() => expect(patched).toEqual(["n2"]));
    expect(router.push).not.toHaveBeenCalled();
  });

  it("marks all as read", async() => {
    renderNotifications(<NotificationBellMenu now={NOW} />);
    const popover = await openBell();

    fireEvent.click(within(popover).getByRole("button", { name: NOTIFICATION_BELL_COPY.markAll }));

    await waitFor(() => expect(patched).toEqual(["all"]));
    // The open popover hides the rest of the page from the accessibility tree.
    expect(await screen.findByRole("button", { name: NOTIFICATION_BELL_COPY.label, hidden: true })).toBeInTheDocument();
  });

  it("refreshes the unread count on notification:new", async() => {
    const socket = createFakeSocket();

    renderNotifications(<NotificationBellMenu now={NOW} />, { socket });
    await screen.findByRole("button", { name: NOTIFICATION_BELL_COPY.labelWithUnread(2) });

    unread = 3;
    socket.dispatch("notification:new", notificationDto("n3"));

    expect(await screen.findByRole("button", { name: NOTIFICATION_BELL_COPY.labelWithUnread(3) })).toBeInTheDocument();
    expect(countRequests).toBeGreaterThanOrEqual(2);
  });
});

function FocusedScreen() {
  useFocusMode(true);

  return null;
}

describe("NotificationToasts", () => {
  it("shows the title of each new notification", async() => {
    const socket = createFakeSocket();

    renderNotifications(<NotificationToasts />, { socket });
    socket.dispatch("notification:new", notificationDto("n9", { title: "Nueva evaluación asignada" }));

    expect(await screen.findByRole("status")).toHaveTextContent("Nueva evaluación asignada");
  });

  it("drops the toast while focus mode is active", () => {
    const socket = createFakeSocket();

    renderNotifications(
      <>
        <NotificationToasts />
        <FocusedScreen />
      </>,
      { socket },
    );
    socket.dispatch("notification:new", notificationDto("n9", { title: "Nueva evaluación asignada" }));

    expect(screen.queryByText("Nueva evaluación asignada")).not.toBeInTheDocument();
  });
});
