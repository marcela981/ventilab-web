/**
 * =============================================================================
 * TutorAI Pop-Up Component
 * =============================================================================
 * 
 * Componente Pop-Up mejorado del TutorAI con tres secciones:
 * - Sugerencias: Acciones inteligentes (IA y locales)
 * - Notas: Editor de notas persistentes por contexto
 * - Guardados del Chat: Explicaciones guardadas desde Expansión de Tema con IA
 * 
 * Reutiliza sendLessonAI y buildLessonContext del servicio compartido.
 * 
 * @component
 */

import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import PropTypes from 'prop-types';
import {
  Box,
  Paper,
  IconButton,
  Typography,
  TextField,
  Button,
  Tabs,
  Tab,
  Chip,
  CircularProgress,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  Snackbar,
  Alert,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
} from '@mui/material';
import {
  Chat as ChatIcon,
  Close as CloseIcon,
  SmartToy as SmartToyIcon,
  Lightbulb as LightbulbIcon,
  Note as NoteIcon,
  Bookmark as BookmarkIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  ContentCopy as DuplicateIcon,
  Download as DownloadIcon,
  Star as StarIcon,
  AutoAwesome as SparklesIcon,
} from '@mui/icons-material';
import { styled } from '@mui/material/styles';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { sendLessonAI } from '../../../../services/ai/sharedAI';
import { buildLessonContext, toTutorAILessonContext } from '../../../../services/ai/contextBuilder';
import { getSuggestions } from '../../../../services/tutor/suggestions';
import notesService from '../../../../services/notes/notesService';

/**
 * FAB (Floating Action Button) estilizado
 */
const StyledFAB = styled(IconButton)(({ theme }) => ({
  position: 'fixed',
  right: 24,
  bottom: 24,
  width: 56,
  height: 56,
  backgroundColor: '#0BBAF4',
  color: '#FFFFFF',
  zIndex: 1600,
  boxShadow: '0 4px 12px rgba(11, 186, 244, 0.4)',
  '&:hover': {
    backgroundColor: '#0288d1',
    boxShadow: '0 6px 16px rgba(11, 186, 244, 0.5)',
  },
  '&:focus-visible': {
    outline: '2px solid #BBECFC',
    outlineOffset: '2px',
  },
}));

/**
 * Panel del Pop-Up estilizado
 */
const PopupPanel = styled(Paper)(({ theme }) => ({
  position: 'fixed',
  right: 24,
  bottom: 24,
  width: 450,
  height: 600,
  zIndex: 1600,
  display: 'flex',
  flexDirection: 'column',
  backgroundColor: 'rgba(31, 31, 31, 0.95)',
  backdropFilter: 'blur(10px)',
  border: '1px solid rgba(11, 186, 244, 0.3)',
  borderRadius: 16,
  boxShadow: '0 8px 32px rgba(0, 0, 0, 0.4)',
  overflow: 'hidden',
}));

/**
 * TutorAIPopup - Componente Pop-Up mejorado del TutorAI
 */
const TutorAIPopup = ({ 
  lessonContext,
  context, // Contexto completo con moduleId, lessonId, pageId, titles
  defaultOpen = false,
  defaultTab = 'suggestions',
}) => {
  // Estados principales
  const [open, setOpen] = useState(defaultOpen);
  const [activeTab, setActiveTab] = useState(defaultTab);
  const [suggestions, setSuggestions] = useState([]);
  const [notes, setNotes] = useState([]);
  const [savedChat, setSavedChat] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });
  
  // Estados de notas
  const [currentNote, setCurrentNote] = useState({ content: '', title: '' });
  const [editingNote, setEditingNote] = useState(null);
  const [noteSaving, setNoteSaving] = useState(false);
  const [noteSaved, setNoteSaved] = useState(false);
  const [lastSaved, setLastSaved] = useState(null);
  
  // Estados de diálogo
  const [deleteDialog, setDeleteDialog] = useState({ open: false, noteId: null });
  
  // Referencias
  const noteEditorRef = useRef(null);
  const autoSaveTimerRef = useRef(null);
  const expansionPanelRef = useRef(null);

  // Construir contexto de notas
  const noteContext = useMemo(() => ({
    userId: context?.userId,
    moduleId: context?.moduleId || lessonContext?.moduleId,
    lessonId: context?.lessonId || lessonContext?.lessonId,
    pageId: context?.pageId || context?.sectionId,
  }), [context, lessonContext]);

  // Construir contexto de sugerencias
  const suggestionContext = useMemo(() => ({
    userId: context?.userId,
    moduleId: context?.moduleId || lessonContext?.moduleId,
    lessonId: context?.lessonId || lessonContext?.lessonId,
    pageId: context?.pageId || context?.sectionId,
    moduleTitle: context?.moduleTitle,
    lessonTitle: context?.lessonTitle || lessonContext?.title,
    pageTitle: context?.pageTitle || context?.sectionTitle,
  }), [context, lessonContext]);

  /**
   * Manejar sugerencia de IA (abrir Expansión de Tema con IA)
   */
  const handleAISuggestion = useCallback(async (prompt, tutorAIContext) => {
    try {
      // Disparar evento para abrir Expansión de Tema con IA con el prompt prellenado
      const event = new CustomEvent('aiExpansion:openWithPrompt', {
        detail: {
          prompt,
          context: tutorAIContext,
          moduleId: context?.moduleId,
          lessonId: context?.lessonId || lessonContext?.lessonId,
          pageId: context?.pageId || context?.sectionId,
        },
      });
      window.dispatchEvent(event);
      
      // Cerrar el Pop-Up
      setOpen(false);
    } catch (error) {
      console.error('[TutorAIPopup] Error handling AI suggestion:', error);
      setSnackbar({ open: true, message: 'Error al abrir Expansión de Tema', severity: 'error' });
    }
  }, [context, lessonContext]);

  /**
   * Cargar sugerencias
   */
  const loadSuggestions = useCallback(async (isPostLesson = false, results = null) => {
    try {
      setLoading(true);
      const ctx = { ...suggestionContext, results };
      const suggestionsList = await getSuggestions(
        ctx,
        handleAISuggestion,
        isPostLesson
      );
      setSuggestions(suggestionsList);
    } catch (error) {
      console.error('[TutorAIPopup] Error loading suggestions:', error);
      setError('Error al cargar sugerencias');
    } finally {
      setLoading(false);
    }
  }, [suggestionContext, handleAISuggestion]);

  /**
   * Cargar notas
   */
  const loadNotes = useCallback(async () => {
    try {
      setLoading(true);
      const loadedNotes = await notesService.getNotes(noteContext);
      // Ordenar por fecha (más recientes primero)
      loadedNotes.sort((a, b) => 
        new Date(b.updatedAt || b.createdAt).getTime() - new Date(a.updatedAt || a.createdAt).getTime()
      );
      setNotes(loadedNotes);
    } catch (error) {
      console.error('[TutorAIPopup] Error loading notes:', error);
      setError('Error al cargar notas');
    } finally {
      setLoading(false);
    }
  }, [noteContext]);

  /**
   * Cargar guardados del chat
   */
  const loadSavedChat = useCallback(async () => {
    try {
      setLoading(true);
      const allNotes = await notesService.getNotes(noteContext);
      // Filtrar solo notas de origen IA
      const aiNotes = allNotes.filter(note => note.source === 'ai');
      // Ordenar por fecha (más recientes primero)
      aiNotes.sort((a, b) => 
        new Date(b.updatedAt || b.createdAt).getTime() - new Date(a.updatedAt || a.createdAt).getTime()
      );
      setSavedChat(aiNotes);
    } catch (error) {
      console.error('[TutorAIPopup] Error loading saved chat:', error);
      setError('Error al cargar guardados');
    } finally {
      setLoading(false);
    }
  }, [noteContext]);

  // Cargar notas al montar y cuando cambia el contexto
  useEffect(() => {
    if (open && activeTab === 'notes') {
      loadNotes();
    }
  }, [open, activeTab, noteContext, loadNotes]);

  // Cargar guardados del chat al montar y cuando cambia el contexto
  useEffect(() => {
    if (open && activeTab === 'saved') {
      loadSavedChat();
    }
  }, [open, activeTab, noteContext, loadSavedChat]);

  // Cargar sugerencias al montar y cuando cambia el contexto
  useEffect(() => {
    if (open && activeTab === 'suggestions') {
      loadSuggestions();
    }
  }, [open, activeTab, suggestionContext, loadSuggestions]);

  // Escuchar eventos de ejercicio final/quiz completado
  useEffect(() => {
    const handleFinalSuggestions = (event) => {
      const { ctx, results } = event.detail;
      setActiveTab('suggestions');
      setOpen(true);
      loadSuggestions(true, results);
    };

    const handleNoteSaved = (event) => {
      const { message } = event.detail;
      setSnackbar({ open: true, message: message || 'Guardado en TutorAI ▸ Guardados del Chat', severity: 'success' });
      // Recargar guardados del chat si estamos en esa tab
      if (activeTab === 'saved') {
        loadSavedChat();
      }
    };

    window.addEventListener('tutor:finalSuggestions', handleFinalSuggestions);
    window.addEventListener('tutor:note-saved', handleNoteSaved);
    return () => {
      window.removeEventListener('tutor:finalSuggestions', handleFinalSuggestions);
      window.removeEventListener('tutor:note-saved', handleNoteSaved);
    };
  }, [activeTab, loadSavedChat, loadSuggestions]);

  /**
   * Crear nota
   */
  const createNote = useCallback(async (note) => {
    try {
      setNoteSaving(true);
      const created = await notesService.createNote(noteContext, note);
      setNotes(prev => [created, ...prev]);
      setSnackbar({ open: true, message: 'Nota guardada', severity: 'success' });
      setNoteSaved(true);
      setLastSaved(new Date());
      setTimeout(() => setNoteSaved(false), 2000);
    } catch (error) {
      console.error('[TutorAIPopup] Error creating note:', error);
      setSnackbar({ open: true, message: 'Error al guardar nota', severity: 'error' });
    } finally {
      setNoteSaving(false);
    }
  }, [noteContext]);

  /**
   * Actualizar nota
   */
  const updateNote = useCallback(async (note) => {
    try {
      setNoteSaving(true);
      const updated = await notesService.updateNote(noteContext, note);
      setNotes(prev => prev.map(n => n.id === note.id ? updated : n));
      setSnackbar({ open: true, message: 'Nota actualizada', severity: 'success' });
      setNoteSaved(true);
      setLastSaved(new Date());
      setTimeout(() => setNoteSaved(false), 2000);
    } catch (error) {
      console.error('[TutorAIPopup] Error updating note:', error);
      setSnackbar({ open: true, message: 'Error al actualizar nota', severity: 'error' });
    } finally {
      setNoteSaving(false);
    }
  }, [noteContext]);

  /**
   * Eliminar nota
   */
  const deleteNote = useCallback(async (noteId) => {
    try {
      await notesService.deleteNote(noteContext, noteId);
      setNotes(prev => prev.filter(n => n.id !== noteId));
      setSavedChat(prev => prev.filter(n => n.id !== noteId));
      setSnackbar({ open: true, message: 'Nota eliminada', severity: 'success' });
      setDeleteDialog({ open: false, noteId: null });
    } catch (error) {
      console.error('[TutorAIPopup] Error deleting note:', error);
      setSnackbar({ open: true, message: 'Error al eliminar nota', severity: 'error' });
    }
  }, [noteContext]);

  // Escuchar eventos de crear nota
  useEffect(() => {
    const handleCreateNote = () => {
      setActiveTab('notes');
      setOpen(true);
      if (noteEditorRef.current) {
        setTimeout(() => {
          noteEditorRef.current?.focus();
        }, 100);
      }
    };

    const handleAddToSummary = () => {
      // Duplicar último guardado del chat como nota
      if (savedChat.length > 0) {
        const lastSaved = savedChat[0];
        const newNote = {
          content: lastSaved.content,
          title: `Resumen - ${lastSaved.title || new Date().toLocaleDateString()}`,
          source: 'user',
          tags: ['resumen'],
        };
        createNote(newNote);
        setSnackbar({ open: true, message: 'Nota creada desde resumen', severity: 'success' });
      }
    };

    const handleCreateChecklist = (event) => {
      const { template } = event.detail;
      const newNote = {
        content: template,
        title: 'Checklist de la lección',
        source: 'user',
        tags: ['checklist'],
      };
      createNote(newNote);
      setActiveTab('notes');
      setOpen(true);
    };

    window.addEventListener('tutor:create-note', handleCreateNote);
    window.addEventListener('tutor:add-to-summary', handleAddToSummary);
    window.addEventListener('tutor:create-checklist', handleCreateChecklist);

    return () => {
      window.removeEventListener('tutor:create-note', handleCreateNote);
      window.removeEventListener('tutor:add-to-summary', handleAddToSummary);
      window.removeEventListener('tutor:create-checklist', handleCreateChecklist);
    };
  }, [savedChat, createNote]);

  /**
   * Auto-guardado de nota (cada 2 segundos de inactividad)
   */
  useEffect(() => {
    if (autoSaveTimerRef.current) {
      clearTimeout(autoSaveTimerRef.current);
    }

    if (currentNote.content.trim() || currentNote.title.trim()) {
      autoSaveTimerRef.current = setTimeout(() => {
        if (editingNote) {
          updateNote({ ...editingNote, ...currentNote });
        } else if (currentNote.content.trim() || currentNote.title.trim()) {
          createNote(currentNote);
        }
      }, 2000);
    }

    return () => {
      if (autoSaveTimerRef.current) {
        clearTimeout(autoSaveTimerRef.current);
      }
    };
  }, [currentNote, editingNote, createNote, updateNote]);

  /**
   * Manejar teclado en editor de notas
   */
  const handleNoteKeyDown = useCallback((e) => {
    // Ctrl/Cmd+S para forzar guardado
    if ((e.ctrlKey || e.metaKey) && e.key === 's') {
      e.preventDefault();
      if (editingNote) {
        updateNote({ ...editingNote, ...currentNote });
      } else if (currentNote.content.trim() || currentNote.title.trim()) {
        createNote(currentNote);
      }
    }
    // Ctrl/Cmd+Enter para crear nueva nota
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
      e.preventDefault();
      if (currentNote.content.trim() || currentNote.title.trim()) {
        createNote(currentNote);
        setCurrentNote({ content: '', title: '' });
        setEditingNote(null);
      }
    }
  }, [currentNote, editingNote, createNote, updateNote]);

  /**
   * Exportar notas a Markdown
   */
  const exportNotes = useCallback(() => {
    try {
      const markdown = notes.map(note => {
        const title = note.title || 'Sin título';
        const date = new Date(note.createdAt).toLocaleString('es-ES');
        return `# ${title}\n\n**Fecha:** ${date}\n\n${note.content}\n\n---\n\n`;
      }).join('\n');

      const blob = new Blob([markdown], { type: 'text/markdown' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `notas-${context?.moduleId || 'default'}-${context?.lessonId || 'default'}-${Date.now()}.md`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      setSnackbar({ open: true, message: 'Notas exportadas', severity: 'success' });
    } catch (error) {
      console.error('[TutorAIPopup] Error exporting notes:', error);
      setSnackbar({ open: true, message: 'Error al exportar notas', severity: 'error' });
    }
  }, [notes, context]);

  /**
   * Mover guardado del chat a notas
   */
  const moveToNotes = useCallback(async (savedItem) => {
    try {
      const newNote = {
        content: savedItem.content,
        title: savedItem.title || `Nota desde guardado - ${new Date().toLocaleDateString()}`,
        source: 'user',
        tags: [...(savedItem.tags || []), 'from-chat'],
      };
      await createNote(newNote);
      setSnackbar({ open: true, message: 'Movido a notas', severity: 'success' });
    } catch (error) {
      console.error('[TutorAIPopup] Error moving to notes:', error);
      setSnackbar({ open: true, message: 'Error al mover a notas', severity: 'error' });
    }
  }, [createNote]);

  /**
   * Renderizar sección de sugerencias
   */
  const renderSuggestions = () => {
    if (loading) {
      return (
        <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', flex: 1 }}>
          <CircularProgress size={24} sx={{ color: '#0BBAF4' }} />
        </Box>
      );
    }

    return (
      <Box sx={{ p: 2, overflowY: 'auto', flex: 1 }}>
        {suggestions.map((suggestion) => (
          <Button
            key={suggestion.id}
            fullWidth
            variant="outlined"
            onClick={suggestion.onClick}
            sx={{
              mb: 1,
              p: 1.5,
              textAlign: 'left',
              justifyContent: 'flex-start',
              color: '#FFFFFF',
              borderColor: 'rgba(11, 186, 244, 0.3)',
              '&:hover': {
                borderColor: '#0BBAF4',
                backgroundColor: 'rgba(11, 186, 244, 0.1)',
              },
            }}
          >
            <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: 0.5 }}>
              <Typography variant="body2" sx={{ fontWeight: 500 }}>
                {suggestion.label}
              </Typography>
              {suggestion.description && (
                <Typography variant="caption" sx={{ color: 'rgba(255, 255, 255, 0.6)' }}>
                  {suggestion.description}
                </Typography>
              )}
            </Box>
          </Button>
        ))}
      </Box>
    );
  };

  /**
   * Renderizar sección de notas
   */
  const renderNotes = () => {
    const placeholder = `Escribe tus apuntes de ${context?.moduleTitle || ''} → ${context?.lessonTitle || ''} → ${context?.pageTitle || ''}...`;

    return (
      <Box sx={{ display: 'flex', flexDirection: 'column', flex: 1, overflow: 'hidden' }}>
        {/* Editor de notas */}
        <Box sx={{ p: 2, borderBottom: '1px solid rgba(11, 186, 244, 0.2)' }}>
          <TextField
            inputRef={noteEditorRef}
            fullWidth
            multiline
            minRows={3}
            maxRows={6}
            placeholder={placeholder}
            value={currentNote.content}
            onChange={(e) => setCurrentNote(prev => ({ ...prev, content: e.target.value }))}
            onKeyDown={handleNoteKeyDown}
            sx={{
              '& .MuiOutlinedInput-root': {
                backgroundColor: 'rgba(255, 255, 255, 0.1)',
                color: '#FFFFFF',
                '& fieldset': {
                  borderColor: 'rgba(11, 186, 244, 0.3)',
                },
                '&:hover fieldset': {
                  borderColor: 'rgba(11, 186, 244, 0.5)',
                },
                '&.Mui-focused fieldset': {
                  borderColor: '#0BBAF4',
                },
              },
            }}
          />
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mt: 1 }}>
            <Typography variant="caption" sx={{ color: 'rgba(255, 255, 255, 0.6)' }}>
              {noteSaving ? 'Guardando...' : noteSaved ? `Guardado · ${lastSaved?.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}` : 'Auto-guardado cada 2s'}
            </Typography>
            <Button
              size="small"
              startIcon={<DownloadIcon />}
              onClick={exportNotes}
              sx={{ color: '#0BBAF4' }}
            >
              Exportar
            </Button>
          </Box>
        </Box>

        {/* Lista de notas */}
        <Box sx={{ flex: 1, overflowY: 'auto', p: 2 }}>
          {notes.length === 0 ? (
            <Typography variant="body2" sx={{ color: 'rgba(255, 255, 255, 0.6)', textAlign: 'center', mt: 4 }}>
              No hay notas aún. ¡Empieza a escribir!
            </Typography>
          ) : (
            <List>
              {notes.map((note) => (
                <ListItem
                  key={note.id}
                  sx={{
                    mb: 1,
                    backgroundColor: 'rgba(11, 186, 244, 0.05)',
                    borderRadius: 1,
                    '&:hover': {
                      backgroundColor: 'rgba(11, 186, 244, 0.1)',
                    },
                  }}
                >
                  <ListItemText
                    primary={note.title || 'Sin título'}
                    secondary={
                      <Box>
                        <Typography variant="caption" sx={{ color: 'rgba(255, 255, 255, 0.6)' }}>
                          {new Date(note.createdAt).toLocaleString('es-ES')}
                        </Typography>
                        <Typography variant="body2" sx={{ color: '#FFFFFF', mt: 0.5 }}>
                          {note.content.substring(0, 100)}{note.content.length > 100 ? '...' : ''}
                        </Typography>
                      </Box>
                    }
                  />
                  <ListItemSecondaryAction>
                    <IconButton
                      size="small"
                      onClick={() => {
                        setEditingNote(note);
                        setCurrentNote({ content: note.content, title: note.title || '' });
                      }}
                      sx={{ color: '#0BBAF4', mr: 0.5 }}
                    >
                      <EditIcon fontSize="small" />
                    </IconButton>
                    <IconButton
                      size="small"
                      onClick={() => {
                        const duplicated = {
                          content: note.content,
                          title: `${note.title || 'Nota'} (copia)`,
                          source: note.source,
                          tags: note.tags,
                        };
                        createNote(duplicated);
                      }}
                      sx={{ color: '#0BBAF4', mr: 0.5 }}
                    >
                      <DuplicateIcon fontSize="small" />
                    </IconButton>
                    <IconButton
                      size="small"
                      onClick={() => setDeleteDialog({ open: true, noteId: note.id })}
                      sx={{ color: '#f44336' }}
                    >
                      <DeleteIcon fontSize="small" />
                    </IconButton>
                  </ListItemSecondaryAction>
                </ListItem>
              ))}
            </List>
          )}
        </Box>
      </Box>
    );
  };

  /**
   * Renderizar sección de guardados del chat
   */
  const renderSavedChat = () => {
    if (loading) {
      return (
        <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', flex: 1 }}>
          <CircularProgress size={24} sx={{ color: '#0BBAF4' }} />
        </Box>
      );
    }

    return (
      <Box sx={{ flex: 1, overflowY: 'auto', p: 2 }}>
        {savedChat.length === 0 ? (
          <Typography variant="body2" sx={{ color: 'rgba(255, 255, 255, 0.6)', textAlign: 'center', mt: 4 }}>
            No hay guardados del chat aún. Guarda explicaciones desde "Expansión de Tema con IA".
          </Typography>
        ) : (
          <List>
            {savedChat.map((saved) => (
              <ListItem
                key={saved.id}
                sx={{
                  mb: 2,
                  flexDirection: 'column',
                  alignItems: 'flex-start',
                  backgroundColor: 'rgba(11, 186, 244, 0.05)',
                  borderRadius: 1,
                  p: 2,
                }}
              >
                <Box sx={{ width: '100%', display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                  <Typography variant="subtitle2" sx={{ color: '#0BBAF4', fontWeight: 600 }}>
                    {saved.title || 'Explicación guardada'}
                  </Typography>
                  <Typography variant="caption" sx={{ color: 'rgba(255, 255, 255, 0.6)' }}>
                    {new Date(saved.createdAt).toLocaleString('es-ES')}
                  </Typography>
                </Box>
                <Box
                  sx={{
                    color: '#FFFFFF',
                    '& p': { color: '#FFFFFF', margin: 0 },
                    '& strong': { color: '#BBECFC' },
                  }}
                >
                  <ReactMarkdown remarkPlugins={[remarkGfm]}>
                    {saved.content.substring(0, 200)}{saved.content.length > 200 ? '...' : ''}
                  </ReactMarkdown>
                </Box>
                {saved.meta && (
                  <Typography variant="caption" sx={{ color: 'rgba(255, 255, 255, 0.5)', mt: 1 }}>
                    {saved.meta.provider && `Proveedor: ${saved.meta.provider}`}
                    {saved.meta.tokensEstimados && ` · Tokens: ~${saved.meta.tokensEstimados}`}
                  </Typography>
                )}
                <Button
                  size="small"
                  startIcon={<NoteIcon />}
                  onClick={() => moveToNotes(saved)}
                  sx={{ mt: 1, color: '#0BBAF4' }}
                >
                  Mover a Notas
                </Button>
              </ListItem>
            ))}
          </List>
        )}
      </Box>
    );
  };

  return (
    <>
      {/* FAB - Siempre visible */}
      {!open && (
        <StyledFAB
          onClick={() => setOpen(true)}
          aria-label="Abrir TutorAI"
          size="large"
        >
          <SmartToyIcon />
        </StyledFAB>
      )}

      {/* Panel del Pop-Up */}
      {open && (
        <PopupPanel>
          {/* Encabezado */}
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              p: 2,
              borderBottom: '1px solid rgba(11, 186, 244, 0.2)',
              backgroundColor: 'rgba(11, 186, 244, 0.1)',
            }}
          >
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <SmartToyIcon sx={{ color: '#0BBAF4', fontSize: 24 }} />
              <Typography
                variant="h6"
                sx={{
                  color: '#FFFFFF',
                  fontWeight: 600,
                  fontSize: '1rem',
                }}
              >
                TutorAI
              </Typography>
            </Box>
            <IconButton
              onClick={() => setOpen(false)}
              size="small"
              sx={{
                color: '#BBECFC',
                '&:hover': {
                  backgroundColor: 'rgba(11, 186, 244, 0.2)',
                },
              }}
              aria-label="Cerrar"
            >
              <CloseIcon fontSize="small" />
            </IconButton>
          </Box>

          {/* Tabs */}
          <Tabs
            value={activeTab}
            onChange={(e, newValue) => setActiveTab(newValue)}
            sx={{
              borderBottom: '1px solid rgba(11, 186, 244, 0.2)',
              '& .MuiTab-root': {
                color: 'rgba(255, 255, 255, 0.6)',
                minWidth: 120,
                '&.Mui-selected': {
                  color: '#0BBAF4',
                },
              },
              '& .MuiTabs-indicator': {
                backgroundColor: '#0BBAF4',
              },
            }}
          >
            <Tab
              icon={<LightbulbIcon />}
              iconPosition="start"
              label="Sugerencias"
              value="suggestions"
            />
            <Tab
              icon={<NoteIcon />}
              iconPosition="start"
              label="Notas"
              value="notes"
            />
            <Tab
              icon={<BookmarkIcon />}
              iconPosition="start"
              label="Guardados"
              value="saved"
            />
          </Tabs>

          {/* Contenido de las tabs */}
          <Box sx={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
            {activeTab === 'suggestions' && renderSuggestions()}
            {activeTab === 'notes' && renderNotes()}
            {activeTab === 'saved' && renderSavedChat()}
          </Box>

          {/* Mensaje de error */}
          {error && (
            <Box
              sx={{
                p: 1,
                backgroundColor: 'rgba(244, 67, 54, 0.2)',
                borderTop: '1px solid rgba(244, 67, 54, 0.3)',
              }}
            >
              <Typography
                variant="caption"
                sx={{
                  color: '#ffcdd2',
                  fontSize: '0.75rem',
                }}
              >
                {error}
              </Typography>
            </Box>
          )}
        </PopupPanel>
      )}

      {/* Dialog de confirmación de eliminación */}
      <Dialog open={deleteDialog.open} onClose={() => setDeleteDialog({ open: false, noteId: null })}>
        <DialogTitle>Eliminar nota</DialogTitle>
        <DialogContent>
          <Typography>¿Estás seguro de que deseas eliminar esta nota?</Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteDialog({ open: false, noteId: null })}>Cancelar</Button>
          <Button onClick={() => deleteNote(deleteDialog.noteId)} color="error" variant="contained">
            Eliminar
          </Button>
        </DialogActions>
      </Dialog>

      {/* Snackbar para notificaciones */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={3000}
        onClose={() => setSnackbar(prev => ({ ...prev, open: false }))}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert severity={snackbar.severity} onClose={() => setSnackbar(prev => ({ ...prev, open: false }))}>
          {snackbar.message}
        </Alert>
      </Snackbar>
    </>
  );
};

TutorAIPopup.propTypes = {
  lessonContext: PropTypes.shape({
    lessonId: PropTypes.string,
    title: PropTypes.string,
    objectives: PropTypes.arrayOf(PropTypes.string),
    tags: PropTypes.arrayOf(PropTypes.string),
    tipoDeLeccion: PropTypes.oneOf(['teoria', 'caso_clinico', 'simulacion', 'evaluacion']),
  }),
  context: PropTypes.shape({
    userId: PropTypes.string,
    moduleId: PropTypes.string,
    lessonId: PropTypes.string,
    pageId: PropTypes.string,
    sectionId: PropTypes.string,
    moduleTitle: PropTypes.string,
    lessonTitle: PropTypes.string,
    pageTitle: PropTypes.string,
    sectionTitle: PropTypes.string,
  }),
  defaultOpen: PropTypes.bool,
  defaultTab: PropTypes.oneOf(['suggestions', 'notes', 'saved']),
};

TutorAIPopup.defaultProps = {
  defaultOpen: false,
  defaultTab: 'suggestions',
};

export default TutorAIPopup;

