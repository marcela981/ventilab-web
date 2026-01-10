/**
 * Analytics helper para tracking de eventos
 * 
 * Intenta usar el sistema de analítica existente si está disponible,
 * de lo contrario usa console.info como fallback
 */

interface AnalyticsEvent {
  event: string;
  properties?: Record<string, any>;
}

/**
 * Reporta un evento de analítica
 * 
 * @param event - Nombre del evento
 * @param properties - Propiedades adicionales del evento
 */
export const trackEvent = (event: string, properties?: Record<string, any>): void => {
  try {
    // Intentar usar el sistema de analítica global si existe
    if (typeof window !== 'undefined') {
      // Verificar si hay un sistema de analítica global (ej: gtag, analytics, etc.)
      const analytics = (window as any).analytics || (window as any).gtag || (window as any).trackEvent;
      
      if (analytics && typeof analytics === 'function') {
        analytics(event, properties);
        return;
      }
      
      // Intentar con window.dataLayer (Google Tag Manager)
      if ((window as any).dataLayer && Array.isArray((window as any).dataLayer)) {
        (window as any).dataLayer.push({
          event,
          ...properties
        });
        return;
      }
      
      // Intentar con window.trackEvent si existe
      if (typeof (window as any).trackEvent === 'function') {
        (window as any).trackEvent(event, properties);
        return;
      }
    }
    
    // Fallback: usar console.info
    console.info('[Analytics]', event, properties || '');
  } catch (error) {
    // Silenciar errores de analítica para no romper la app
    console.debug('[Analytics] Error tracking event:', error);
  }
};

