/*
* Funcionalidad: useGroupCards
* Descripción: Data of the summary cards of /teacher for one group, each card with its own state: attempts waiting for review (`GET /api/evaluation-grading/queue?groupId&limit=1`, the count is the envelope `pagination.total`; there is no count endpoint), active evaluations (`GET /api/evaluation-assignments?groupId&state=ACTIVE`, first 5 rows and the envelope total) and upcoming ventilator reservations of the group (`GET /api/reservations?from=now&to=now+30d` calendar, the rows of the group with SCHEDULED status are selected on the client because the calendar has no groupId filter: BACKEND GAP). The reservations window is fixed when the hook mounts. Depends on React, @shared/api-client and the teacher dashboard mapper, service and entities.
* Versión: 1.0
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
import { ASSIGNMENTS_PATH, GRADING_QUEUE_PATH, RESERVATIONS_PATH } from "../../api/services/teacher-dashboard.service";
import { selectGroupReservations } from "../entities/teacher-dashboard.entity";
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

function reservationsWindow(): { from: string, to: string } {
  const now = Date.now();

  return { from: new Date(now).toISOString(), to: new Date(now + RESERVATIONS_WINDOW_DAYS * DAY_MS).toISOString() };
}

export function useGroupCards(groupId: string | null): GroupCards {
  const [reservationRange] = useState(reservationsWindow);
  const queue = useApiQuery(groupId ? GRADING_QUEUE_PATH : null, { query: { groupId: groupId ?? "", limit: 1 } });
  const assignments = useApiQuery(
    groupId ? ASSIGNMENTS_PATH : null,
    { query: { groupId: groupId ?? "", state: "ACTIVE", limit: ACTIVE_EVALUATIONS_SHOWN, sortOrder: "asc" } },
  );
  const calendar = useApiQuery(groupId ? RESERVATIONS_PATH : null, { query: reservationRange });

  const pendingTotal = queue.data?.pagination?.total ?? null;
  const activeEvaluations = useMemo(() => {
    if (!assignments.data) {
      return null;
    }

    const items = toActiveAssignments(assignments.data.data);

    return { total: assignments.data.pagination?.total ?? null, items };
  }, [assignments.data]);
  const reservations = useMemo(
    () => (calendar.data && groupId ? selectGroupReservations(toGroupReservations(calendar.data.data), groupId) : null),
    [calendar.data, groupId],
  );

  return {
    pendingGrading: { value: pendingTotal, isLoading: queue.isLoading, error: queue.error ?? null },
    activeEvaluations: { value: activeEvaluations, isLoading: assignments.isLoading, error: assignments.error ?? null },
    reservations: { value: reservations, isLoading: calendar.isLoading, error: calendar.error ?? null },
  };
}
