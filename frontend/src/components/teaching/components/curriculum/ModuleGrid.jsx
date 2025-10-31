import React from 'react';
import PropTypes from 'prop-types';
import {
  Grid
} from '@mui/material';

/**
 * ModuleGrid - Grid de cards de módulos por nivel
 * 
 * Renderiza una grilla de módulos para un nivel específico del curriculum.
 * Cada módulo se muestra como un card con su información y estado.
 * 
 * @param {Array} modules - Array de módulos del nivel
 * @param {Function} calculateModuleProgress - Función para calcular progreso
 * @param {Function} isModuleAvailable - Función para verificar disponibilidad
 * @param {Function} onModuleClick - Callback para clicks en módulos
 * @param {Function} onToggleFavorite - Callback para toggle de favoritos
 * @param {Set} favoriteModules - Set de módulos favoritos
 * @param {Function} getStatusIcon - Función para obtener icono de estado
 * @param {Function} getButtonText - Función para obtener texto del botón
 * @param {Function} getButtonIcon - Función para obtener icono del botón
 * @param {string} levelColor - Color del nivel
 * @param {JSX.Element} moduleCard - Componente ModuleCard
 */
const ModuleGrid = ({ 
  modules = [],
  calculateModuleProgress,
  isModuleAvailable,
  onModuleClick,
  onToggleFavorite,
  favoriteModules,
  getStatusIcon,
  getButtonText,
  getButtonIcon,
  levelColor,
  moduleCard
}) => {
  return (
    <Grid container spacing={2} sx={{ mt: 1 }}>
      {modules.map((module) => {
        const moduleProgress = calculateModuleProgress(module.id);
        const available = isModuleAvailable(module.id);
        
        return (
          <Grid item xs={12} sm={6} md={4} key={module.id}>
            {React.cloneElement(moduleCard, {
              module,
              moduleProgress,
              isAvailable: available,
              isFavorite: favoriteModules.has(module.id),
              onModuleClick,
              onToggleFavorite,
              getStatusIcon,
              getButtonText,
              getButtonIcon,
              levelColor
            })}
          </Grid>
        );
      })}
    </Grid>
  );
};

ModuleGrid.propTypes = {
  modules: PropTypes.arrayOf(PropTypes.shape({
    id: PropTypes.string.isRequired,
    title: PropTypes.string.isRequired,
    description: PropTypes.string,
    learningObjectives: PropTypes.array,
    difficulty: PropTypes.string.isRequired,
    duration: PropTypes.number.isRequired
  })),
  calculateModuleProgress: PropTypes.func.isRequired,
  isModuleAvailable: PropTypes.func.isRequired,
  onModuleClick: PropTypes.func.isRequired,
  onToggleFavorite: PropTypes.func.isRequired,
  favoriteModules: PropTypes.instanceOf(Set).isRequired,
  getStatusIcon: PropTypes.func.isRequired,
  getButtonText: PropTypes.func.isRequired,
  getButtonIcon: PropTypes.func.isRequired,
  levelColor: PropTypes.string.isRequired,
  moduleCard: PropTypes.element.isRequired
};

export default ModuleGrid;
