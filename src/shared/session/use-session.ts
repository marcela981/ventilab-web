/*
* Funcionalidad: useSession hook
* Descripción: Reads the backend session exposed by AuthProvider (status, user, role, permissions, checks and actions). Throws when used outside AuthProvider so a missing provider fails loudly. Depends on react and session-context.
* Versión: 1.0
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

import { useContext } from "react";
import { SessionContext } from "./session-context";
import type { SessionContextValue } from "./session-context";

export function useSession(): SessionContextValue {
  const value = useContext(SessionContext);

  if (!value) {
    throw new Error("useSession must be used inside AuthProvider");
  }

  return value;
}
