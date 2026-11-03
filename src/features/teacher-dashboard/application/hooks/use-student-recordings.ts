/*
* Funcionalidad: useStudentRecordings
* Descripción: Real ventilator recordings of one student for staff (`GET /api/ventilator/telemetry/recordings?userId`: reservations with recorded telemetry held by the student or one of their groups, last 90 days by default, newest first, at most 100; 403 outside the caller's groups) through useApiQuery. Depends on React, @shared/api-client and the student detail mapper, service and entity.
* Versión: 1.0
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

import { useMemo } from "react";
import type { ApiError } from "@shared/api-client/api-error";
import { useApiQuery } from "@shared/api-client/use-api-query";
import { toTeamRecordings } from "../../api/mappers/student-detail.mapper";
import { TELEMETRY_RECORDINGS_PATH } from "../../api/services/student-detail.service";
import type { TeamRecording } from "../entities/student-detail.entity";

export type UseStudentRecordingsResult = {
  recordings: TeamRecording[] | null
  isLoading: boolean
  error: ApiError | null
};

export function useStudentRecordings(userId: string): UseStudentRecordingsResult {
  const { data, error, isLoading } = useApiQuery(TELEMETRY_RECORDINGS_PATH, { query: { userId } });
  const recordings = useMemo(() => (data ? toTeamRecordings(data.data) : null), [data]);

  return { recordings, isLoading, error: error ?? null };
}
