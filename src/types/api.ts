/*
 * Funcionalidad: Tipos compartidos de respuesta API
 * Descripción: Contratos TypeScript para las respuestas HTTP del backend VentyLab.
 *              Previene mismatches entre lo que el backend retorna y lo que el
 *              frontend espera. Todos los endpoints del módulo de evaluación deben
 *              usar ApiResponse<T>. El endpoint /activity-submissions/my aún usa
 *              SubmissionsApiResponse hasta que el backend sea alineado.
 * Versión: 1.0
 * Autor: Marcela Mazo Castro
 * Proyecto: VentyLab
 * Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria
 *        que integre un sistema de retroalimentación usando modelos de lenguaje
 * Institución: Universidad del Valle
 * Contacto: marcela.mazo@correounivalle.edu.co
 */

/** Envoltorio estándar de respuesta para todos los endpoints de evaluación. */
export interface ApiResponse<T = unknown> {
  success: boolean;
  data: T;
  message?: string;
}

/**
 * Variante legada para /api/activity-submissions/my, que retorna `submissions`
 * en lugar de `data`. Eliminar cuando el backend sea alineado a ApiResponse.
 */
export interface SubmissionsApiResponse<T = unknown> {
  success: boolean;
  submissions: T;
  message?: string;
}
