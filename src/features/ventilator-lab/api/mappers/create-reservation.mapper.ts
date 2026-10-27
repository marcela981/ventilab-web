/*
* Funcionalidad: Create reservation mapper
* Descripción: Maps the booking request of the dialog to the CreateReservationDTO body (the caller is sent without userId; the end is the start plus the duration; the purpose is trimmed and omitted when empty; confirmPreempt only when the preemption flow sets it), parses the conflict details of a 409 (data `{ preemptable, conflicts[] }`; null when malformed) and builds the holder options from the backend lists: the active student groups a student leads (GET /api/groups/mine memberships with memberRole LEADER), the active groups of GET /api/groups for staff, and a user of GET /api/users for admins. Labels are the names the backend returns (the email of a user without name). v1.1 (T2 review fix): a teacher is offered only the student groups of GET /api/groups that the teacher did not create: the backend scopes that list to groups the teacher created OR supervises and accepts only supervised ones (canReserveFor), and no endpoint readable by a teacher says whether a created group is also supervised (backend gap), so only the groups certainly supervised are offered. v1.1 (T4): leaderGroupIds, every group the caller leads (cancel permission). Depends on the lab DTOs and the create reservation entities.
*   v1.2 (W7, Bloque 1): a request without start is an immediate reservation: the body carries durationMinutes (15/30/45/60) and no startsAt/endsAt (the backend starts it now).
* Versión: 1.2
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

import { isImmediateDuration, reservationEnd } from "../../application/entities/create-reservation.entity";
import type {
  CreateReservationRequest,
  HolderOption,
  ReservationConflict,
  ReservationConflictItem,
} from "../../application/entities/create-reservation.entity";
import type { CreateReservationDTO, GroupDTO, MyGroupsDTO, UserDTO } from "../dtos/lab.dto";

export function toCreateReservationBody(request: CreateReservationRequest): CreateReservationDTO {
  const { holder } = request;
  const purpose = request.purpose.trim();
  const { startsAt, durationMinutes } = request;
  let body: CreateReservationDTO;

  if (startsAt === null) {
    if (!isImmediateDuration(durationMinutes)) {
      throw new RangeError(`Unsupported immediate reservation duration: ${durationMinutes} min`);
    }

    // Immediate reservation: the backend starts it now (truncated to the minute); no window is sent.
    body = { holderType: holder.holderType, durationMinutes };
  } else {
    body = {
      holderType: holder.holderType,
      startsAt: startsAt.toISOString(),
      endsAt: reservationEnd({ startsAt, durationMinutes }).toISOString(),
    };
  }

  if (holder.holderType === "GROUP" && holder.groupId) {
    body.groupId = holder.groupId;
  }

  if (holder.holderType === "USER" && holder.userId) {
    body.userId = holder.userId;
  }

  if (purpose !== "") {
    body.purpose = purpose;
  }

  if (request.confirmPreempt) {
    body.confirmPreempt = true;
  }

  return body;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function optionalString(value: unknown): string | null {
  return typeof value === "string" ? value : null;
}

function toConflictItem(value: unknown): ReservationConflictItem | null {
  if (!isRecord(value) || typeof value.startsAt !== "string" || typeof value.endsAt !== "string") {
    return null;
  }

  return {
    reservationId: optionalString(value.reservationId),
    holderType: optionalString(value.holderType),
    holderRole: optionalString(value.holderRole),
    holderName: optionalString(value.holderName),
    holderIdentifier: optionalString(value.holderIdentifier),
    groupName: optionalString(value.groupName),
    startsAt: value.startsAt,
    endsAt: value.endsAt,
  };
}

/** Conflict details of a 409 overlap (`ApiError.details`), or null when the payload is not one. */
export function toReservationConflict(details: unknown): ReservationConflict | null {
  if (!isRecord(details) || typeof details.preemptable !== "boolean" || !Array.isArray(details.conflicts)) {
    return null;
  }

  return {
    preemptable: details.preemptable,
    conflicts: details.conflicts.map(toConflictItem).filter((item): item is ReservationConflictItem => item !== null),
  };
}

function groupOption(groupId: string, name: string): HolderOption {
  return { kind: "group", key: groupId, holderType: "GROUP", userId: null, groupId, label: name };
}

/** Active student groups the caller leads: the only groups a student may book for. */
export function ledGroupOptions(myGroups: MyGroupsDTO): HolderOption[] {
  return myGroups.memberships
    .filter((membership) => membership.groupType === "STUDENT" && membership.isActive && membership.memberRole === "LEADER")
    .map((membership) => groupOption(membership.groupId, membership.groupName));
}

/**
 * Active groups of the staff groups list (already scoped by the backend to the caller). With `teacherId`, only the
 * groups that teacher did not create: those are in the teacher's scope only through supervision, the one relation
 * the backend accepts to book for a group.
 */
export function managedGroupOptions(groups: readonly GroupDTO[], teacherId: string | null = null): HolderOption[] {
  return groups
    .filter((group) => group.isActive && (teacherId === null || group.createdBy !== teacherId))
    .map((group) => groupOption(group.id, group.name));
}

/** Every group the caller leads (backend isGroupLeader), whatever its type or state. */
export function leaderGroupIds(myGroups: MyGroupsDTO): string[] {
  return myGroups.memberships.filter((membership) => membership.memberRole === "LEADER").map((membership) => membership.groupId);
}

export function userHolderOption(user: UserDTO): HolderOption {
  const label = user.name && user.name.trim() !== "" ? user.name : user.email;

  return { kind: "user", key: user.id, holderType: "USER", userId: user.id, groupId: null, label };
}
