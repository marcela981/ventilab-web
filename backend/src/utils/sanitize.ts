/**
 * =============================================================================
 * HTML Sanitization Utility
 * =============================================================================
 * 
 * Utilidades para sanitizar HTML y prevenir XSS attacks.
 * 
 * @module
 */

/**
 * Sanitizar HTML básico
 * Remueve tags HTML peligrosos pero permite formato básico
 * 
 * @param html - String con HTML a sanitizar
 * @returns String sanitizado
 */
export function sanitizeHtml(html: string): string {
  if (!html || typeof html !== 'string') {
    return '';
  }
  
  // Remover tags peligrosos (script, iframe, object, embed, etc.)
  let sanitized = html.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');
  sanitized = sanitized.replace(/<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi, '');
  sanitized = sanitized.replace(/<object\b[^<]*(?:(?!<\/object>)<[^<]*)*<\/object>/gi, '');
  sanitized = sanitized.replace(/<embed\b[^<]*(?:(?!<\/embed>)<[^<]*)*<\/embed>/gi, '');
  sanitized = sanitized.replace(/<link\b[^<]*(?:(?!<\/link>)<[^<]*)*<\/link>/gi, '');
  sanitized = sanitized.replace(/<meta\b[^<]*(?:(?!<\/meta>)<[^<]*)*<\/meta>/gi, '');
  sanitized = sanitized.replace(/on\w+="[^"]*"/gi, ''); // Remover event handlers
  sanitized = sanitized.replace(/on\w+='[^']*'/gi, ''); // Remover event handlers
  sanitized = sanitized.replace(/javascript:/gi, ''); // Remover javascript: protocol
  
  // Permitir tags básicos de formato (p, br, strong, em, ul, ol, li, h1-h6, a, code, pre)
  // Esto es una sanitización básica; para producción considerar usar una librería como DOMPurify
  
  return sanitized.trim();
}

/**
 * Remover HTML completamente y dejar solo texto
 * 
 * @param html - String con HTML
 * @returns String con solo texto
 */
export function stripHtml(html: string): string {
  if (!html || typeof html !== 'string') {
    return '';
  }
  
  return html.replace(/<[^>]*>/g, '').trim();
}

/**
 * Limitar longitud de string
 * 
 * @param str - String a limitar
 * @param maxLength - Longitud máxima
 * @returns String truncado si es necesario
 */
export function limitLength(str: string, maxLength: number): string {
  if (!str || typeof str !== 'string') {
    return '';
  }
  
  if (str.length <= maxLength) {
    return str;
  }
  
  return str.substring(0, maxLength) + '...';
}

/**
 * Sanitizar texto removiendo datos personales (PII)
 * Remueve emails, números de identificación y otros datos sensibles
 * 
 * @param text - Texto a sanitizar
 * @returns Texto sanitizado sin PII
 */
export function sanitizePII(text: string): string {
  if (!text || typeof text !== 'string') {
    return '';
  }
  
  let sanitized = text;
  
  // Remover emails (patrón: palabra@dominio.com)
  sanitized = sanitized.replace(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g, '[email]');
  
  // Remover números de identificación comunes (ej: cédulas, pasaportes)
  // Patrón: números de 6-15 dígitos que no son parte de números telefónicos comunes
  // Mejoramos el patrón para evitar remover números legítimos del contenido médico
  // Solo removemos si parecen ser identificadores (ej: secuencias de 8+ dígitos solos)
  sanitized = sanitized.replace(/\b\d{8,15}\b/g, '[id]');
  
  // Remover números telefónicos (formato internacional y local)
  sanitized = sanitized.replace(/(\+?\d{1,3}[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}/g, '[phone]');
  
  // Remover URLs que puedan contener información sensible
  // Pero mantenemos URLs genéricas de recursos educativos
  sanitized = sanitized.replace(/https?:\/\/[^\s]+/g, (url) => {
    // Si es una URL genérica de dominio conocido, mantenerla
    if (/\.(edu|org|gov|com)\//.test(url)) {
      return url;
    }
    return '[url]';
  });
  
  // Normalizar espacios múltiples
  sanitized = sanitized.replace(/\s+/g, ' ').trim();
  
  return sanitized;
}

/**
 * Escapar caracteres especiales para prevenir inyección
 * 
 * @param str - String a escapar
 * @returns String escapado
 */
export function escapeString(str: string): string {
  if (!str || typeof str !== 'string') {
    return '';
  }
  
  // Escapar caracteres de control
  return str
    .replace(/[\x00-\x1F\x7F]/g, '') // Remover caracteres de control
    .replace(/\\/g, '\\\\') // Escapar backslashes
    .replace(/"/g, '\\"') // Escapar comillas dobles
    .replace(/'/g, "\\'") // Escapar comillas simples
    .trim();
}

/**
 * Sanitizar y normalizar texto de entrada
 * Combina sanitización HTML, PII y normalización
 * 
 * @param text - Texto a sanitizar
 * @param options - Opciones de sanitización
 * @returns Texto sanitizado
 */
export function sanitizeText(
  text: string,
  options: {
    removePII?: boolean;
    stripHtml?: boolean;
    escape?: boolean;
    trim?: boolean;
  } = {}
): string {
  if (!text || typeof text !== 'string') {
    return '';
  }
  
  let sanitized = text;
  
  // Remover HTML si está habilitado
  if (options.stripHtml) {
    sanitized = stripHtml(sanitized);
  } else {
    sanitized = sanitizeHtml(sanitized);
  }
  
  // Remover PII si está habilitado
  if (options.removePII !== false) {
    sanitized = sanitizePII(sanitized);
  }
  
  // Escapar si está habilitado
  if (options.escape) {
    sanitized = escapeString(sanitized);
  }
  
  // Trim si está habilitado (por defecto true)
  if (options.trim !== false) {
    sanitized = sanitized.trim();
  }
  
  return sanitized;
}

