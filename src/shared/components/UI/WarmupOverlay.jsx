/*
 * Funcionalidad: WarmupOverlay — overlay de calentamiento del servidor
 * Descripción: Overlay de pantalla completa que bloquea la UI mientras el backend
 *              (Render free tier) sale del cold start. Visible cuando el estado global
 *              warmingUp === true. Se activa desde: flujo de login con credenciales,
 *              primer mount del layout autenticado, y retry automático de httpClient.
 *              Estilos en WarmupOverlay.module.css (CSS Modules, sin MUI sx ni inline).
 * Versión: 1.1
 * Autor: Marcela Mazo Castro
 * Proyecto: VentyLab
 * Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria
 *        que integre un sistema de retroalimentación usando modelos de lenguaje
 * Institución: Universidad del Valle
 * Contacto: marcela.mazo@correounivalle.edu.co
 */

import React from 'react';
import { useWarmup } from '@/shared/contexts/WarmupContext';
import styles from './WarmupOverlay.module.css';

/**
 * WarmupOverlay
 * Renderizar una sola vez en _app.js. No requiere props.
 * Se muestra/oculta automáticamente según WarmupContext.
 */
export default function WarmupOverlay() {
  const { warmingUp } = useWarmup();

  if (!warmingUp) return null;

  return (
    <div
      className={styles['warmup-overlay']}
      role="alertdialog"
      aria-modal="true"
      aria-label="Conectando con el servidor"
      aria-live="polite"
    >
      <div className={styles['warmup-card']}>
        <div className={styles['warmup-logo']} aria-hidden="true">VL</div>

        <div className={styles['warmup-spinner']} aria-hidden="true" />

        <p className={styles['warmup-title']}>Conectando con el servidor</p>

        <p className={styles['warmup-message']}>
          El servidor está iniciando después de un período de inactividad.
          <br />
          Puede tardar hasta un minuto.
        </p>

        <div className={styles['warmup-dots']} aria-hidden="true">
          <div className={styles['warmup-dot']} />
          <div className={styles['warmup-dot']} />
          <div className={styles['warmup-dot']} />
        </div>
      </div>
    </div>
  );
}
