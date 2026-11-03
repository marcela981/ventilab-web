/*
* Funcionalidad: useGroupBuilder
* Descripción: "Conformar grupo" of the students directory (July's GroupBuilderModal flow): creates a STUDENT group (`POST /api/groups`, name and optional semester) and then adds every selected student (`POST /api/groups/{id}/members`) with allSettled semantics, 4 at a time. The result is "created" when every student was added or "partial" with the students that failed and the Spanish reason of each (e.g. 409: already in an active student group); a failed creation keeps the dialog in "error" (nothing was created, it can be retried). After a group exists the directory and group lists are revalidated. Depends on React, swr, @shared/api-client, the students directory service and the group builder and teacher dashboard error entities.
* Versión: 1.0
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

import { useCallback, useState } from "react";
import { useSWRConfig } from "swr";
import { invalidateApiQueries } from "@shared/api-client/use-api-query";
import { addStudentToGroup, createStudentGroup, DIRECTORY_INVALIDATED_PATHS } from "../../api/services/students-directory.service";
import { MEMBER_CONCURRENCY, memberFailureReason, settleWithConcurrency } from "../entities/group-builder.entity";
import { getTeacherDashboardErrorMessage } from "../entities/teacher-dashboard-error-messages";

export type GroupMemberCandidate = { id: string, name: string };

export type GroupMemberFailure = GroupMemberCandidate & { reason: string };

export type GroupBuilderState =
  | { status: "idle" }
  | { status: "saving" }
  | { status: "error", message: string }
  | { status: "created" }
  | { status: "partial", failures: readonly GroupMemberFailure[] };

export type GroupBuilderInput = { name: string, semester: string, members: readonly GroupMemberCandidate[] };

export type UseGroupBuilderResult = {
  state: GroupBuilderState
  create: (input: GroupBuilderInput) => Promise<GroupBuilderState>
  reset: () => void
};

const IDLE: GroupBuilderState = { status: "idle" };

export function useGroupBuilder(): UseGroupBuilderResult {
  const { mutate } = useSWRConfig();
  const [state, setState] = useState<GroupBuilderState>(IDLE);

  const create = useCallback(async({ name, semester, members }: GroupBuilderInput): Promise<GroupBuilderState> => {
    setState({ status: "saving" });

    let groupId: string;

    try {
      groupId = await createStudentGroup({ name: name.trim(), ...(semester.trim() ? { semester: semester.trim() } : {}) });
    } catch (caught: unknown) {
      const failed: GroupBuilderState = { status: "error", message: getTeacherDashboardErrorMessage(caught) };

      setState(failed);

      return failed;
    }

    const results = await settleWithConcurrency(members, MEMBER_CONCURRENCY, (member) => addStudentToGroup(groupId, member.id));
    const failures = results.flatMap((result, index): GroupMemberFailure[] => {
      const member = members[index];

      return result.status === "rejected" && member ? [{ ...member, reason: memberFailureReason(result.reason) }] : [];
    });
    const done: GroupBuilderState = failures.length > 0 ? { status: "partial", failures } : { status: "created" };

    setState(done);
    void invalidateApiQueries(mutate, DIRECTORY_INVALIDATED_PATHS);

    return done;
  }, [mutate]);

  const reset = useCallback(() => setState(IDLE), []);

  return { state, create, reset };
}
