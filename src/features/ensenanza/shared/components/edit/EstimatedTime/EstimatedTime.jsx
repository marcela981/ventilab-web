import React, { useState, useRef, useEffect } from 'react';
import PropTypes from 'prop-types';
import { useEditMode } from '../EditModeContext';
import { useAuth } from '@/shared/hooks/useAuth';
import styles from './ui/EstimatedTime.module.css';

/**
 * Formatea minutos a "Xh Ymin" o "X min".
 * Retorna null si el valor es 0 o indefinido.
 */
export const formatTime = (minutes) => {
  if (!minutes || minutes <= 0) return null;
  if (minutes < 60) return `${minutes} min`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m > 0 ? `${h}h ${m}min` : `${h}h`;
};

/**
 * EstimatedTime — casillero editable de tiempo estimado en minutos.
 * En modo edición (teacher+): click para editar inline; commit con Enter o blur.
 * En modo lectura: muestra el tiempo formateado como pastilla (solo si hay valor).
 */
const EstimatedTime = ({ duration, onChange }) => {
  const { isEditMode } = useEditMode();
  const { isTeacher } = useAuth();
  const isTeacherPlus = isTeacher();
  const [editing, setEditing] = useState(false);
  const [inputValue, setInputValue] = useState(String(duration || ''));
  const inputRef = useRef(null);

  useEffect(() => {
    setInputValue(String(duration || ''));
  }, [duration]);

  useEffect(() => {
    if (editing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [editing]);

  const handleCommit = () => {
    const parsed = parseInt(inputValue, 10);
    if (!isNaN(parsed) && parsed >= 0) {
      onChange(parsed);
    } else {
      setInputValue(String(duration || ''));
    }
    setEditing(false);
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') handleCommit();
    if (e.key === 'Escape') {
      setInputValue(String(duration || ''));
      setEditing(false);
    }
  };

  const formatted = formatTime(duration);
  const canEdit = isEditMode && isTeacherPlus;

  if (!canEdit) {
    if (!formatted) return null;
    return (
      <span className={styles['est-time__display']}>
        <span className={styles['est-time__icon']} aria-hidden="true">⏱</span>
        {formatted}
      </span>
    );
  }

  if (editing) {
    return (
      <span
        className={styles['est-time__edit']}
        onClick={(e) => e.stopPropagation()}
      >
        <span className={styles['est-time__icon']} aria-hidden="true">⏱</span>
        <input
          ref={inputRef}
          type="number"
          min="0"
          max="999"
          className={styles['est-time__input']}
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onBlur={handleCommit}
          onKeyDown={handleKeyDown}
          aria-label="Tiempo estimado en minutos"
        />
        <span className={styles['est-time__unit']}>min</span>
      </span>
    );
  }

  return (
    <button
      type="button"
      className={`${styles['est-time__trigger']} ${!formatted ? styles['est-time__trigger--empty'] : ''}`}
      onClick={(e) => { e.stopPropagation(); setEditing(true); }}
      title={formatted ? `Tiempo estimado: ${formatted}. Click para editar` : 'Añadir tiempo estimado'}
      aria-label="Editar tiempo estimado del módulo"
    >
      <span className={styles['est-time__icon']} aria-hidden="true">⏱</span>
      {formatted || 'Añadir tiempo'}
    </button>
  );
};

EstimatedTime.propTypes = {
  duration: PropTypes.number,
  onChange: PropTypes.func.isRequired,
};

EstimatedTime.defaultProps = {
  duration: 0,
};

export default EstimatedTime;
