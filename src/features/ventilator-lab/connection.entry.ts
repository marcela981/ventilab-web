/*
* Funcionalidad: Ventilator lab connection entry point
* Descripción: Public entry point of the pieces the Conexión tab of /simulador reuses to reserve and connect to the
*   physical ventilator (W7, Bloque 1) without the rest of the lab barrel: the current reservation and its realtime
*   revalidation, the preemption notice, the immediate booking and preemption dialogs, the cancel hook, the lab
*   settings, the ventilator room join, the operator control (hook, release request, bar and its pure helpers), the
*   control revoked modal and its pure model, and the reservation texts. Depends on the ventilator-lab api and
*   application layers.
* Versión: 0.1
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

export { releaseControl } from "./api/services/ventilator-control.service";
export { ControlRevokedDialog } from "./application/components/control-revoked-dialog";
export { CREATE_RESERVATION_COPY, CreateReservationDialog } from "./application/components/create-reservation-dialog";
export { OperatorControlBar } from "./application/components/operator-control-bar";
export type { OperatorControlBarProps } from "./application/components/operator-control-bar";
export { PREEMPT_RESERVATION_COPY, PreemptReservationDialog } from "./application/components/preempt-reservation-dialog";
export { LAB_RESERVATIONS_URL } from "./application/config/lab.routes";
export { mergeRevocation, REVOCATION_COPY, revocationFromControlEvent, revocationFromPreemption, revocationModal } from "./application/entities/control-revocation.entity";
export type { Revocation, RevocationModal } from "./application/entities/control-revocation.entity";
export { DEFAULT_IMMEDIATE_DURATION, IMMEDIATE_DURATIONS } from "./application/entities/create-reservation.entity";
export type { CreateReservationRequest, ReservationConflict } from "./application/entities/create-reservation.entity";
export { getLabErrorMessage } from "./application/entities/lab-error-messages";
export { joinRejectedMessage } from "./application/entities/live-session.entity";
export { CONTROL_COPY, controlOperatorLabel, OPERATOR_LABELS } from "./application/entities/operator-control.entity";
export type { ControlView, OperatorControlState } from "./application/entities/operator-control.entity";
export { reservedByText } from "./application/entities/reservation.entity";
export type { CurrentReservation, LabReservation, ReservationRelation } from "./application/entities/reservation.entity";
export { useCancelReservation } from "./application/hooks/use-cancel-reservation";
export { useCurrentReservation } from "./application/hooks/use-lab-reservations";
export { useLabSettings } from "./application/hooks/use-lab-settings";
export { useOperatorControl } from "./application/hooks/use-operator-control";
export type { UseOperatorControlResult } from "./application/hooks/use-operator-control";
export { usePreemptionNotice } from "./application/hooks/use-preemption-notice";
export { useReservationsRealtime } from "./application/hooks/use-reservations-realtime";
export { useVentilatorRoom } from "./application/hooks/use-ventilator-room";
