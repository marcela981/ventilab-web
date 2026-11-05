/*
* Funcionalidad: useGroupBuilder
* Descripción: "Conformar grupo" of the students directory (July's GroupBuilderModal flow): creates a STUDENT group (`POST /api/groups`, name and optional semester) and then adds every selected student (`POST /api/groups/{id}/members`) with allSettled semantics, 4 at a time. The result is "created" when every student was added or "partial" with the students that failed and the Spanish reason of each (e.g. 409: already in an active student group); a failed creation keeps the dialog in "error" (nothing was created, it can be retried). After a group exists the directory and group lists are revalidated. Depends on React, swr, @shared/api-client, the students directory service and the group builder and teacher dashboard error entities. v1.1 (ajustes D2): useAddToGroup adds the selected students to an existing group with the same per-student failures.
* Versión: 1.1
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

/** Adds the students to the group, at most MEMBER_CONCURRENCY at a time; returns who could not be added and why. */
async function addMembers(groupId: string, members: readonly GroupMemberCandidate[]): Promise<GroupMemberFailure[]> {
  const results = await settleWithConcurrency(members, MEMBER_CONCURRENCY, (member) => addStudentToGroup(groupId, member.id));

  return results.flatMap((result, index): GroupMemberFailure[] => {
    const member = members[index];

    return result.status === "rejected" && member ? [{ ...member, reason: memberFailureReason(result.reason) }] : [];
  });
}

export type AddToGroupState =
  | { status: "idle" }
  | { status: "saving" }
  | { status: "added" }
  | { status: "partial", failures: readonly GroupMemberFailure[] };

export type UseAddToGroupResult = {
  state: AddToGroupState
  add: (groupId: string, members: readonly GroupMemberCandidate[]) => Promise<AddToGroupState>
  reset: () => void
};

/** "Agregar a grupo existente": the same per-student adding (and partial result) as "Conformar Grupo", into a group that exists. */
export function useAddToGroup(): UseAddToGroupResult {
  const { mutate } = useSWRConfig();
  const [state, setState] = useState<AddToGroupState>({ status: "idle" });

  const add = useCallback(async(groupId: string, members: readonly GroupMemberCandidate[]): Promise<AddToGroupState> => {
    setState({ status: "saving" });

    const failures = await addMembers(groupId, members);
    const done: AddToGroupState = failures.length > 0 ? { status: "partial", failures } : { status: "added" };

    setState(done);
    void invalidateApiQueries(mutate, DIRECTORY_INVALIDATED_PATHS);

    return done;
  }, [mutate]);

  const reset = useCallback(() => setState({ status: "idle" }), []);

  return { state, add, reset };
}

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

    const failures = await addMembers(groupId, members);
    const done: GroupBuilderState = failures.length > 0 ? { status: "partial", failures } : { status: "created" };

    setState(done);
    void invalidateApiQueries(mutate, DIRECTORY_INVALIDATED_PATHS);

    return done;
  }, [mutate]);

  const reset = useCallback(() => setState(IDLE), []);

  return { state, create, reset };
}
