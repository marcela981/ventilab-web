/*
* Funcionalidad: useGroupCards
* Descripción: Data of the summary cards of /teacher for one group, each card with its own state: attempts waiting for review (`GET /api/evaluation-grading/queue/count?groupId` → `{ pending }`), active evaluations (`GET /api/evaluation-assignments?groupId&state=ACTIVE`, first 5 rows and the envelope total) and upcoming ventilator reservations held by the group (`GET /api/reservations?from=now&to=now+30d&groupId`; the SCHEDULED rows are kept, soonest first). The reservations window is fixed when the hook mounts. v1.1 (O3 review): the queue and assignments queries turn keepPreviousData off, so the cards never show another group's counts. v1.2 (closure B2): the pending count comes from the count endpoint (no one-row queue page read for its pagination total) and the calendar is filtered by group on the server (no client filter by groupId), with keepPreviousData off. Depends on React, @shared/api-client and the teacher dashboard mapper, service and entities.
* Versión: 1.2
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

import { useMemo, useState } from "react";
import type { ApiError } from "@shared/api-client/api-error";
import { useApiQuery } from "@shared/api-client/use-api-query";
import { toActiveAssignments, toGroupReservations } from "../../api/mappers/teacher-dashboard.mapper";
import { ASSIGNMENTS_PATH, GRADING_QUEUE_COUNT_PATH, RESERVATIONS_PATH } from "../../api/services/teacher-dashboard.service";
import { selectScheduledReservations } from "../entities/teacher-dashboard.entity";
import type { ActiveAssignment, GroupReservation } from "../entities/teacher-dashboard.entity";

export type CardState<T> = {
  value: T | null
  isLoading: boolean
  error: ApiError | null
};

export type GroupCards = {
  pendingGrading: CardState<number>
  activeEvaluations: CardState<{ total: number | null, items: ActiveAssignment[] }>
  reservations: CardState<GroupReservation[]>
};

export const ACTIVE_EVALUATIONS_SHOWN = 5;
const RESERVATIONS_WINDOW_DAYS = 30;
const DAY_MS = 24 * 60 * 60 * 1000;
/** The cards never show another group's data while the selected group loads (the app default keeps previous data). */
const NO_PREVIOUS_DATA = { keepPreviousData: false } as const;

function reservationsWindow(): { from: string, to: string } {
  const now = Date.now();

  return { from: new Date(now).toISOString(), to: new Date(now + RESERVATIONS_WINDOW_DAYS * DAY_MS).toISOString() };
}

export function useGroupCards(groupId: string | null): GroupCards {
  const [reservationRange] = useState(reservationsWindow);
  const count = useApiQuery(groupId ? GRADING_QUEUE_COUNT_PATH : null, { query: { groupId: groupId ?? "" } }, NO_PREVIOUS_DATA);
  const assignments = useApiQuery(
    groupId ? ASSIGNMENTS_PATH : null,
    { query: { groupId: groupId ?? "", state: "ACTIVE", limit: ACTIVE_EVALUATIONS_SHOWN, sortOrder: "asc" } },
    NO_PREVIOUS_DATA,
  );
  const calendar = useApiQuery(
    groupId ? RESERVATIONS_PATH : null,
    { query: { ...reservationRange, groupId: groupId ?? "" } },
    NO_PREVIOUS_DATA,
  );

  const pendingTotal = count.data?.data.pending ?? null;
  const activeEvaluations = useMemo(() => {
    if (!assignments.data) {
      return null;
    }

    const items = toActiveAssignments(assignments.data.data);

    return { total: assignments.data.pagination?.total ?? null, items };
  }, [assignments.data]);
  const reservations = useMemo(
    () => (calendar.data ? selectScheduledReservations(toGroupReservations(calendar.data.data)) : null),
    [calendar.data],
  );

  return {
    pendingGrading: { value: pendingTotal, isLoading: count.isLoading, error: count.error ?? null },
    activeEvaluations: { value: activeEvaluations, isLoading: assignments.isLoading, error: assignments.error ?? null },
    reservations: { value: reservations, isLoading: calendar.isLoading, error: calendar.error ?? null },
  };
}
