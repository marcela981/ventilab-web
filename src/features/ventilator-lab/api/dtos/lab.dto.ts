/*
* Funcionalidad: Ventilator lab DTOs
* Descripción: Backend contract types of the ventilator lab, taken from the generated OpenAPI types (no hand-written shapes): the full reservation projection (ReservationDetailDTO, visibility "full"), the limited one served to a student for other people's reservations (ReservationSummaryDTO, visibility "limited"), the current reservation with its control flag, the calendar query, the platform setting and the ventilator part of the system status. Depends on the generated api-client schema.
* Versión: 1.0
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
export type ReservationPartyDTO = Schemas["ReservationPartyDTO"];
export type ReservationGroupDTO = Schemas["ReservationGroupDTO"];
export type CurrentReservationDTO = Schemas["CurrentReservationDTO"];
export type PlatformSettingDTO = Schemas["PlatformSettingDTO"];
export type SystemVentilatorStatusDTO = Schemas["SystemVentilatorStatusDTO"];

/**
 * The backend projects every reservation through the same role mapper, so `/current` may also return the limited
 * projection to a student who does not hold it, although openapi documents only the detail there.
 */
export type ReservationProjectionDTO = ReservationDetailDTO | ReservationSummaryDTO;

export type ReservationsCalendarQueryDTO = operations["getReservationsCalendar"]["parameters"]["query"];
