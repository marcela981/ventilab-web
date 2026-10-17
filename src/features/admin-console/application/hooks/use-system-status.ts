/*
* Funcionalidad: useSystemStatus, useTelemetryMetrics and useAiProbe
* Descripción: Live data of /admin/status. useSystemStatus reads `GET /api/system/status` (TEACHER and ADMIN), listens to `system:status-changed` (writes the pushed global and component states into the SWR cache at once, then revalidates for the details) and only polls every 60 s as a fallback for a lost socket. useTelemetryMetrics reads `GET /api/ventilator/telemetry/metrics` for admins (null role sends no request; teachers never ask), polled every 60 s. useAiProbe runs `POST /api/system/probe/ai/{provider}` per provider (ADMIN, 3 per minute) and keeps the last result or error message of each provider; after a probe the status is revalidated. Depends on React, @shared/api-client, @shared/realtime and the admin console service, entities and error messages.
* Versión: 1.0
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

import { useCallback, useState } from "react";
import { useSWRConfig } from "swr";
import type { ApiError } from "@shared/api-client/api-error";
import { invalidateApiQueries, useApiQuery } from "@shared/api-client/use-api-query";
import { useSocketEvent } from "@shared/realtime/use-socket-event";
import type { AiProbeDTO, TelemetryMetricsDTO } from "../../api/dtos/admin-console.dto";
import { probeAiProvider, TELEMETRY_METRICS_PATH } from "../../api/services/admin-operations.service";
import { SYSTEM_STATUS_PATH } from "../../api/services/platform-settings.service";
import { getProbeErrorMessage } from "../entities/admin-console-error-messages";
import { applyStatusChange } from "../entities/system-status.entity";
import type { SystemStatus } from "../entities/system-status.entity";

export const STATUS_POLL_MS = 60_000;

const STATUS_CONFIG = { refreshInterval: STATUS_POLL_MS } as const;

export type UseSystemStatusResult = {
  status: SystemStatus | null
  isLoading: boolean
  error: ApiError | null
  reload: () => Promise<void>
};

export function useSystemStatus(): UseSystemStatusResult {
  const { data, error, isLoading, mutate } = useApiQuery(SYSTEM_STATUS_PATH, undefined, STATUS_CONFIG);

  useSocketEvent("system:status-changed", (event) => {
    void mutate((current) => (current ? { ...current, data: applyStatusChange(current.data, event) } : current), { revalidate: true });
  });

  const reload = useCallback(async() => {
    await mutate();
  }, [mutate]);

  return { status: data?.data ?? null, isLoading, error: error ?? null, reload };
}

export type UseTelemetryMetricsResult = {
  metrics: TelemetryMetricsDTO | null
  isLoading: boolean
  error: ApiError | null
};

export function useTelemetryMetrics(enabled: boolean): UseTelemetryMetricsResult {
  const { data, error, isLoading } = useApiQuery(enabled ? TELEMETRY_METRICS_PATH : null, undefined, STATUS_CONFIG);

  return { metrics: data?.data ?? null, isLoading, error: error ?? null };
}

export type ProbeState = {
  pending: boolean
  result: AiProbeDTO | null
  errorMessage: string | null
};

export type UseAiProbeResult = {
  probes: Readonly<Record<string, ProbeState>>
  probe: (provider: string) => Promise<void>
};

const IDLE_PROBE: ProbeState = { pending: false, result: null, errorMessage: null };

export function useAiProbe(): UseAiProbeResult {
  const { mutate } = useSWRConfig();
  const [probes, setProbes] = useState<Record<string, ProbeState>>({});

  const update = useCallback((provider: string, next: Partial<ProbeState>) => {
    setProbes((current) => ({ ...current, [provider]: { ...(current[provider] ?? IDLE_PROBE), ...next } }));
  }, []);

  const probe = useCallback(async(provider: string) => {
    update(provider, { pending: true, errorMessage: null });

    try {
      const result = await probeAiProvider(provider);

      update(provider, { pending: false, result });
      await invalidateApiQueries(mutate, [SYSTEM_STATUS_PATH]);
    } catch (caught) {
      update(provider, { pending: false, result: null, errorMessage: getProbeErrorMessage(caught) });
    }
  }, [mutate, update]);

  return { probes, probe };
}
