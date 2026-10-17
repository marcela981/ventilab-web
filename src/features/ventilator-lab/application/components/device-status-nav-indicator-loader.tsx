/*
* Funcionalidad: Device status navigation indicator loader
* Descripción: T12 review fix W1. Renders nothing; feeds the "ventilatorDevice" navigation indicator (nav-indicators
*   registry of @shared/layouts, the "Laboratorio" item) from useDeviceStatus, the same state the lab pages show
*   (realtime connected / disconnected events, telemetry proving the device online, and the GET /api/system/status
*   seed for callers holding system:status). deviceNavIndicator states only what the backend reported: "Equipo en
*   línea" when online, "Equipo sin datos" for a reported disconnect or stale state (device_stale,
*   broker_disconnected); an unknown state (no event yet and no trusted seed, the usual case for a student after a
*   page load) or a realtime socket that is down shows no indicator. Clears the indicator when it unmounts. Loaded
*   lazily by DeviceStatusNavIndicatorSync. Depends on React, @shared/layouts/nav-indicators and useDeviceStatus.
* Versión: 1.0
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

import { useEffect } from "react";
import { useSetNavIndicator } from "@shared/layouts/nav-indicators";
import type { NavIndicator } from "@shared/layouts/nav-indicators";
import { useDeviceStatus } from "../hooks/use-device-status";
import type { DeviceStatus } from "../hooks/use-device-status";

// TODO(i18n): see nav.config.
export const DEVICE_NAV_INDICATOR_COPY = {
  online: "Equipo en línea",
  noData: "Equipo sin datos",
} as const;

const ONLINE: NavIndicator = { tone: "positive", text: DEVICE_NAV_INDICATOR_COPY.online };
const NO_DATA: NavIndicator = { tone: "negative", text: DEVICE_NAV_INDICATOR_COPY.noData };

/** The indicator never states a device state the backend did not report: unknown → none. */
export function deviceNavIndicator(status: DeviceStatus): NavIndicator | null {
  if (status.kind === "online") {
    return ONLINE;
  }

  return status.reason === "device_stale" || status.reason === "broker_disconnected" ? NO_DATA : null;
}

export function DeviceStatusNavIndicatorLoader() {
  const indicator = deviceNavIndicator(useDeviceStatus());
  const setIndicator = useSetNavIndicator("ventilatorDevice");

  useEffect(() => {
    setIndicator(indicator);
  }, [indicator, setIndicator]);

  useEffect(() => () => setIndicator(null), [setIndicator]);

  return null;
}
