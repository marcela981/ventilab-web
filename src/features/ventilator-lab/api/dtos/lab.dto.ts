/*
* Funcionalidad: Ventilator lab DTOs
* Descripción: Backend contract types of the ventilator lab, taken from the generated OpenAPI types (no hand-written shapes): the full reservation projection (ReservationDetailDTO, visibility "full"), the limited one served to a student for other people's reservations (ReservationSummaryDTO, visibility "limited"), the current reservation with its control flag, the calendar query, the platform setting and the ventilator part of the system status. v1.1 (T2): the create reservation body, the groups of the caller (memberships with their role inside each group), the groups list and its query, and the users list and its query, used to offer the reservation holders. v1.5 (B3.10): unused aliases removed (ReservationPartyDTO, ReservationGroupDTO, VentilatorCommandsQueryDTO, TelemetryRecordingDTO). Depends on the generated api-client schema. v1.2 (T7): the ventilator control state (VentilatorControlStateDTO). v1.3 (T8): the command request (SendVentilatorCommandRequestDTO), its 202 answer (SentVentilatorCommandDTO), the command history item (VentilatorCommandDTO) and its query. v1.4 (T11): the telemetry recording of a reservation (TelemetryRecordingDTO) and its frames
  (RecordedTelemetryFrameDTO).
* Versión: 1.5
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

import type { components, operations } from "@shared/api-client/generated/schema";

type Schemas = components["schemas"];

export type ReservationDetailDTO = Schemas["ReservationDetailDTO"];
export type ReservationSummaryDTO = Schemas["ReservationSummaryDTO"];
export type CurrentReservationDTO = Schemas["CurrentReservationDTO"];
export type PlatformSettingDTO = Schemas["PlatformSettingDTO"];
export type SystemVentilatorStatusDTO = Schemas["SystemVentilatorStatusDTO"];

/**
 * The backend projects every reservation through the same role mapper, so `/current` may also return the limited
 * projection to a student who does not hold it, although openapi documents only the detail there.
 */
export type ReservationProjectionDTO = ReservationDetailDTO | ReservationSummaryDTO;

export type ReservationsCalendarQueryDTO = operations["getReservationsCalendar"]["parameters"]["query"];

export type CreateReservationDTO = Schemas["CreateReservationDTO"];
export type MyGroupsDTO = Schemas["MyGroupsDTO"];
export type GroupMembershipDTO = Schemas["GroupMembershipDTO"];
export type GroupDTO = Schemas["GroupDTO"];
export type GroupsQueryDTO = NonNullable<operations["getGroups"]["parameters"]["query"]>;
export type UserDTO = Schemas["UserDTO"];
export type UsersQueryDTO = NonNullable<operations["getUsers"]["parameters"]["query"]>;
export type VentilatorControlStateDTO = Schemas["VentilatorControlStateDTO"];
export type SendVentilatorCommandRequestDTO = Schemas["SendVentilatorCommandRequestDTO"];
export type SentVentilatorCommandDTO = Schemas["SentVentilatorCommandDTO"];
export type VentilatorCommandDTO = Schemas["VentilatorCommandDTO"];
export type RecordedTelemetryFrameDTO = Schemas["RecordedTelemetryFrameDTO"];
