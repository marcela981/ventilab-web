/*
 * Funcionalidad: WarmupContext — estado global de calentamiento del servidor
 * Descripción: Contexto React que expone { warmingUp, setWarmingUp }.
 *              Escucha los eventos DOM emitidos por httpClient cuando detecta un cold start
 *              del backend (Render free tier). WarmupOverlay consume este contexto para
 *              mostrar/ocultar el splash de "Conectando con el servidor...".
 *              Eventos escuchados:
 *                "ventilab:server:warming" → warmingUp = true
 *                "ventilab:server:warm"    → warmingUp = false
 * Versión: 1.0
 * Autor: Marcela Mazo Castro
 * Proyecto: VentyLab
 * Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria
 *        que integre un sistema de retroalimentación usando modelos de lenguaje
 * Institución: Universidad del Valle
 * Contacto: marcela.mazo@correounivalle.edu.co
 */

import React, { createContext, useContext, useEffect, useState } from 'react';

// =============================================================================
// Tipos
// =============================================================================

interface WarmupContextValue {
  /** true mientras el cliente espera que el backend salga del cold start. */
  warmingUp: boolean;
  /** Permite activar/desactivar el estado desde código (ej: flujo de login). */
  setWarmingUp: (value: boolean) => void;
}

// =============================================================================
// Contexto
// =============================================================================

const WarmupContext = createContext<WarmupContextValue>({
  warmingUp: false,
  setWarmingUp: () => {},
});

WarmupContext.displayName = 'WarmupContext';

// =============================================================================
// Provider
// =============================================================================

export function WarmupProvider({ children }: { children: React.ReactNode }) {
  const [warmingUp, setWarmingUp] = useState(false);

  useEffect(() => {
    const onWarming = () => setWarmingUp(true);
    const onWarm    = () => setWarmingUp(false);

    window.addEventListener('ventilab:server:warming', onWarming);
    window.addEventListener('ventilab:server:warm',    onWarm);

    return () => {
      window.removeEventListener('ventilab:server:warming', onWarming);
      window.removeEventListener('ventilab:server:warm',    onWarm);
    };
  }, []);

  return (
    <WarmupContext.Provider value={{ warmingUp, setWarmingUp }}>
      {children}
    </WarmupContext.Provider>
  );
}

// =============================================================================
// Hook de consumo
// =============================================================================

export function useWarmup(): WarmupContextValue {
  return useContext(WarmupContext);
}
