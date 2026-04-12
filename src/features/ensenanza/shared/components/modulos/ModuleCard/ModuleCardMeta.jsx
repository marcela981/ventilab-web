import React, { useState } from 'react';
import PropTypes from 'prop-types';
import { Box, Chip } from '@mui/material';
import { MenuBook } from '@mui/icons-material';
import { formatDuration } from './moduleCardHelpers';
import TagBadge from '@/features/ensenanza/shared/components/edit/TagBadge/TagBadge';
import EstimatedTime from '@/features/ensenanza/shared/components/edit/EstimatedTime/EstimatedTime';
import { useEditMode } from '@/features/ensenanza/shared/components/edit/EditModeContext';
import styles from '@/styles/curriculum.module.css';

/**
 * Sección de metadatos de la ModuleCard (chips de información + TagBadge + EstimatedTime).
 * En modo edición (teacher+): TagBadge editable y EstimatedTime inline.
 * En modo lectura: muestra chips clásicos + etiquetas/tiempo si hay datos.
 */
const ModuleCardMeta = ({
  module,
  isAvailable
}) => {
  const { isEditMode } = useEditMode();

  const [tags, setTags] = useState(module.tags || []);
  const [duration, setDuration] = useState(module.duration || 0);

  const handleTagsChange = (newTags) => {
    setTags(newTags);
    // TODO Fase 3: PATCH /api/modules/{module.id} { tags: newTags }
    console.log('[TagBadge] tags updated:', { moduleId: module.id, tags: newTags });
  };

  const handleDurationChange = (newDuration) => {
    setDuration(newDuration);
    // TODO Fase 3: PATCH /api/modules/{module.id} { duration: newDuration }
    console.log('[EstimatedTime] duration updated:', { moduleId: module.id, duration: newDuration });
  };

  const chipSx = {
    fontSize: '0.7rem',
    height: 24,
    fontWeight: 500,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderColor: 'rgba(255, 255, 255, 0.3)',
    color: isAvailable ? '#ffffff !important' : '#9e9e9e',
    '& .MuiChip-label': { color: isAvailable ? '#ffffff !important' : '#9e9e9e' },
  };

  return (
    <div className={styles.cardMeta}>
      {/* Chips de metadatos clásicos (dificultad, duración estática, lecciones) */}
      <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', alignItems: 'center' }}>
        <Chip label={module.difficulty} size="small" variant="outlined" sx={chipSx} />

        {/* En modo edición mostramos EstimatedTime editable; en modo lectura el chip estático */}
        {isEditMode ? (
          <EstimatedTime duration={duration} onChange={handleDurationChange} />
        ) : (
          <Chip
            label={formatDuration(duration || module.duration)}
            size="small"
            variant="outlined"
            sx={chipSx}
          />
        )}

        {module.lessons && module.lessons.length > 0 && (
          <Chip
            icon={<MenuBook sx={{ fontSize: 14, color: isAvailable ? '#ffffff' : '#9e9e9e' }} />}
            label={`${module.lessons.length} lecciones`}
            size="small"
            variant="outlined"
            sx={{
              ...chipSx,
              '& .MuiChip-icon': { color: isAvailable ? '#ffffff !important' : '#9e9e9e' },
            }}
          />
        )}
      </Box>

      {/* TagBadge: editable en modo edición, solo lectura si hay tags en modo estudio */}
      <Box sx={{ mt: tags.length > 0 || isEditMode ? 0.75 : 0 }}>
        <TagBadge tags={tags} onChange={handleTagsChange} />
      </Box>
    </div>
  );
};

ModuleCardMeta.propTypes = {
  module: PropTypes.object.isRequired,
  isAvailable: PropTypes.bool.isRequired,
};

export default ModuleCardMeta;

