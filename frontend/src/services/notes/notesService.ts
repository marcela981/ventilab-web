/**
 * =============================================================================
 * Notes Service
 * =============================================================================
 * 
 * Servicio para gestión de notas persistentes por contexto (módulo/lección/página).
 * Soporta localStorage (siempre disponible) y API backend (opcional, degrada silenciosamente).
 * 
 * @service
 */

export interface NoteContext {
  userId?: string;
  moduleId?: string;
  lessonId?: string;
  pageId?: string;
}

export interface Note {
  id: string;
  userId?: string;
  moduleId?: string;
  lessonId?: string;
  pageId?: string;
  title?: string;
  content: string;
  source: 'user' | 'ai';
  tags?: string[];
  createdAt: string;
  updatedAt: string;
  synced?: boolean;
  meta?: {
    provider?: string;
    tokensEstimados?: number;
    messageId?: string;
    ts?: number;
  };
}

/**
 * Obtener ID de usuario actual
 */
const getUserId = (): string | undefined => {
  if (typeof window === 'undefined') return undefined;
  // Intentar obtener desde localStorage/sessionStorage
  const token = localStorage.getItem('token') || sessionStorage.getItem('token');
  if (token) {
    try {
      // Decodificar JWT básico (solo para obtener userId, no validar)
      const payload = JSON.parse(atob(token.split('.')[1]));
      return payload.userId || payload.id || payload.sub;
    } catch (e) {
      // Si no es JWT o falla, usar 'anon'
      return undefined;
    }
  }
  return undefined;
};

/**
 * Generar clave de localStorage para notas
 */
const getStorageKey = (ctx: NoteContext): string => {
  const userId = ctx.userId || getUserId() || 'anon';
  const moduleId = ctx.moduleId || 'default';
  const lessonId = ctx.lessonId || 'default';
  const pageId = ctx.pageId || 'default';
  return `notes:${userId}:${moduleId}:${lessonId}:${pageId}`;
};

/**
 * Adaptador de localStorage
 */
const localStorageAdapter = {
  /**
   * Obtener todas las notas del contexto
   */
  getNotes: (ctx: NoteContext): Note[] => {
    try {
      const key = getStorageKey(ctx);
      const stored = localStorage.getItem(key);
      if (stored) {
        const notes = JSON.parse(stored);
        return Array.isArray(notes) ? notes : [];
      }
      return [];
    } catch (error) {
      console.warn('[notesService] Error reading from localStorage:', error);
      return [];
    }
  },

  /**
   * Guardar nota en localStorage
   */
  saveNote: (ctx: NoteContext, note: Partial<Note>): Note => {
    const userId = ctx.userId || getUserId() || 'anon';
    const now = new Date().toISOString();
    const noteId = note.id || `note-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    
    const fullNote: Note = {
      id: noteId,
      userId,
      moduleId: ctx.moduleId,
      lessonId: ctx.lessonId,
      pageId: ctx.pageId,
      title: note.title || '',
      content: note.content || '',
      source: note.source || 'user',
      tags: note.tags || [],
      createdAt: note.createdAt || now,
      updatedAt: now,
      synced: false, // localStorage no está sincronizado con backend
      meta: note.meta,
    };

    try {
      const key = getStorageKey(ctx);
      const existingNotes = localStorageAdapter.getNotes(ctx);
      const existingIndex = existingNotes.findIndex(n => n.id === noteId);
      
      if (existingIndex >= 0) {
        // Actualizar nota existente
        existingNotes[existingIndex] = { ...existingNotes[existingIndex], ...fullNote, updatedAt: now };
      } else {
        // Agregar nueva nota
        existingNotes.push(fullNote);
      }

      localStorage.setItem(key, JSON.stringify(existingNotes));
      return fullNote;
    } catch (error) {
      console.error('[notesService] Error saving to localStorage:', error);
      throw error;
    }
  },

  /**
   * Eliminar nota
   */
  deleteNote: (ctx: NoteContext, noteId: string): void => {
    try {
      const key = getStorageKey(ctx);
      const existingNotes = localStorageAdapter.getNotes(ctx);
      const filteredNotes = existingNotes.filter(n => n.id !== noteId);
      localStorage.setItem(key, JSON.stringify(filteredNotes));
    } catch (error) {
      console.error('[notesService] Error deleting from localStorage:', error);
      throw error;
    }
  },
};

/**
 * Adaptador de API backend
 */
const apiAdapter = {
  /**
   * Detectar si el endpoint de notas está disponible
   */
  isAvailable: async (): Promise<boolean> => {
    try {
      const token = localStorage.getItem('token') || sessionStorage.getItem('token');
      if (!token) return false;

      const baseUrl = process.env.REACT_APP_API_BASE_URL || process.env.NEXT_PUBLIC_API_BASE_URL || '';
      const response = await fetch(`${baseUrl}/api/notes`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      // Si es 401/403/404, el endpoint no está disponible o no autorizado
      return response.status === 200 || response.status === 401 || response.status === 403;
    } catch (error) {
      return false;
    }
  },

  /**
   * Obtener notas desde API
   */
  getNotes: async (ctx: NoteContext): Promise<Note[]> => {
    try {
      const token = localStorage.getItem('token') || sessionStorage.getItem('token');
      if (!token) return [];

      const baseUrl = process.env.REACT_APP_API_BASE_URL || process.env.NEXT_PUBLIC_API_BASE_URL || '';
      const params = new URLSearchParams();
      if (ctx.moduleId) params.append('moduleId', ctx.moduleId);
      if (ctx.lessonId) params.append('lessonId', ctx.lessonId);
      if (ctx.pageId) params.append('pageId', ctx.pageId);

      const response = await fetch(`${baseUrl}/api/notes?${params.toString()}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (response.status === 401 || response.status === 403 || response.status === 404) {
        // Degradar silenciosamente a localStorage
        return localStorageAdapter.getNotes(ctx);
      }

      if (!response.ok) {
        throw new Error(`API error: ${response.status}`);
      }

      const data = await response.json();
      return Array.isArray(data) ? data : [];
    } catch (error) {
      console.warn('[notesService] API not available, falling back to localStorage:', error);
      return localStorageAdapter.getNotes(ctx);
    }
  },

  /**
   * Guardar/actualizar nota en API
   */
  saveNote: async (ctx: NoteContext, note: Partial<Note>): Promise<Note> => {
    try {
      const token = localStorage.getItem('token') || sessionStorage.getItem('token');
      if (!token) {
        // No hay token, usar localStorage
        return localStorageAdapter.saveNote(ctx, note);
      }

      const baseUrl = process.env.REACT_APP_API_BASE_URL || process.env.NEXT_PUBLIC_API_BASE_URL || '';
      const userId = ctx.userId || getUserId();
      const now = new Date().toISOString();
      const noteId = note.id || `note-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

      const notePayload = {
        id: noteId,
        userId,
        moduleId: ctx.moduleId,
        lessonId: ctx.lessonId,
        pageId: ctx.pageId,
        title: note.title || '',
        content: note.content || '',
        source: note.source || 'user',
        tags: note.tags || [],
        createdAt: note.createdAt || now,
        updatedAt: now,
        meta: note.meta,
      };

      const isUpdate = note.id && note.id !== '';
      const url = isUpdate ? `${baseUrl}/api/notes/${noteId}` : `${baseUrl}/api/notes`;
      const method = isUpdate ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(notePayload),
      });

      if (response.status === 401 || response.status === 403 || response.status === 404) {
        // Degradar silenciosamente a localStorage
        return localStorageAdapter.saveNote(ctx, note);
      }

      if (!response.ok) {
        throw new Error(`API error: ${response.status}`);
      }

      const savedNote = await response.json();
      return { ...savedNote, synced: true };
    } catch (error) {
      console.warn('[notesService] API save failed, using localStorage:', error);
      // Guardar en localStorage y marcar como no sincronizado
      const savedNote = localStorageAdapter.saveNote(ctx, note);
      return { ...savedNote, synced: false };
    }
  },

  /**
   * Eliminar nota en API
   */
  deleteNote: async (ctx: NoteContext, noteId: string): Promise<void> => {
    try {
      const token = localStorage.getItem('token') || sessionStorage.getItem('token');
      if (!token) {
        // No hay token, usar localStorage
        localStorageAdapter.deleteNote(ctx, noteId);
        return;
      }

      const baseUrl = process.env.REACT_APP_API_BASE_URL || process.env.NEXT_PUBLIC_API_BASE_URL || '';
      const response = await fetch(`${baseUrl}/api/notes/${noteId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (response.status === 401 || response.status === 403 || response.status === 404) {
        // Degradar silenciosamente a localStorage
        localStorageAdapter.deleteNote(ctx, noteId);
        return;
      }

      if (!response.ok && response.status !== 404) {
        throw new Error(`API error: ${response.status}`);
      }

      // También eliminar de localStorage si existe
      localStorageAdapter.deleteNote(ctx, noteId);
    } catch (error) {
      console.warn('[notesService] API delete failed, using localStorage:', error);
      localStorageAdapter.deleteNote(ctx, noteId);
    }
  },

  /**
   * Sincronizar notas no sincronizadas
   */
  syncUnsyncedNotes: async (ctx: NoteContext): Promise<void> => {
    try {
      const localNotes = localStorageAdapter.getNotes(ctx);
      const unsyncedNotes = localNotes.filter(n => !n.synced);

      for (const note of unsyncedNotes) {
        try {
          await apiAdapter.saveNote(ctx, note);
          // Marcar como sincronizada en localStorage
          const key = getStorageKey(ctx);
          const allNotes = localStorageAdapter.getNotes(ctx);
          const updatedNotes = allNotes.map(n =>
            n.id === note.id ? { ...n, synced: true } : n
          );
          localStorage.setItem(key, JSON.stringify(updatedNotes));
        } catch (error) {
          console.warn(`[notesService] Failed to sync note ${note.id}:`, error);
        }
      }
    } catch (error) {
      console.warn('[notesService] Error syncing notes:', error);
    }
  },
};

/**
 * API unificada del servicio de notas
 */
export const notesService = {
  /**
   * Obtener todas las notas del contexto
   */
  getNotes: async (ctx: NoteContext): Promise<Note[]> => {
    // Intentar API primero, luego localStorage
    try {
      const apiAvailable = await apiAdapter.isAvailable();
      if (apiAvailable) {
        const apiNotes = await apiAdapter.getNotes(ctx);
        if (apiNotes.length > 0) {
          return apiNotes;
        }
      }
    } catch (error) {
      // Continuar con localStorage
    }
    return localStorageAdapter.getNotes(ctx);
  },

  /**
   * Crear o actualizar nota
   */
  createNote: async (ctx: NoteContext, note: Partial<Note>): Promise<Note> => {
    // Intentar API primero
    try {
      const apiAvailable = await apiAdapter.isAvailable();
      if (apiAvailable) {
        return await apiAdapter.saveNote(ctx, note);
      }
    } catch (error) {
      // Continuar con localStorage
    }
    return localStorageAdapter.saveNote(ctx, note);
  },

  /**
   * Actualizar nota existente
   */
  updateNote: async (ctx: NoteContext, note: Partial<Note>): Promise<Note> => {
    if (!note.id) {
      throw new Error('Note ID is required for update');
    }
    return notesService.createNote(ctx, note);
  },

  /**
   * Eliminar nota
   */
  deleteNote: async (ctx: NoteContext, noteId: string): Promise<void> => {
    // Intentar API primero
    try {
      const apiAvailable = await apiAdapter.isAvailable();
      if (apiAvailable) {
        await apiAdapter.deleteNote(ctx, noteId);
        return;
      }
    } catch (error) {
      // Continuar con localStorage
    }
    localStorageAdapter.deleteNote(ctx, noteId);
  },

  /**
   * Guardar excerpt de IA desde el chat de Expansión
   */
  saveAIExcerpt: async (
    ctx: NoteContext,
    aiMessage: {
      content: string;
      source?: 'ai';
      meta?: {
        provider?: string;
        tokensEstimados?: number;
        messageId?: string;
        ts?: number;
      };
    }
  ): Promise<Note> => {
    const note: Partial<Note> = {
      content: aiMessage.content,
      source: 'ai',
      title: `Respuesta IA - ${new Date().toLocaleDateString()}`,
      meta: aiMessage.meta,
      tags: ['ai', 'expansion'],
    };
    return notesService.createNote(ctx, note);
  },

  /**
   * Sincronizar notas no sincronizadas con backend
   */
  syncNotes: async (ctx: NoteContext): Promise<void> => {
    await apiAdapter.syncUnsyncedNotes(ctx);
  },
};

export default notesService;

