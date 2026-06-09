/*
 * Funcionalidad: ConexionVentiladorContext
 * Descripción: Provider que instancia la FSM useConexionVentilador UNA sola vez y
 *   la comparte con todo el subárbol del simulador. Permite que la tab Conexión
 *   gobierne reservar→conectar y que la tab Monitoreo / el dashboard lean el estado
 *   de conexión sin re-implementarlo ni hacer prop-drilling.
 * Versión: 1.0
 * Autor: Marcela Mazo Castro
 * Proyecto: VentyLab
 * Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria
 *        que integre un sistema de retroalimentación usando modelos de lenguaje
 * Institución: Universidad del Valle
 * Contacto: marcela.mazo@correounivalle.edu.co
 */

import { createContext, useContext, type ReactNode } from 'react';

import {
  useConexionVentilador,
  type UseConexionVentiladorReturn,
} from '@/features/simulador/conexion/websocket/hooks/useConexionVentilador';

const ConexionVentiladorContext = createContext<UseConexionVentiladorReturn | null>(null);

interface ConexionVentiladorProviderProps {
  children: ReactNode;
}

/**
 * Envuelve el contenido del simulador. Debe situarse dentro de <SocketProvider>
 * (global en _app.js) para que la FSM acceda al WebSocket del backend.
 */
export function ConexionVentiladorProvider({ children }: ConexionVentiladorProviderProps) {
  const value = useConexionVentilador();
  return (
    <ConexionVentiladorContext.Provider value={value}>
      {children}
    </ConexionVentiladorContext.Provider>
  );
}

/**
 * Acceso tipado al estado/acciones de la FSM de conexión.
 * Lanza si se usa fuera del provider para detectar errores de cableado temprano.
 */
export function useConexionVentiladorContext(): UseConexionVentiladorReturn {
  const ctx = useContext(ConexionVentiladorContext);
  if (ctx === null) {
    throw new Error(
      'useConexionVentiladorContext debe usarse dentro de <ConexionVentiladorProvider>',
    );
  }
  return ctx;
}

export default ConexionVentiladorProvider;
