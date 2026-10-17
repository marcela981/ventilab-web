/*
* Funcionalidad: Notifications mapper tests
* Descripción: toAppNotification derives `read` from readAt and keeps the typed variant (a null data stays null, the type keeps narrowing it), toNotificationsPage takes the envelope pagination or falls back to one page, and toUnreadCount clamps a missing, negative or non-finite count to 0. Depends on vitest and the notifications mapper. v1.1 (B2 closure): fixtures typed by the discriminated union, no casts.
* Versión: 1.1
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

import { describe, expect, it } from "vitest";
import type { NotificationDTO } from "../dtos/notifications.dto";
import { toAppNotification, toNotificationsPage, toUnreadCount } from "./notifications.mapper";

type GradePublishedDTO = Extract<NotificationDTO, { type: "GRADE_PUBLISHED" }>;

function dto(overrides: Partial<GradePublishedDTO> = {}): GradePublishedDTO {
  return {
    id: "n1",
    type: "GRADE_PUBLISHED",
    title: "Calificación publicada",
    body: "Ya puedes consultar tu calificación.",
    data: { evaluationId: "ev-1", attemptId: "at-1" },
    readAt: null,
    createdAt: "2026-10-16T14:00:00.000Z",
    ...overrides,
  };
}

describe("toAppNotification", () => {
  it("maps an unread notification with its data", () => {
    expect(toAppNotification(dto())).toEqual({
      id: "n1",
      type: "GRADE_PUBLISHED",
      title: "Calificación publicada",
      body: "Ya puedes consultar tu calificación.",
      data: { evaluationId: "ev-1", attemptId: "at-1" },
      read: false,
      readAt: null,
      createdAt: "2026-10-16T14:00:00.000Z",
    });
  });

  it("marks a notification with readAt as read", () => {
    expect(toAppNotification(dto({ readAt: "2026-10-16T15:00:00.000Z" })).read).toBe(true);
  });

  it("keeps a null data and the type that narrows it", () => {
    const notification = toAppNotification(dto({ data: null }));

    expect(notification.data).toBeNull();
    expect(notification.type).toBe("GRADE_PUBLISHED");
  });

  it("keeps the typed data of another variant", () => {
    const notification = toAppNotification({ ...dto(), type: "RESERVATION_CANCELLED", data: { reservationId: "r1" } });

    expect(notification.type === "RESERVATION_CANCELLED" ? notification.data?.reservationId : null).toBe("r1");
  });
});

describe("toNotificationsPage", () => {
  it("takes the envelope pagination", () => {
    const page = toNotificationsPage([dto()], { total: 31, pages: 4, page: 2, limit: 10, next: null, previous: null } as never);

    expect(page).toMatchObject({ total: 31, pages: 4, page: 2 });
    expect(page.items).toHaveLength(1);
  });

  it("falls back to one page of the received items", () => {
    expect(toNotificationsPage([dto(), dto({ id: "n2" })], null)).toMatchObject({ total: 2, pages: 1, page: 1 });
  });
});

describe("toUnreadCount", () => {
  it("keeps a positive count and clamps anything else to 0", () => {
    expect(toUnreadCount({ count: 3 })).toBe(3);
    expect(toUnreadCount({ count: 0 })).toBe(0);
    expect(toUnreadCount({ count: -2 })).toBe(0);
    expect(toUnreadCount({ count: Number.NaN })).toBe(0);
    expect(toUnreadCount(null)).toBe(0);
    expect(toUnreadCount(undefined)).toBe(0);
  });
});
