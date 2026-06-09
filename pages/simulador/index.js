/*
 * Funcionalidad: SimuladorPage
 * Descripción: Página principal del simulador de ventilador. La reserva y la
 *   conexión al ventilador físico se gobiernan con la FSM useConexionVentilador,
 *   compartida vía ConexionVentiladorProvider; su tab vive dentro del dashboard
 *   (tab "Conexión"). Aquí solo se renderiza VentilatorDashboardWrapper, que lee
 *   del contexto si la sesión está sobre un ventilador real.
 * Versión: 2.0
 * Autor: Marcela Mazo Castro
 * Proyecto: VentyLab
 * Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria
 *        que integre un sistema de retroalimentación usando modelos de lenguaje
 * Institución: Universidad del Valle
 * Contacto: marcela.mazo@correounivalle.edu.co
 */

import React from 'react';
import { LearningProgressProvider } from '@/features/progress/LearningProgressContext';
import {
  ConexionVentiladorProvider,
  useConexionVentiladorContext,
} from '@/features/simulador/conexion/contexto/ConexionVentiladorContext';
import { VentilatorDashboardWrapper } from '@/features/simulador/simuladorVentilador/dashboard/componentes/VentilatorDashboardWrapper';
import styles from '@/features/simulador/ui/SimuladorPage.module.css';

// =============================================================================
// Inner component — hooks require a React function component scope
// =============================================================================

function SimuladorContent() {
  // El estado de reserva/conexión es la única fuente de verdad de la FSM.
  const { tieneReserva } = useConexionVentiladorContext();

  return (
    <div className={styles.layout}>
      <main className={styles.main}>
        <VentilatorDashboardWrapper isRealVentilator={tieneReserva} />
      </main>
    </div>
  );
}

// =============================================================================
// Page export
// =============================================================================

export default function SimuladorPage() {
  return (
    <LearningProgressProvider>
      <ConexionVentiladorProvider>
        <SimuladorContent />
      </ConexionVentiladorProvider>
    </LearningProgressProvider>
  );
}
