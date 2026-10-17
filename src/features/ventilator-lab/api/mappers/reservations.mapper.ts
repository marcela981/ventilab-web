/*
* Funcionalidad: Reservations mapper
* Descripción: Maps the role projections of the backend reservations to the lab entities by `visibility`: "full" keeps the holder name (its identifier when the name is empty) and group name exactly as returned; "limited" keeps only the window, status and occupancy label (the Spanish text of the known label keys; the backend `label` for the group key, which carries the group name, and for unknown keys). Names are never built on the client. v1.1 (T4): full reservations also keep the holder user, holder group and creator ids (for the cancel permission). Depends on the lab DTOs and the reservation entities.
* Versión: 1.1
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

import { OCCUPANCY_LABELS } from "../../application/entities/reservation.entity";
import type { CurrentReservation, LabReservation, ReservationHolderType } from "../../application/entities/reservation.entity";
import type { CurrentReservationDTO, ReservationDetailDTO, ReservationProjectionDTO, ReservationSummaryDTO } from "../dtos/lab.dto";

function isLimited(dto: ReservationProjectionDTO): dto is ReservationSummaryDTO {
  return dto.visibility === "limited";
}

function occupancyLabel(dto: ReservationSummaryDTO): string {
  const known = Object.prototype.hasOwnProperty.call(OCCUPANCY_LABELS, dto.labelKey) ? OCCUPANCY_LABELS[dto.labelKey] : undefined;

  return known ?? dto.label;
}

function holderName(dto: ReservationDetailDTO): string | null {
  if (!dto.holder) {
    return null;
  }

  return dto.holder.name && dto.holder.name.trim() !== "" ? dto.holder.name : dto.holder.identifier;
}

export function toLabReservation(dto: ReservationProjectionDTO): LabReservation {
  if (isLimited(dto)) {
    return {
      visibility: "limited",
      id: dto.id,
      startsAt: dto.startsAt,
      endsAt: dto.endsAt,
      status: dto.status,
      occupancyLabel: occupancyLabel(dto),
    };
  }

  return {
    visibility: "full",
    id: dto.id,
    startsAt: dto.startsAt,
    endsAt: dto.endsAt,
    status: dto.status,
    holderType: dto.holderType as ReservationHolderType,
    holderRole: dto.holderRole,
    holderName: holderName(dto),
    groupName: dto.group?.name ?? null,
    holderUserId: dto.holder?.id ?? null,
    groupId: dto.group?.id ?? null,
    createdById: dto.createdBy?.id ?? null,
    purpose: dto.purpose,
    preemptedReason: dto.preemptedReason ?? null,
  };
}

export function toCurrentReservation(dto: CurrentReservationDTO): CurrentReservation {
  const reservation = dto.reservation as ReservationProjectionDTO | null;

  return {
    reservation: reservation ? toLabReservation(reservation) : null,
    canControl: dto.canControl,
  };
}
