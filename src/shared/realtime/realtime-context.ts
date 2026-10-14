/*
* Funcionalidad: Realtime context
* Descripción: React context shared by RealtimeProvider, useSocket and useSocketEvent: the current authenticated socket (null while there is no backend session) and its connection status. Depends on react and the realtime types.
* Versión: 1.0
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

import { createContext } from "react";
import type { RealtimeSocket, RealtimeStatus } from "./realtime.entity";

export type RealtimeContextValue = {
  socket: RealtimeSocket | null
  status: RealtimeStatus
};

export const RealtimeContext = createContext<RealtimeContextValue | null>(null);
