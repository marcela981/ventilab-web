/*
* Funcionalidad: Notifications page tests
* Descripción: /notifications with msw: the first page with its relative times and unread marks, pagination with the envelope total, the "Solo no leídas" toggle (unreadOnly query and its empty state), opening a notification marks it as read and navigates to its deep link, "Marcar como leída", "Eliminar" behind the confirmation, "Marcar todas como leídas" with its confirmation toast, the empty state, the load error with retry and a failed action as an error toast. v1.1 (O1 review): the page refreshes its list on `notification:new` without the bell. Depends on vitest, msw, Testing Library, next/router (mocked) and the notifications test helpers.
* Versión: 1.1
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
import type { NotificationDTO } from "../../api/dtos/notifications.dto";
import { NOTIFICATIONS_ERROR_MESSAGES } from "../entities/notifications-error-messages";
import { apiUrl, createFakeSocket, envelope, errorResponse, notificationDto, renderNotifications } from "./notifications-test-helpers";
import { NOTIFICATIONS_PAGE_COPY, NotificationsPage } from "./notifications.page";

const router = { push: vi.fn(() => Promise.resolve(true)) };

vi.mock("next/router", () => ({ useRouter: () => router }));

const server = setupServer();
const NOW = new Date("2026-10-16T14:00:00.000Z");

vi.setConfig({ testTimeout: 20_000 });

let items: NotificationDTO[];
let total: number;
let unread: number;
let listQueries: Record<string, string>[];
let failList: boolean;
let patched: string[];
let deleted: string[];

beforeAll(() => {
  server.listen({ onUnhandledRequest: "error" });
});

beforeEach(() => {
  router.push.mockClear();
  listQueries = [];
  patched = [];
  deleted = [];
  failList = false;
  unread = 1;
  items = [
    notificationDto("n1"),
    notificationDto("n2", {
      type: "ROLE_CHANGED",
      title: "Tu rol cambió",
      body: "Tu rol en VentyLab ahora es Docente.",
      data: null,
      readAt: "2026-10-15T10:00:00.000Z",
      createdAt: "2026-10-14T14:00:00.000Z",
    }),
  ];
  total = 2;
  server.use(
    http.get(apiUrl("/api/notifications"), ({ request }) => {
      const params = Object.fromEntries(new URL(request.url).searchParams);
      const limit = Number(params.limit ?? 10);

      listQueries.push(params);

      if (failList) {
        return errorResponse("internal_error", 500);
      }

      const rows = params.unreadOnly === "true" ? items.filter((item) => item.readAt === null) : items;

      return HttpResponse.json(envelope(rows, { total: params.unreadOnly === "true" ? rows.length : total, pages: Math.max(1, Math.ceil(total / limit)), page: Number(params.page ?? 1), limit }));
    }),
    http.get(apiUrl("/api/notifications/unread-count"), () => HttpResponse.json(envelope({ count: unread }))),
    http.patch(apiUrl("/api/notifications/:id/read"), ({ params }) => {
      const id = String(params.id);

      patched.push(id);
      items = items.map((item) => (item.id === id ? { ...item, readAt: "2026-10-16T14:00:00.000Z" } : item));

      return HttpResponse.json(envelope(items.find((item) => item.id === id)));
    }),
    http.patch(apiUrl("/api/notifications/read-all"), () => {
      patched.push("all");
      items = items.map((item) => ({ ...item, readAt: item.readAt ?? "2026-10-16T14:00:00.000Z" }));
      unread = 0;

      return HttpResponse.json(envelope({ updated: 1 }));
    }),
    http.delete(apiUrl("/api/notifications/:id"), ({ params }) => {
      deleted.push(String(params.id));
      items = items.filter((item) => item.id !== params.id);
      total = items.length;

      return HttpResponse.json(envelope(null));
    }),
  );
});

afterEach(() => {
  server.resetHandlers();
});

afterAll(() => {
  server.close();
});

async function rows(): Promise<HTMLElement[]> {
  await screen.findByText("Calificación publicada n1");

  return screen.getAllByRole("listitem");
}

describe("NotificationsPage", () => {
  it("lists the notifications with relative times, unread marks and the envelope pagination", async() => {
    total = 12;
    renderNotifications(<NotificationsPage now={NOW} />);

    const [first, second] = await rows();

    expect(within(first as HTMLElement).getByText("Sin leer:")).toBeInTheDocument();
    expect(within(first as HTMLElement).getByText("hace 1 hora")).toBeInTheDocument();
    expect(within(second as HTMLElement).queryByText("Sin leer:")).not.toBeInTheDocument();
    expect(screen.getByText("1–10 de 12")).toBeInTheDocument();
    expect(listQueries[0]).toEqual({ page: "1", limit: "10" });

    fireEvent.click(screen.getByRole("button", { name: "Página siguiente" }));
    await waitFor(() => expect(listQueries.at(-1)).toEqual({ page: "2", limit: "10" }));
  });

  it("filters unread only and shows its empty state", async() => {
    renderNotifications(<NotificationsPage now={NOW} />);
    await rows();

    fireEvent.click(screen.getByRole("switch", { name: NOTIFICATIONS_PAGE_COPY.unreadOnly }));
    await waitFor(() => expect(listQueries.at(-1)).toEqual({ page: "1", limit: "10", unreadOnly: "true" }));
    await waitFor(() => expect(screen.queryByText("Tu rol cambió")).not.toBeInTheDocument());

    items = items.map((item) => ({ ...item, readAt: "2026-10-16T14:00:00.000Z" }));
    fireEvent.click(screen.getByRole("button", { name: NOTIFICATIONS_PAGE_COPY.markRead }));
    expect(await screen.findByText(NOTIFICATIONS_PAGE_COPY.emptyUnreadTitle)).toBeInTheDocument();
  });

  it("marks a notification as read before opening its deep link", async() => {
    renderNotifications(<NotificationsPage now={NOW} />);
    await rows();

    fireEvent.click(screen.getByRole("button", { name: NOTIFICATIONS_PAGE_COPY.open("Calificación publicada n1") }));

    await waitFor(() => expect(router.push).toHaveBeenCalledWith("/evaluations/ev-1/attempts/at-n1/result"));
    expect(patched).toEqual(["n1"]);
  });

  it("does not mark an already read notification when opening it", async() => {
    renderNotifications(<NotificationsPage now={NOW} />);
    await rows();

    fireEvent.click(screen.getByRole("button", { name: NOTIFICATIONS_PAGE_COPY.open("Tu rol cambió") }));

    await waitFor(() => expect(router.push).toHaveBeenCalledWith("/profile"));
    expect(patched).toEqual([]);
  });

  it("marks one notification as read", async() => {
    renderNotifications(<NotificationsPage now={NOW} />);
    const [first] = await rows();

    fireEvent.click(within(first as HTMLElement).getByRole("button", { name: NOTIFICATIONS_PAGE_COPY.markRead }));

    await waitFor(() => expect(patched).toEqual(["n1"]));
    await waitFor(() => expect(screen.queryByText("Sin leer:")).not.toBeInTheDocument());
  });

  it("deletes a notification after the confirmation", async() => {
    renderNotifications(<NotificationsPage now={NOW} />);
    const [, second] = await rows();

    fireEvent.click(within(second as HTMLElement).getByRole("button", { name: NOTIFICATIONS_PAGE_COPY.remove }));
    const dialog = await screen.findByRole("dialog");

    expect(dialog).toHaveTextContent("Tu rol cambió");
    fireEvent.click(within(dialog).getByRole("button", { name: NOTIFICATIONS_PAGE_COPY.deleteConfirm }));

    await waitFor(() => expect(deleted).toEqual(["n2"]));
    expect(await screen.findByText(NOTIFICATIONS_PAGE_COPY.deleted)).toBeInTheDocument();
    await waitFor(() => expect(screen.queryByText("Tu rol cambió")).not.toBeInTheDocument());
  });

  it("marks all as read and confirms it", async() => {
    renderNotifications(<NotificationsPage now={NOW} />);
    await rows();

    const button = screen.getByRole("button", { name: NOTIFICATIONS_PAGE_COPY.markAll });

    await waitFor(() => expect(button).toBeEnabled());
    fireEvent.click(button);

    expect(await screen.findByText(NOTIFICATIONS_PAGE_COPY.markAllDone)).toBeInTheDocument();
    expect(patched).toEqual(["all"]);
    await waitFor(() => expect(button).toBeDisabled());
  });

  it("refreshes the list on notification:new without the bell", async() => {
    const socket = createFakeSocket();

    renderNotifications(<NotificationsPage now={NOW} />, { socket });
    await rows();

    items = [notificationDto("n3"), ...items];
    total = items.length;
    socket.dispatch("notification:new", notificationDto("n3"));

    expect(await screen.findByText("Calificación publicada n3")).toBeInTheDocument();
  });

  it("shows the empty state", async() => {
    items = [];
    total = 0;
    unread = 0;
    renderNotifications(<NotificationsPage now={NOW} />);

    expect(await screen.findByText(NOTIFICATIONS_PAGE_COPY.emptyTitle)).toBeInTheDocument();
  });

  it("shows a retryable load error", async() => {
    failList = true;
    renderNotifications(<NotificationsPage now={NOW} />);

    expect(await screen.findByText(NOTIFICATIONS_PAGE_COPY.loadErrorTitle)).toBeInTheDocument();

    failList = false;
    fireEvent.click(screen.getByRole("button", { name: "Reintentar" }));
    expect(await screen.findByText("Calificación publicada n1")).toBeInTheDocument();
  });

  it("shows a failed action as an error toast", async() => {
    server.use(http.delete(apiUrl("/api/notifications/:id"), () => errorResponse("notifications.not_found", 404)));
    renderNotifications(<NotificationsPage now={NOW} />);
    const [first] = await rows();

    fireEvent.click(within(first as HTMLElement).getByRole("button", { name: NOTIFICATIONS_PAGE_COPY.remove }));
    fireEvent.click(within(await screen.findByRole("dialog")).getByRole("button", { name: NOTIFICATIONS_PAGE_COPY.deleteConfirm }));

    expect(await screen.findByRole("alert")).toHaveTextContent(NOTIFICATIONS_ERROR_MESSAGES["notifications.not_found"]);
  });
});
