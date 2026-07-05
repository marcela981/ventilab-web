/*
 * Funcionalidad: ChunkErrorBoundary + retryImport
 * Descripción: Utilidades de carga resiliente para imports dinámicos (code
 *   splitting). retryImport reintenta un import() fallido con backoff
 *   exponencial (3 intentos en total) para absorber fallos transitorios de
 *   red. ChunkErrorBoundary captura los ChunkLoadError que persisten tras los
 *   reintentos (típicamente un deploy que invalidó los hashes de chunk) y
 *   muestra un fallback con botón "Recargar"; cualquier otro error se
 *   re-lanza hacia el ErrorBoundary global de _app. La recarga es solo por
 *   acción del usuario: nunca automática, para evitar loops de recarga.
 * Versión: 1.0
 * Autor: Marcela Mazo Castro
 * Proyecto: VentyLab
 * Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria
 *        que integre un sistema de retroalimentación usando modelos de lenguaje
 * Institución: Universidad del Valle
 * Contacto: marcela.mazo@correounivalle.edu.co
 */

import React from 'react';
import { Alert, AlertTitle, Button } from '@mui/material';
import { Refresh } from '@mui/icons-material';

/**
 * retryImport - Reintenta un import() dinámico con backoff exponencial.
 *
 * Uso: lazy(() => retryImport(() => import('./Componente')))
 *      dynamic(() => retryImport(() => import('./Componente')), { ssr: false })
 *
 * @param {Function} importFn - Función que retorna la promesa del import()
 * @param {number} [retries=2] - Reintentos restantes (2 → 3 intentos totales)
 * @param {number} [delayMs=500] - Espera antes del próximo intento (se duplica)
 * @returns {Promise<Object>} La promesa del módulo importado
 */
export const retryImport = (importFn, retries = 2, delayMs = 500) =>
  importFn().catch((error) => {
    if (retries <= 0) throw error;
    return new Promise((resolve) => { setTimeout(resolve, delayMs); })
      .then(() => retryImport(importFn, retries - 1, delayMs * 2));
  });

/**
 * isChunkLoadError - Detecta si un error proviene de la carga de un chunk
 * (webpack emite ChunkLoadError; se cubren también los mensajes de chunks CSS
 * y el equivalente de módulos ESM por robustez).
 */
const isChunkLoadError = (error) => {
  if (!error) return false;
  const message = String(error.message || '');
  return (
    error.name === 'ChunkLoadError' ||
    /loading (css )?chunk [^ ]* failed/i.test(message) ||
    /failed to fetch dynamically imported module/i.test(message)
  );
};

/**
 * ChunkErrorBoundary - Error boundary específico para fallos de carga de
 * chunks. Los errores que no son de chunk se re-lanzan al boundary superior.
 */
class ChunkErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('ChunkErrorBoundary capturó un error de carga:', error, errorInfo);
  }

  handleReload = () => {
    // Recarga completa: React.lazy memoiza la promesa rechazada, por lo que
    // resetear el state del boundary re-lanzaría el mismo error. Solo se
    // ejecuta por click del usuario (sin recargas automáticas).
    window.location.reload();
  };

  render() {
    const { error } = this.state;

    if (error) {
      // Errores ajenos a la carga de chunks: delegar al ErrorBoundary global.
      if (!isChunkLoadError(error)) throw error;

      return (
        <Alert
          severity="error"
          action={
            <Button
              color="inherit"
              size="small"
              startIcon={<Refresh />}
              onClick={this.handleReload}
            >
              Recargar
            </Button>
          }
        >
          <AlertTitle>No se pudo cargar el contenido</AlertTitle>
          Hubo un problema de conexión o la aplicación se actualizó.
          Recarga la página para continuar donde estabas.
        </Alert>
      );
    }

    return this.props.children;
  }
}

export default ChunkErrorBoundary;
