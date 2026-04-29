/*
 * Funcionalidad: NoSignalBanner
 * Descripción: Banner rojo que se muestra cuando no hay frames del ventilador real
 *   en los últimos 2 segundos (isStale=true). Solo visible en modo ventilador real.
 * Versión: 1.0
 * Autor: Marcela Mazo Castro
 * Proyecto: VentyLab
 * Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria
 *        que integre un sistema de retroalimentación usando modelos de lenguaje
 * Institución: Universidad del Valle
 * Contacto: marcela.mazo@correounivalle.edu.co
 */

import styles from './ui/NoSignalBanner.module.css';

// =============================================================================
// Component
// =============================================================================

export function NoSignalBanner() {
  return (
    <div className={styles.banner} role="alert">
      <span className={styles.icon}>⚠</span>
      Sin señal del ventilador hace más de 2 segundos.
    </div>
  );
}

export default NoSignalBanner;
