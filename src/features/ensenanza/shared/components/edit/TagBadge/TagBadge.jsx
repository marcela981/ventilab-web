import React, { useState, useRef, useEffect } from 'react';
import PropTypes from 'prop-types';
import { useEditMode } from '../EditModeContext';
import { useAuth } from '@/shared/hooks/useAuth';
import styles from './ui/TagBadge.module.css';

const PRESET_TAGS = [
  { label: 'Fácil', variant: 'easy' },
  { label: 'Principiante', variant: 'easy' },
  { label: 'Rápido', variant: 'fast' },
  { label: 'Intermedio', variant: 'medium' },
  { label: 'Avanzado', variant: 'hard' },
  { label: 'Evaluación', variant: 'eval' },
  { label: 'Práctica', variant: 'practice' },
  { label: 'Teórico', variant: 'theory' },
  { label: 'Clínico', variant: 'clinical' },
];

const TAG_VARIANT_STYLES = {
  easy:     { '--tag-bg': 'var(--edit-badge-easy-bg)',   '--tag-color': 'var(--edit-badge-easy-color)' },
  fast:     { '--tag-bg': '#e0f7fa',                     '--tag-color': '#00695c' },
  medium:   { '--tag-bg': 'var(--edit-badge-medium-bg)', '--tag-color': 'var(--edit-badge-medium-color)' },
  hard:     { '--tag-bg': 'var(--edit-badge-hard-bg)',   '--tag-color': 'var(--edit-badge-hard-color)' },
  eval:     { '--tag-bg': '#ede7f6',                     '--tag-color': '#4527a0' },
  practice: { '--tag-bg': '#e8eaf6',                     '--tag-color': '#283593' },
  theory:   { '--tag-bg': '#fce4ec',                     '--tag-color': '#880e4f' },
  clinical: { '--tag-bg': '#fff3e0',                     '--tag-color': '#bf360c' },
};

const getVariant = (label) =>
  PRESET_TAGS.find(t => t.label === label)?.variant ?? 'easy';

/**
 * TagBadge — píldoras de etiquetas (Fácil, Intermedio, Clínico…) para tarjetas de módulo.
 * En modo edición permite añadir/quitar tags desde un menú desplegable.
 * En modo lectura renderiza las etiquetas como pastillas de solo lectura (si hay alguna).
 */
const TagBadge = ({ tags, onChange }) => {
  const { isEditMode } = useEditMode();
  const { isTeacher } = useAuth();
  const isTeacherPlus = isTeacher();
  const [open, setOpen] = useState(false);
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

  const removeTag = (tag) => onChange(tags.filter(t => t !== tag));

  const toggleTag = (label) => {
    if (tags.includes(label)) {
      onChange(tags.filter(t => t !== label));
    } else {
      onChange([...tags, label]);
    }
  };

  if (!isEditMode && tags.length === 0) return null;

  const canEdit = isEditMode && isTeacherPlus;

  return (
    <div className={styles['tag-badge']} ref={containerRef}>
      <div className={styles['tag-badge__list']}>
        {tags.map(tag => (
          <span
            key={tag}
            className={styles['tag-badge__pill']}
            style={TAG_VARIANT_STYLES[getVariant(tag)] ?? TAG_VARIANT_STYLES.easy}
          >
            {tag}
            {canEdit && (
              <button
                type="button"
                className={styles['tag-badge__remove']}
                onClick={(e) => { e.stopPropagation(); removeTag(tag); }}
                aria-label={`Quitar etiqueta ${tag}`}
              >
                ×
              </button>
            )}
          </span>
        ))}

        {canEdit && (
          <button
            type="button"
            className={styles['tag-badge__add']}
            onClick={(e) => { e.stopPropagation(); setOpen(prev => !prev); }}
            aria-label="Agregar etiqueta"
            aria-expanded={open}
          >
            + Etiqueta
          </button>
        )}
      </div>

      {open && canEdit && (
        <div
          className={styles['tag-badge__dropdown']}
          onClick={(e) => e.stopPropagation()}
        >
          {PRESET_TAGS.map(({ label, variant }) => {
            const isSelected = tags.includes(label);
            return (
              <button
                key={label}
                type="button"
                className={`${styles['tag-badge__option']} ${isSelected ? styles['tag-badge__option--selected'] : ''}`}
                style={TAG_VARIANT_STYLES[variant]}
                onClick={() => toggleTag(label)}
              >
                {isSelected && <span className={styles['tag-badge__check']}>✓</span>}
                {label}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
};

TagBadge.propTypes = {
  tags: PropTypes.arrayOf(PropTypes.string).isRequired,
  onChange: PropTypes.func.isRequired,
};

export default TagBadge;
