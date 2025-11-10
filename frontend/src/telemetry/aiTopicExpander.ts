/**
 * =============================================================================
 * AI Topic Expander Telemetry
 * =============================================================================
 * 
 * Telemetría para eventos del expansor de temas con IA.
 * Incluye eventos: click, open_mode, request, success, error, offline_fallback.
 * 
 * @module
 */

/**
 * Tipos de eventos de telemetría
 */
export type AIExpandEventType =
  | 'ai_expand_click'
  | 'ai_expand_open_mode'
  | 'ai_expand_request'
  | 'ai_expand_success'
  | 'ai_expand_error'
  | 'ai_expand_offline_fallback'
  | 'ai_suggestion_view'
  | 'ai_suggestion_click'
  | 'ai_suggestions_refresh';

/**
 * Modo de apertura del expansor
 */
export type OpenMode = 'button' | 'accordion';

/**
 * Payload redacted para telemetría (solo IDs, sin texto del usuario)
 */
export interface AIExpandTelemetryPayload {
  // IDs
  moduleId?: string | null;
  lessonId?: string | null;
  sectionId?: string | null;
  
  // Metadatos
  openMode?: OpenMode;
  pageType?: string | null;
  sectionType?: string | null;
  sectionOrder?: number | null;
  
  // Errores (códigos, no mensajes)
  errorCode?: string;
  errorStatus?: number;
  
  // Tiempos (opcional)
  requestDuration?: number; // en milisegundos
  
  // Flags
  hasUserSelection?: boolean;
  hasVisibleTextBlock?: boolean;
  isOffline?: boolean;
  
  // Sugerencias (solo IDs y longitudes, sin texto crudo)
  suggestionId?: string;
  suggestionLength?: number;
  suggestionsCount?: number;
  suggestionsRefreshIndex?: number;
  
  // NO incluir: userSelection, visibleTextBlock, sectionContent, question, suggestionText
}

/**
 * Trackear evento de telemetría
 * 
 * @param eventType - Tipo de evento
 * @param payload - Payload del evento (redacted)
 */
export const trackAIExpandEvent = (
  eventType: AIExpandEventType,
  payload: AIExpandTelemetryPayload = {}
): void => {
  try {
    // Intentar usar el sistema de analítica global si existe
    if (typeof window !== 'undefined') {
      // Verificar si hay un sistema de analítica global
      const analytics = (window as any).analytics || (window as any).gtag || (window as any).trackEvent;
      
      if (analytics && typeof analytics === 'function') {
        analytics(eventType, payload);
        return;
      }
      
      // Intentar con window.dataLayer (Google Tag Manager)
      if ((window as any).dataLayer && Array.isArray((window as any).dataLayer)) {
        (window as any).dataLayer.push({
          event: eventType,
          ...payload,
        });
        return;
      }
      
      // Intentar con window.trackEvent si existe
      if (typeof (window as any).trackEvent === 'function') {
        (window as any).trackEvent(eventType, payload);
        return;
      }
    }
    
    // Fallback: usar console.info en desarrollo
    if (process.env.NODE_ENV === 'development') {
      console.info('[Telemetry]', eventType, payload);
    }
  } catch (error) {
    // Silenciar errores de telemetría para no romper la app
    if (process.env.NODE_ENV === 'development') {
      console.debug('[Telemetry] Error tracking event:', error);
    }
  }
};

/**
 * Helper para trackear click en el expansor
 */
export const trackExpandClick = (payload: AIExpandTelemetryPayload): void => {
  trackAIExpandEvent('ai_expand_click', payload);
};

/**
 * Helper para trackear modo de apertura
 */
export const trackOpenMode = (mode: OpenMode, payload: AIExpandTelemetryPayload): void => {
  trackAIExpandEvent('ai_expand_open_mode', {
    ...payload,
    openMode: mode,
  });
};

/**
 * Helper para trackear solicitud de expansión
 */
export const trackExpandRequest = (payload: AIExpandTelemetryPayload): void => {
  trackAIExpandEvent('ai_expand_request', payload);
};

/**
 * Helper para trackear éxito de expansión
 */
export const trackExpandSuccess = (
  payload: AIExpandTelemetryPayload & { requestDuration: number }
): void => {
  trackAIExpandEvent('ai_expand_success', payload);
};

/**
 * Helper para trackear error de expansión
 */
export const trackExpandError = (
  payload: AIExpandTelemetryPayload & {
    errorCode: string;
    errorStatus?: number;
  }
): void => {
  trackAIExpandEvent('ai_expand_error', payload);
};

/**
 * Helper para trackear fallback offline
 */
export const trackOfflineFallback = (payload: AIExpandTelemetryPayload): void => {
  trackAIExpandEvent('ai_expand_offline_fallback', {
    ...payload,
    isOffline: true,
  });
};

/**
 * Helper para trackear visualización de sugerencias
 */
export const trackSuggestionView = (payload: AIExpandTelemetryPayload & {
  suggestionsCount: number;
}): void => {
  trackAIExpandEvent('ai_suggestion_view', payload);
};

/**
 * Helper para trackear click en sugerencia
 */
export const trackSuggestionClick = (payload: AIExpandTelemetryPayload & {
  suggestionId: string;
  suggestionLength: number;
}): void => {
  trackAIExpandEvent('ai_suggestion_click', payload);
};

/**
 * Helper para trackear refresh de sugerencias
 */
export const trackSuggestionsRefresh = (payload: AIExpandTelemetryPayload & {
  suggestionsRefreshIndex: number;
  suggestionsCount: number;
}): void => {
  trackAIExpandEvent('ai_suggestions_refresh', payload);
};

export default {
  trackExpandClick,
  trackOpenMode,
  trackExpandRequest,
  trackExpandSuccess,
  trackExpandError,
  trackOfflineFallback,
  trackSuggestionView,
  trackSuggestionClick,
  trackSuggestionsRefresh,
};

