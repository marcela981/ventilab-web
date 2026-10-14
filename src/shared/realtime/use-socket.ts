/*
* Funcionalidad: useSocket hook
* Descripción: Reads the realtime context (authenticated socket or null, and its status). Throws outside RealtimeProvider. Depends on react and the realtime context.
* Versión: 1.0
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

import { useContext } from "react";
import { RealtimeContext } from "./realtime-context";
import type { RealtimeContextValue } from "./realtime-context";

export function useSocket(): RealtimeContextValue {
  const value = useContext(RealtimeContext);

  if (!value) {
    throw new Error("useSocket must be used inside RealtimeProvider");
  }

  return value;
}
