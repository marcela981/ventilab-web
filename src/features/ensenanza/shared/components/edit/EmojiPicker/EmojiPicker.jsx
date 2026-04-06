import React, { useState, useRef, useEffect } from 'react';
import PropTypes from 'prop-types';
import { useEditMode } from '../EditModeContext';
import { useAuth } from '@/shared/hooks/useAuth';
import styles from './ui/EmojiPicker.module.css';

const EMOJI_GROUPS = [
  {
    label: 'Medicina',
    emojis: ['🫁', '💉', '🩺', '🔬', '🧪', '🩻', '💊', '🏥', '❤️', '🫀', '🩸', '🧬', '⚕️', '🩹', '🦷'],
  },
  {
    label: 'Aprendizaje',
    emojis: ['📚', '📖', '✏️', '🎓', '💡', '🧠', '📝', '🔑', '⭐', '🏆', '🎯', '📊', '📋', '🗂️', '📌'],
  },
  {
    label: 'Niveles',
    emojis: ['🥇', '🥈', '🥉', '🔥', '💎', '⚡', '🚀', '✅', '🆕', '🔄', '▶️', '1️⃣', '2️⃣', '3️⃣', '🔵'],
  },
  {
    label: 'General',
    emojis: ['😊', '💪', '👍', '🎉', '🌟', '💯', '🔴', '🟢', '🟡', '🟠', '⚠️', '❓', '✔️', '➡️', 'ℹ️'],
  },
];

/**
 * EmojiPicker — selector ligero de emoji para títulos de módulos/niveles en modo edición.
 * Solo visible si isEditMode === true y el usuario es teacher+.
 * En modo lectura muestra el emoji seleccionado (si existe) de forma estática.
 */
const EmojiPicker = ({ value, onChange }) => {
  const { isEditMode } = useEditMode();
  const { isTeacher } = useAuth();
  const isTeacherPlus = isTeacher();
  const [open, setOpen] = useState(false);
  const [activeGroup, setActiveGroup] = useState(0);
  const containerRef = useRef(null);

  useEffect(() => {
    if (!open) return;
    const handleClickOutside = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [open]);

  if (!isEditMode || !isTeacherPlus) {
    return value ? <span className={styles['emoji-picker__display']}>{value}</span> : null;
  }

  return (
    <div className={styles['emoji-picker']} ref={containerRef}>
      <button
        type="button"
        className={`${styles['emoji-picker__trigger']} ${value ? styles['emoji-picker__trigger--has-value'] : ''}`}
        onClick={(e) => { e.stopPropagation(); setOpen(prev => !prev); }}
        title="Seleccionar emoji"
        aria-label="Seleccionar emoji para el módulo"
        aria-expanded={open}
      >
        {value || '+'}
      </button>

      {open && (
        <div className={styles['emoji-picker__popover']} onClick={(e) => e.stopPropagation()}>
          <div className={styles['emoji-picker__tabs']}>
            {EMOJI_GROUPS.map((group, i) => (
              <button
                key={group.label}
                type="button"
                className={`${styles['emoji-picker__tab']} ${activeGroup === i ? styles['emoji-picker__tab--active'] : ''}`}
                onClick={() => setActiveGroup(i)}
              >
                {group.label}
              </button>
            ))}
          </div>

          <div className={styles['emoji-picker__grid']}>
            {value && (
              <button
                type="button"
                className={`${styles['emoji-picker__item']} ${styles['emoji-picker__item--clear']}`}
                onClick={() => { onChange(''); setOpen(false); }}
                title="Quitar emoji"
              >
                ✕
              </button>
            )}
            {EMOJI_GROUPS[activeGroup].emojis.map(emoji => (
              <button
                key={emoji}
                type="button"
                className={`${styles['emoji-picker__item']} ${value === emoji ? styles['emoji-picker__item--selected'] : ''}`}
                onClick={() => { onChange(emoji); setOpen(false); }}
                title={emoji}
              >
                {emoji}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

EmojiPicker.propTypes = {
  value: PropTypes.string,
  onChange: PropTypes.func.isRequired,
};

EmojiPicker.defaultProps = {
  value: '',
};

export default EmojiPicker;
