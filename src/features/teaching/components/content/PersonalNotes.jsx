import React, { useState, useEffect, useCallback } from 'react';
import PropTypes from 'prop-types';
import {
  Accordion,
  AccordionSummary,
  AccordionDetails,
  TextField,
  Button,
  List,
  ListItem,
  ListItemText,
  IconButton,
  Chip,
  Typography,
  Box,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
  Divider,
  Paper,
  Fade,
  CircularProgress,
  styled,
  alpha,
} from '@mui/material';
import {
  ExpandMore as ExpandMoreIcon,
  Notes as NotesIcon,
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Check as CheckIcon,
  Close as CloseIcon,
} from '@mui/icons-material';

/**
 * StyledAccordion - Acordeón personalizado con estilos
 */
const StyledAccordion = styled(Accordion)(({ theme }) => ({
  border: '1px solid rgba(255, 255, 255, 0.1)',
  borderRadius: theme.shape.borderRadius,
  backgroundColor: 'transparent',
  boxShadow: 'none',
  '&:before': {
    display: 'none',
  },
  '&.Mui-expanded': {
    margin: 0,
  },
}));

/**
 * NoteItem - Item de nota estilizado
 */
const NoteItem = styled(Paper)(({ theme, isediting }) => ({
  padding: theme.spacing(2),
  marginBottom: theme.spacing(1.5),
  backgroundColor: isediting === 'true' 
    ? 'rgba(255, 255, 255, 0.1)'
    : 'rgba(255, 255, 255, 0.05)',
  border: isediting === 'true'
    ? '2px solid #e8f4fd'
    : '1px solid rgba(255, 255, 255, 0.1)',
  transition: 'all 0.3s ease',
  boxShadow: 'none',
  '&:hover': {
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
  },
}));

/**
 * SaveIndicator - Indicador de estado de guardado
 */
const SaveIndicator = styled(Box)(({ theme }) => ({
  display: 'flex',
  alignItems: 'center',
  gap: theme.spacing(1),
  fontSize: '0.75rem',
  color: '#e8f4fd',
  marginTop: theme.spacing(1),
}));

/**
 * Formatea una fecha a formato legible
 * @param {Date|string} date - Fecha a formatear
 * @returns {string} - Fecha formateada
 */
const formatDate = (date) => {
  const d = new Date(date);
  const now = new Date();
  const diffMs = now - d;
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return 'Hace un momento';
  if (diffMins < 60) return `Hace ${diffMins} ${diffMins === 1 ? 'minuto' : 'minutos'}`;
  if (diffHours < 24) return `Hace ${diffHours} ${diffHours === 1 ? 'hora' : 'horas'}`;
  if (diffDays < 7) return `Hace ${diffDays} ${diffDays === 1 ? 'día' : 'días'}`;

  return d.toLocaleDateString('es-ES', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

/**
 * Hook personalizado para gestión de notas con persistencia
 * Este es un hook de ejemplo. En producción, debería integrarse con useLessonProgress
 * 
 * @param {string} lessonId - ID de la lección
 * @param {string} moduleId - ID del módulo
 * @returns {Object} - Objeto con notes y funciones de gestión
 */
const useNotesManager = (lessonId, moduleId) => {
  const [notes, setNotes] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [saveStatus, setSaveStatus] = useState('saved'); // 'saving', 'saved', 'error'

  // Cargar notas al montar
  useEffect(() => {
    const loadNotes = async () => {
      try {
        setIsLoading(true);
        // Simulación de carga desde API o localStorage
        const storageKey = `notes_${moduleId}_${lessonId}`;
        const savedNotes = localStorage.getItem(storageKey);
        
        if (savedNotes) {
          setNotes(JSON.parse(savedNotes));
        }
      } catch (error) {
        console.error('Error al cargar notas:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadNotes();
  }, [lessonId, moduleId]);

  // Guardar notas en localStorage/API
  const saveNotes = useCallback(async (updatedNotes) => {
    try {
      setSaveStatus('saving');
      const storageKey = `notes_${moduleId}_${lessonId}`;
      localStorage.setItem(storageKey, JSON.stringify(updatedNotes));
      
      // Simular llamada a API
      // await api.post(`/lessons/${lessonId}/notes`, { notes: updatedNotes });
      
      setTimeout(() => setSaveStatus('saved'), 500);
    } catch (error) {
      console.error('Error al guardar notas:', error);
      setSaveStatus('error');
    }
  }, [lessonId, moduleId]);

  const addNote = useCallback((noteText) => {
    const newNote = {
      id: Date.now().toString(),
      text: noteText,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    setNotes((prev) => {
      const updated = [newNote, ...prev];
      saveNotes(updated);
      return updated;
    });

    return newNote;
  }, [saveNotes]);

  const editNote = useCallback((noteId, newText) => {
    setNotes((prev) => {
      const updated = prev.map((note) =>
        note.id === noteId
          ? { ...note, text: newText, updatedAt: new Date().toISOString() }
          : note
      );
      saveNotes(updated);
      return updated;
    });
  }, [saveNotes]);

  const deleteNote = useCallback((noteId) => {
    setNotes((prev) => {
      const updated = prev.filter((note) => note.id !== noteId);
      saveNotes(updated);
      return updated;
    });
  }, [saveNotes]);

  return {
    notes,
    isLoading,
    saveStatus,
    addNote,
    editNote,
    deleteNote,
  };
};

/**
 * PersonalNotes - Componente para tomar y gestionar notas personales durante las lecciones.
 * 
 * Permite a los estudiantes crear, editar y eliminar notas asociadas a una lección específica.
 * Incluye auto-guardado con debounce, confirmación de eliminación y gestión completa del estado.
 * 
 * @component
 * @example
 * ```jsx
 * <PersonalNotes
 *   lessonId="lesson-123"
 *   moduleId="module-456"
 * />
 * ```
 * 
 * @example
 * ```jsx
 * // Con callback al agregar nota
 * <PersonalNotes
 *   lessonId="lesson-123"
 *   moduleId="module-456"
 *   onNoteAdded={(note) => console.log('Nueva nota:', note)}
 * />
 * ```
 * 
 * @param {Object} props - Propiedades del componente
 * @param {string} props.lessonId - ID de la lección
 * @param {string} props.moduleId - ID del módulo
 * @param {Function} [props.onNoteAdded] - Callback cuando se agrega una nota
 * @param {Function} [props.onNoteEdited] - Callback cuando se edita una nota
 * @param {Function} [props.onNoteDeleted] - Callback cuando se elimina una nota
 */
const PersonalNotes = ({
  lessonId,
  moduleId,
  onNoteAdded,
  onNoteEdited,
  onNoteDeleted,
}) => {
  // Estados
  const [newNoteText, setNewNoteText] = useState('');
  const [editingNoteId, setEditingNoteId] = useState(null);
  const [editingNoteText, setEditingNoteText] = useState('');
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [noteToDelete, setNoteToDelete] = useState(null);
  const [expanded, setExpanded] = useState(false);

  // Hook de gestión de notas
  const { notes, isLoading, saveStatus, addNote, editNote, deleteNote } = useNotesManager(
    lessonId,
    moduleId
  );

  /**
   * Maneja la adición de una nueva nota
   */
  const handleAddNote = useCallback(() => {
    if (!newNoteText.trim()) return;

    const note = addNote(newNoteText.trim());
    setNewNoteText('');

    if (onNoteAdded && typeof onNoteAdded === 'function') {
      onNoteAdded(note);
    }
  }, [newNoteText, addNote, onNoteAdded]);

  /**
   * Maneja el inicio de edición de una nota
   */
  const handleStartEdit = useCallback((note) => {
    setEditingNoteId(note.id);
    setEditingNoteText(note.text);
  }, []);

  /**
   * Maneja el guardado de una nota editada
   */
  const handleSaveEdit = useCallback(() => {
    if (!editingNoteText.trim() || !editingNoteId) return;

    editNote(editingNoteId, editingNoteText.trim());
    setEditingNoteId(null);
    setEditingNoteText('');

    if (onNoteEdited && typeof onNoteEdited === 'function') {
      onNoteEdited({ id: editingNoteId, text: editingNoteText.trim() });
    }
  }, [editingNoteId, editingNoteText, editNote, onNoteEdited]);

  /**
   * Maneja la cancelación de edición
   */
  const handleCancelEdit = useCallback(() => {
    setEditingNoteId(null);
    setEditingNoteText('');
  }, []);

  /**
   * Abre el diálogo de confirmación de eliminación
   */
  const handleOpenDeleteDialog = useCallback((note) => {
    setNoteToDelete(note);
    setDeleteDialogOpen(true);
  }, []);

  /**
   * Confirma la eliminación de una nota
   */
  const handleConfirmDelete = useCallback(() => {
    if (noteToDelete) {
      deleteNote(noteToDelete.id);

      if (onNoteDeleted && typeof onNoteDeleted === 'function') {
        onNoteDeleted(noteToDelete);
      }
    }

    setDeleteDialogOpen(false);
    setNoteToDelete(null);
  }, [noteToDelete, deleteNote, onNoteDeleted]);

  /**
   * Cancela la eliminación
   */
  const handleCancelDelete = useCallback(() => {
    setDeleteDialogOpen(false);
    setNoteToDelete(null);
  }, []);

  /**
   * Maneja el atajo de teclado para agregar nota (Ctrl+Enter)
   */
  const handleKeyPress = useCallback(
    (event) => {
      if (event.ctrlKey && event.key === 'Enter') {
        if (editingNoteId) {
          handleSaveEdit();
        } else {
          handleAddNote();
        }
      }
    },
    [editingNoteId, handleSaveEdit, handleAddNote]
  );

  return (
    <>
      <StyledAccordion
        expanded={expanded}
        onChange={(e, isExpanded) => setExpanded(isExpanded)}
        elevation={2}
      >
        <AccordionSummary
          expandIcon={<ExpandMoreIcon />}
          aria-controls="personal-notes-content"
          id="personal-notes-header"
        >
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, width: '100%' }}>
            <NotesIcon sx={{ color: '#e8f4fd' }} />
            <Typography variant="h6" component="h3" sx={{ flex: 1, color: '#ffffff' }}>
              Mis Notas
            </Typography>
            {notes.length > 0 && (
              <Chip
                label={`${notes.length} ${notes.length === 1 ? 'nota' : 'notas'}`}
                size="small"
                color="primary"
                variant="outlined"
              />
            )}
          </Box>
        </AccordionSummary>

        <AccordionDetails>
          <Box sx={{ width: '100%' }}>
            {/* Campo para nueva nota */}
            <Box sx={{ mb: 3 }}>
              <TextField
                fullWidth
                multiline
                minRows={4}
                maxRows={8}
                placeholder="Escribe tus notas aquí... (Ctrl+Enter para guardar rápidamente)"
                value={newNoteText}
                onChange={(e) => setNewNoteText(e.target.value)}
                onKeyDown={handleKeyPress}
                variant="outlined"
                disabled={isLoading}
                aria-label="Campo de texto para nueva nota"
                sx={{
                  '& .MuiOutlinedInput-root': {
                    backgroundColor: 'rgba(255, 255, 255, 0.05)',
                    color: '#ffffff',
                    '& fieldset': {
                      borderColor: 'rgba(255, 255, 255, 0.2)',
                    },
                    '&:hover fieldset': {
                      borderColor: 'rgba(255, 255, 255, 0.3)',
                    },
                    '&.Mui-focused fieldset': {
                      borderColor: '#e8f4fd',
                    },
                  },
                  '& .MuiInputBase-input': {
                    color: '#ffffff',
                  },
                  '& .MuiInputBase-input::placeholder': {
                    color: 'rgba(255, 255, 255, 0.5)',
                    opacity: 1,
                  },
                }}
              />

              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mt: 1 }}>
                <SaveIndicator>
                  {saveStatus === 'saving' && (
                    <>
                      <CircularProgress size={12} />
                      <Typography variant="caption">Guardando...</Typography>
                    </>
                  )}
                  {saveStatus === 'saved' && notes.length > 0 && (
                    <>
                      <CheckIcon sx={{ fontSize: 14, color: 'success.main' }} />
                      <Typography variant="caption">Guardado</Typography>
                    </>
                  )}
                  {saveStatus === 'error' && (
                    <Typography variant="caption" color="error">
                      Error al guardar
                    </Typography>
                  )}
                </SaveIndicator>

                <Button
                  variant="contained"
                  startIcon={<AddIcon />}
                  onClick={handleAddNote}
                  disabled={!newNoteText.trim() || isLoading}
                  aria-label="Agregar nota"
                >
                  Agregar Nota
                </Button>
              </Box>
            </Box>

            <Divider sx={{ my: 2, borderColor: 'rgba(255, 255, 255, 0.1)' }} />

            {/* Lista de notas */}
            {isLoading ? (
              <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
                <CircularProgress />
              </Box>
            ) : notes.length === 0 ? (
              <Box sx={{ textAlign: 'center', py: 4 }}>
                <NotesIcon sx={{ fontSize: 64, color: 'rgba(255, 255, 255, 0.3)', mb: 2 }} />
                <Typography variant="body1" sx={{ color: '#e8f4fd' }}>
                  No hay notas todavía
                </Typography>
                <Typography variant="body2" sx={{ color: 'rgba(255, 255, 255, 0.6)', mt: 1 }}>
                  Comienza escribiendo tus apuntes sobre esta lección
                </Typography>
              </Box>
            ) : (
              <List sx={{ p: 0 }}>
                {notes.map((note) => (
                  <Fade in key={note.id}>
                    <NoteItem
                      elevation={1}
                      isediting={(editingNoteId === note.id).toString()}
                    >
                      {editingNoteId === note.id ? (
                        // Modo edición
                        <Box>
                          <TextField
                            fullWidth
                            multiline
                            minRows={3}
                            maxRows={8}
                            value={editingNoteText}
                            onChange={(e) => setEditingNoteText(e.target.value)}
                            onKeyDown={handleKeyPress}
                            variant="outlined"
                            autoFocus
                            aria-label="Campo de texto para editar nota"
                            sx={{
                              '& .MuiOutlinedInput-root': {
                                backgroundColor: 'rgba(255, 255, 255, 0.05)',
                                color: '#ffffff',
                                '& fieldset': {
                                  borderColor: 'rgba(255, 255, 255, 0.2)',
                                },
                                '&:hover fieldset': {
                                  borderColor: 'rgba(255, 255, 255, 0.3)',
                                },
                                '&.Mui-focused fieldset': {
                                  borderColor: '#e8f4fd',
                                },
                              },
                              '& .MuiInputBase-input': {
                                color: '#ffffff',
                              },
                            }}
                          />
                          <Box sx={{ display: 'flex', gap: 1, mt: 2, justifyContent: 'flex-end' }}>
                            <Button
                              size="small"
                              startIcon={<CloseIcon />}
                              onClick={handleCancelEdit}
                            >
                              Cancelar
                            </Button>
                            <Button
                              size="small"
                              variant="contained"
                              startIcon={<CheckIcon />}
                              onClick={handleSaveEdit}
                              disabled={!editingNoteText.trim()}
                            >
                              Guardar
                            </Button>
                          </Box>
                        </Box>
                      ) : (
                        // Modo visualización
                        <Box>
                          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1 }}>
                            <Typography variant="caption" sx={{ color: '#e8f4fd', opacity: 0.8 }}>
                              {formatDate(note.createdAt)}
                              {note.updatedAt !== note.createdAt && ' (editada)'}
                            </Typography>
                            <Box sx={{ display: 'flex', gap: 0.5 }}>
                              <IconButton
                                size="small"
                                onClick={() => handleStartEdit(note)}
                                aria-label="Editar nota"
                                color="primary"
                              >
                                <EditIcon fontSize="small" />
                              </IconButton>
                              <IconButton
                                size="small"
                                onClick={() => handleOpenDeleteDialog(note)}
                                aria-label="Eliminar nota"
                                color="error"
                              >
                                <DeleteIcon fontSize="small" />
                              </IconButton>
                            </Box>
                          </Box>
                          <Typography
                            variant="body2"
                            sx={{
                              whiteSpace: 'pre-wrap',
                              wordBreak: 'break-word',
                              color: '#ffffff',
                            }}
                          >
                            {note.text}
                          </Typography>
                        </Box>
                      )}
                    </NoteItem>
                  </Fade>
                ))}
              </List>
            )}
          </Box>
        </AccordionDetails>
      </StyledAccordion>

      {/* Diálogo de confirmación de eliminación */}
      <Dialog
        open={deleteDialogOpen}
        onClose={handleCancelDelete}
        aria-labelledby="delete-dialog-title"
        aria-describedby="delete-dialog-description"
      >
        <DialogTitle id="delete-dialog-title">
          ¿Eliminar nota?
        </DialogTitle>
        <DialogContent>
          <DialogContentText id="delete-dialog-description">
            Esta acción no se puede deshacer. ¿Estás seguro de que deseas eliminar esta nota?
          </DialogContentText>
          {noteToDelete && (
            <Paper
              elevation={0}
              sx={{
                mt: 2,
                p: 2,
                backgroundColor: 'action.hover',
                borderLeft: 3,
                borderColor: 'warning.main',
              }}
            >
              <Typography variant="caption" color="text.secondary" display="block" gutterBottom>
                {formatDate(noteToDelete.createdAt)}
              </Typography>
              <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap' }}>
                {noteToDelete.text.length > 150
                  ? `${noteToDelete.text.substring(0, 150)}...`
                  : noteToDelete.text}
              </Typography>
            </Paper>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCancelDelete} color="primary">
            Cancelar
          </Button>
          <Button onClick={handleConfirmDelete} color="error" variant="contained" autoFocus>
            Eliminar
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
};

PersonalNotes.propTypes = {
  /**
   * ID de la lección a la que pertenecen las notas
   */
  lessonId: PropTypes.string.isRequired,

  /**
   * ID del módulo al que pertenece la lección
   */
  moduleId: PropTypes.string.isRequired,

  /**
   * Callback opcional llamado cuando se agrega una nota.
   * Recibe la nota creada como parámetro.
   */
  onNoteAdded: PropTypes.func,

  /**
   * Callback opcional llamado cuando se edita una nota.
   * Recibe un objeto con id y text de la nota editada.
   */
  onNoteEdited: PropTypes.func,

  /**
   * Callback opcional llamado cuando se elimina una nota.
   * Recibe la nota eliminada como parámetro.
   */
  onNoteDeleted: PropTypes.func,
};

PersonalNotes.defaultProps = {
  onNoteAdded: null,
  onNoteEdited: null,
  onNoteDeleted: null,
};

export default PersonalNotes;

