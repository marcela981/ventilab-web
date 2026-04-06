import React, { useState, useRef, useEffect } from 'react';
import PropTypes from 'prop-types';
import styles from './ui/LessonEditBanner.module.css';

/**
 * LessonEditBanner — barra sticky de edición para el Canvas de lección en Modo Edición.
 *
 * Muestra:
 *  - Indicador visual "Modo Edición Activo"
 *  - Título de la lección editable inline (click para editar)
 *  - Hint sobre el BlockInjector (separadores "+" entre secciones)
 *  - Botón "+ Sección" que hace scroll al primer BlockInjector o llama a onAddSection
 *
 * Solo debe renderizarse cuando isEditMode === true.
 */
const LessonEditBanner = ({ lessonTitle, lessonType, totalSections, onTitleChange, onAddSection }) => {
  const [editing, setEditing] = useState(false);
  const [title, setTitle] = useState(lessonTitle || '');
  const inputRef = useRef(null);

  useEffect(() => {
    setTitle(lessonTitle || '');
  }, [lessonTitle]);

  useEffect(() => {
    if (editing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [editing]);

  const handleCommit = () => {
    const trimmed = title.trim();
    if (trimmed && trimmed !== lessonTitle) {
      onTitleChange?.(trimmed);
      // TODO Fase 3: PATCH /api/lessons/{lessonId} { title: trimmed }
      console.log('[LessonEditBanner] title updated:', trimmed);
    } else {
      setTitle(lessonTitle || '');
    }
    setEditing(false);
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') handleCommit();
    if (e.key === 'Escape') {
      setTitle(lessonTitle || '');
      setEditing(false);
    }
  };

  return (
    <div className={styles['lesson-banner']}>
      {/* Barra superior: indicador + acciones */}
      <div className={styles['lesson-banner__topbar']}>
        <div className={styles['lesson-banner__badge']}>
          <span className={styles['lesson-banner__dot']} aria-hidden="true" />
          Modo Edición Activo
        </div>

        <div className={styles['lesson-banner__meta']}>
          {lessonType && (
            <span className={styles['lesson-banner__type']}>{lessonType}</span>
          )}
          {totalSections > 0 && (
            <span className={styles['lesson-banner__count']}>
              {totalSections} secciones
            </span>
          )}
        </div>

        <button
          type="button"
          className={styles['lesson-banner__add-btn']}
          onClick={onAddSection}
          title="Agregar sección al final"
          aria-label="Agregar sección al final de la lección"
        >
          <span aria-hidden="true">+</span>
          Sección
        </button>
      </div>

      {/* Título editable */}
      <div className={styles['lesson-banner__title-area']}>
        {editing ? (
          <input
            ref={inputRef}
            type="text"
            className={styles['lesson-banner__title-input']}
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            onBlur={handleCommit}
            onKeyDown={handleKeyDown}
            aria-label="Editar título de la lección"
            maxLength={160}
          />
        ) : (
          <button
            type="button"
            className={styles['lesson-banner__title-btn']}
            onClick={() => setEditing(true)}
            title="Click para editar el título de la lección"
            aria-label="Editar título de la lección"
          >
            <span className={styles['lesson-banner__title-text']}>
              {title || 'Sin título'}
            </span>
            <span className={styles['lesson-banner__edit-icon']} aria-hidden="true">
              ✏️
            </span>
          </button>
        )}
      </div>

      {/* Hint sobre controles de edición */}
      <div className={styles['lesson-banner__hint']}>
        <span aria-hidden="true">💡</span>
        Usa los separadores{' '}
        <kbd className={styles['lesson-banner__kbd']}>+</kbd>{' '}
        entre secciones para insertar bloques · Pasa el cursor sobre cada sección para ver controles de edición
      </div>
    </div>
  );
};

LessonEditBanner.propTypes = {
  lessonTitle: PropTypes.string,
  lessonType: PropTypes.string,
  totalSections: PropTypes.number,
  onTitleChange: PropTypes.func,
  onAddSection: PropTypes.func,
};

export default LessonEditBanner;
