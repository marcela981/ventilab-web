/*
 * Funcionalidad: IndicadorEstadoConexion
 * Descripción: Componente presentacional puro. Traduce el estado de la FSM
 *   (EstadoConexion) a un punto de color + etiqueta legible. Sin lógica de negocio.
 * Versión: 1.0
 * Autor: Marcela Mazo Castro
 * Proyecto: VentyLab
 * Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria
 *        que integre un sistema de retroalimentación usando modelos de lenguaje
 * Institución: Universidad del Valle
 * Contacto: marcela.mazo@correounivalle.edu.co
 */

import type { EstadoConexion } from '@/features/simulador/conexion/websocket/hooks/useConexionVentilador';
import styles from './ui/ConexionVentilador.module.css';

interface IndicadorEstadoConexionProps {
  estado: EstadoConexion;
}

const DOT_CLASS: Record<EstadoConexion, string> = {
  SIN_RESERVA: styles.dotIdle!,
  RESERVANDO: styles.dotPending!,
  RESERVADO: styles.dotReady!,
  CONECTANDO: styles.dotPending!,
  CONECTADO: styles.dotActive!,
  ERROR: styles.dotError!,
  DESCONECTADO: styles.dotIdle!,
};

const LABEL: Record<EstadoConexion, string> = {
  SIN_RESERVA: 'Sin reserva',
  RESERVANDO: 'Reservando…',
  RESERVADO: 'Reservado',
  CONECTANDO: 'Conectando…',
  CONECTADO: 'Conectado',
  ERROR: 'Error',
  DESCONECTADO: 'Desconectado',
};

export function IndicadorEstadoConexion({ estado }: IndicadorEstadoConexionProps) {
  return (
    <span className={styles.indicator}>
      <span className={`${styles.dot} ${DOT_CLASS[estado]}`} />
      <span className={styles.indicatorLabel}>{LABEL[estado]}</span>
    </span>
  );
}

export default IndicadorEstadoConexion;
