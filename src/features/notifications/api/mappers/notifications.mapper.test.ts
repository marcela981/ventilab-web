/*
* Funcionalidad: Notifications mapper tests
* Descripción: toAppNotification derives `read` from readAt and turns a null or non-object data into an empty object, toNotificationsPage takes the envelope pagination or falls back to one page, and toUnreadCount clamps a missing, negative or non-finite count to 0. Depends on vitest and the notifications mapper.
* Versión: 1.0
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

import { describe, expect, it } from "vitest";
import type { NotificationDTO } from "../dtos/notifications.dto";
import { toAppNotification, toNotificationsPage, toUnreadCount } from "./notifications.mapper";

function dto(overrides: Partial<NotificationDTO> = {}): NotificationDTO {
  return {
    id: "n1",
    type: "GRADE_PUBLISHED",
    title: "Calificación publicada",
    body: "Ya puedes consultar tu calificación.",
    data: { evaluationId: "ev-1", attemptId: "at-1" } as unknown as NotificationDTO["data"],
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

  it("turns a null or non-object data into an empty object", () => {
    expect(toAppNotification(dto({ data: null })).data).toEqual({});
    expect(toAppNotification(dto({ data: ["x"] as unknown as NotificationDTO["data"] })).data).toEqual({});
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
