import React, { useState } from 'react';
import RichTextEditor from '../RichTextEditor/RichTextEditor';
import styles from './ui/EditableSectionWrapper.module.css';

/** Mapeo de tipo de página a etiqueta legible */
const SECTION_LABELS = {
  'header-intro':     { label: 'Introducción',      icon: '📄' },
  'theory':           { label: 'Teoría',             icon: '📖' },
  'analogies':        { label: 'Analogías',          icon: '🔗' },
  'analogy':          { label: 'Analogía',           icon: '🔗' },
  'visual-elements':  { label: 'Elementos Visuales', icon: '🖼️' },
  'waveforms':        { label: 'Curvas',             icon: '📈' },
  'parameter-tables': { label: 'Parámetros',         icon: '📊' },
  'practical-case':   { label: 'Caso Práctico',      icon: '🏥' },
  'key-points':       { label: 'Puntos Clave',       icon: '⭐' },
  'assessment':       { label: 'Evaluación',         icon: '❓' },
  'references':       { label: 'Referencias',        icon: '📚' },
  'completion':       { label: 'Completado',         icon: '✅' },
  'clinical-case':    { label: 'Caso Clínico',       icon: '🩺' },
};

/**
 * EditableSectionWrapper — envuelve cada sección en modo scroll/edición.
 *
 * - Modo VISTA: muestra el contenido original de la sección.
 *   Al hover aparece la barra de controles con tipo, mover ↑↓, eliminar, y botón Editar.
 *
 * - Modo EDITOR: reemplaza el contenido con RichTextEditor (Tiptap).
 *   Botones "Guardar sección" y "Cancelar". Al guardar notifica cambios al padre.
 */
const EditableSectionWrapper = ({
  children,
  pageType,
  sectionIndex,
  totalSections,
  initialContent,
  onContentChange,
  onMoveUp,
  onMoveDown,
  onDelete,
}) => {
  const [hovered, setHovered] = useState(false);
  const [editing, setEditing] = useState(false);
  const [editorContent, setEditorContent] = useState(initialContent ?? '');
  const [savedContent, setSavedContent] = useState(initialContent ?? '');

  const meta = SECTION_LABELS[pageType] ?? { label: pageType ?? 'Sección', icon: '📄' };
  const isFirst = sectionIndex === 0;
  const isLast = sectionIndex === totalSections - 1;
  const isDirty = editorContent !== savedContent;

  const handleAction = (e, fn) => { e.stopPropagation(); fn?.(); };

  const handleOpenEditor = () => {
    setEditorContent(initialContent ?? savedContent ?? '');
    setEditing(true);
  };

  const handleSave = () => {
    setSavedContent(editorContent);
    onContentChange?.(editorContent, sectionIndex);
    setEditing(false);
  };

  const handleCancel = () => {
    setEditorContent(savedContent);
    setEditing(false);
  };

  return (
    <div
      className={[
        styles['editable-section'],
        hovered && !editing ? styles['editable-section--hovered'] : '',
        editing ? styles['editable-section--editing'] : '',
      ].filter(Boolean).join(' ')}
      onMouseEnter={() => !editing && setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {/* ── Barra de controles (hover, solo en modo VISTA) ── */}
      {!editing && (
        <div
          className={styles['editable-section__controls']}
          aria-hidden={!hovered}
        >
          {/* Badge tipo */}
          <span className={styles['editable-section__type']}>
            <span aria-hidden="true">{meta.icon}</span>
            {meta.label}
          </span>

          <div className={styles['editable-section__actions']}>
            {/* Botón Editar */}
            <button
              type="button"
              className={`${styles['editable-section__action-btn']} ${styles['editable-section__action-btn--edit']}`}
              onClick={(e) => handleAction(e, handleOpenEditor)}
              title="Editar contenido de esta sección"
              aria-label="Editar sección"
              tabIndex={hovered ? 0 : -1}
            >
              ✏️ Editar
            </button>

            {!isFirst && (
              <button
                type="button"
                className={styles['editable-section__action-btn']}
                onClick={(e) => handleAction(e, onMoveUp)}
                title="Mover arriba"
                aria-label="Mover sección arriba"
                tabIndex={hovered ? 0 : -1}
              >↑</button>
            )}
            {!isLast && (
              <button
                type="button"
                className={styles['editable-section__action-btn']}
                onClick={(e) => handleAction(e, onMoveDown)}
                title="Mover abajo"
                aria-label="Mover sección abajo"
                tabIndex={hovered ? 0 : -1}
              >↓</button>
            )}
            <button
              type="button"
              className={`${styles['editable-section__action-btn']} ${styles['editable-section__action-btn--delete']}`}
              onClick={(e) => handleAction(e, onDelete)}
              title="Eliminar sección"
              aria-label="Eliminar sección"
              tabIndex={hovered ? 0 : -1}
            >✕</button>
          </div>
        </div>
      )}

      {/* ── Modo EDITOR ── */}
      {editing ? (
        <div className={styles['editable-section__editor-panel']}>
          {/* Cabecera del editor */}
          <div className={styles['editable-section__editor-header']}>
            <span className={styles['editable-section__editor-title']}>
              <span aria-hidden="true">{meta.icon}</span>
              Editando: {meta.label}
            </span>
            <div className={styles['editable-section__editor-actions']}>
              <button
                type="button"
                className={`${styles['editable-section__ctrl-btn']} ${styles['editable-section__ctrl-btn--save']} ${!isDirty ? styles['editable-section__ctrl-btn--disabled'] : ''}`}
                onClick={handleSave}
                disabled={!isDirty}
                title={isDirty ? 'Guardar esta sección' : 'Sin cambios'}
              >
                <span aria-hidden="true">💾</span>
                {isDirty ? 'Guardar sección' : 'Sin cambios'}
              </button>
              <button
                type="button"
                className={`${styles['editable-section__ctrl-btn']} ${styles['editable-section__ctrl-btn--cancel']}`}
                onClick={handleCancel}
                title="Cancelar y volver a la vista"
              >
                Cancelar
              </button>
            </div>
          </div>

          {/* Editor Tiptap */}
          <RichTextEditor
            content={editorContent}
            onChange={setEditorContent}
            placeholder={`Contenido de "${meta.label}"… escribe o usa / para insertar un bloque`}
            autoFocus
          />
        </div>
      ) : (
        /* ── Modo VISTA ── */
        <div className={styles['editable-section__content']}>
          {children}
        </div>
      )}
    </div>
  );
};

export default EditableSectionWrapper;
