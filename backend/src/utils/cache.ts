/**
 * =============================================================================
 * Cache Utility
 * =============================================================================
 * 
 * Utilidad para cachear resultados usando LRU cache.
 * 
 * @module
 */

import { LRUCache } from 'lru-cache';

/**
 * Cache para sugerencias de preguntas
 * TTL: 60 segundos
 * Max entries: 1000
 */
export const suggestionsCache = new LRUCache<string, any>({
  max: 1000,
  ttl: 60 * 1000, // 60 segundos
});

/**
 * Generar clave de cache para sugerencias
 * @param lessonId - ID de la lección
 * @param sectionId - ID de la sección
 * @param seed - Texto semilla (opcional, hasheado para no exponer contenido)
 * @returns Clave de cache
 */
export function generateCacheKey(lessonId: string | null, sectionId: string | null, seed?: string | null): string {
  const seedHash = seed ? hashString(seed.trim()).substring(0, 8) : 'none';
  return `suggestions:${lessonId || 'none'}:${sectionId || 'none'}:${seedHash}`;
}

/**
 * Hash simple de un string (para usar en cache keys)
 * @param str - String a hashear
 * @returns Hash string
 */
function hashString(str: string): string {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  return Math.abs(hash).toString(36);
}

/**
 * Obtener valor del cache
 * @param key - Clave de cache
 * @returns Valor cacheado o undefined
 */
export function getCached<T>(key: string): T | undefined {
  return suggestionsCache.get(key) as T | undefined;
}

/**
 * Guardar valor en cache
 * @param key - Clave de cache
 * @param value - Valor a cachear
 */
export function setCached<T>(key: string, value: T): void {
  suggestionsCache.set(key, value);
}

