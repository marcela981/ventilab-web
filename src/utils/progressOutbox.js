/**
 * Progress Outbox Utilities
 * Gestión del outbox de eventos de progreso para modo offline
 * Alineado con HU-008: Modo offline y reconciliación
 */

const OUTBOX_KEY = 'progress.outbox.v2';
const CONFIRMATION_MAP_KEY = 'progress.confirmation.v2';

/**
 * Genera un ID único para eventos de cliente
 */
export const generateClientEventId = () => {
  return `evt_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
};

/**
 * Obtiene todos los eventos del outbox
 */
export const getOutboxEvents = () => {
  if (typeof window === 'undefined') {
    return [];
  }
  
  try {
    const stored = localStorage.getItem(OUTBOX_KEY);
    if (!stored) {
      return [];
    }
    
    const events = JSON.parse(stored);
    return Array.isArray(events) ? events : [];
  } catch (error) {
    console.error('[progressOutbox] Failed to get outbox events:', error);
    return [];
  }
};

/**
 * Agrega un evento al outbox
 */
export const addToOutbox = (event) => {
  if (typeof window === 'undefined') {
    return;
  }
  
  try {
    const events = getOutboxEvents();
    
    // Validar que el evento tenga los campos requeridos
    if (!event.lessonId || !event.clientEventId) {
      console.error('[progressOutbox] Invalid event:', event);
      return;
    }
    
    // Agregar timestamp si no existe
    if (!event.ts) {
      event.ts = Date.now();
    }
    
    // Evitar duplicados: si ya existe un evento con el mismo clientEventId, reemplazarlo
    const existingIndex = events.findIndex(e => e.clientEventId === event.clientEventId);
    if (existingIndex >= 0) {
      events[existingIndex] = event;
    } else {
      events.push(event);
    }
    
    // Ordenar por timestamp (más antiguos primero)
    events.sort((a, b) => (a.ts || 0) - (b.ts || 0));
    
    localStorage.setItem(OUTBOX_KEY, JSON.stringify(events));
  } catch (error) {
    console.error('[progressOutbox] Failed to add to outbox:', error);
  }
};

/**
 * Elimina eventos confirmados del outbox
 */
export const removeFromOutbox = (clientEventIds) => {
  if (typeof window === 'undefined') {
    return;
  }
  
  try {
    const events = getOutboxEvents();
    const idsToRemove = new Set(Array.isArray(clientEventIds) ? clientEventIds : [clientEventIds]);
    
    const remainingEvents = events.filter(event => !idsToRemove.has(event.clientEventId));
    
    localStorage.setItem(OUTBOX_KEY, JSON.stringify(remainingEvents));
    return remainingEvents.length;
  } catch (error) {
    console.error('[progressOutbox] Failed to remove from outbox:', error);
    return 0;
  }
};

/**
 * Limpia el outbox completamente
 */
export const clearOutbox = () => {
  if (typeof window === 'undefined') {
    return;
  }
  
  try {
    localStorage.removeItem(OUTBOX_KEY);
  } catch (error) {
    console.error('[progressOutbox] Failed to clear outbox:', error);
  }
};

/**
 * Obtiene el mapa de confirmación
 */
export const getConfirmationMap = () => {
  if (typeof window === 'undefined') {
    return {};
  }
  
  try {
    const stored = localStorage.getItem(CONFIRMATION_MAP_KEY);
    if (!stored) {
      return {};
    }
    
    const map = JSON.parse(stored);
    return typeof map === 'object' && map !== null ? map : {};
  } catch (error) {
    console.error('[progressOutbox] Failed to get confirmation map:', error);
    return {};
  }
};

/**
 * Marca un evento como confirmado
 */
export const markAsConfirmed = (clientEventId, serverResponse = null) => {
  if (typeof window === 'undefined') {
    return;
  }
  
  try {
    const map = getConfirmationMap();
    map[clientEventId] = {
      confirmedAt: Date.now(),
      serverResponse,
    };
    
    localStorage.setItem(CONFIRMATION_MAP_KEY, JSON.stringify(map));
  } catch (error) {
    console.error('[progressOutbox] Failed to mark as confirmed:', error);
  }
};

/**
 * Verifica si un evento está confirmado
 */
export const isConfirmed = (clientEventId) => {
  const map = getConfirmationMap();
  return map.hasOwnProperty(clientEventId);
};

/**
 * Limpia eventos confirmados antiguos del mapa de confirmación
 * (para evitar que el mapa crezca indefinidamente)
 */
export const cleanupOldConfirmations = (maxAge = 7 * 24 * 60 * 60 * 1000) => {
  if (typeof window === 'undefined') {
    return;
  }
  
  try {
    const map = getConfirmationMap();
    const now = Date.now();
    const cleaned = {};
    
    for (const [clientEventId, confirmation] of Object.entries(map)) {
      if (confirmation.confirmedAt && (now - confirmation.confirmedAt) < maxAge) {
        cleaned[clientEventId] = confirmation;
      }
    }
    
    localStorage.setItem(CONFIRMATION_MAP_KEY, JSON.stringify(cleaned));
    return Object.keys(map).length - Object.keys(cleaned).length;
  } catch (error) {
    console.error('[progressOutbox] Failed to cleanup confirmations:', error);
    return 0;
  }
};

/**
 * Obtiene estadísticas del outbox
 */
export const getOutboxStats = () => {
  const events = getOutboxEvents();
  const map = getConfirmationMap();
  
  return {
    pendingEvents: events.length,
    confirmedEvents: Object.keys(map).length,
    oldestEvent: events.length > 0 ? events[0].ts : null,
    newestEvent: events.length > 0 ? events[events.length - 1].ts : null,
  };
};

