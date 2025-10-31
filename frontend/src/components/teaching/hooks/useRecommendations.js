import { useMemo } from 'react';
import { curriculumData } from '../../../data/curriculumData';
import {
  NavigateNext,
  TrendingDown,
  Refresh
} from '@mui/icons-material';

/**
 * useRecommendations - Hook personalizado para generación de recomendaciones inteligentes
 * 
 * Genera recomendaciones personalizadas basadas en el progreso del usuario,
 * incluyendo próximas lecciones óptimas, módulos para reforzar y contenido para repasar.
 * 
 * @param {Object} nextModule - Próximo módulo disponible
 * @param {Function} calculateModuleProgress - Función para calcular progreso de módulo
 * @param {Function} handleContinueLearning - Callback para continuar aprendiendo
 * @param {Function} handleSectionClick - Callback para navegar a sección
 * @returns {Array} Array de recomendaciones generadas
 */
const useRecommendations = (
  nextModule, 
  calculateModuleProgress, 
  handleContinueLearning, 
  handleSectionClick
) => {
  
  /**
   * Genera recomendaciones inteligentes basadas en el progreso del usuario
   * @returns {Array} Array de recomendaciones
   */
  const generateRecommendations = useMemo(() => {
    const recommendations = [];
    
    // Próxima lección óptima
    if (nextModule) {
      recommendations.push({
        type: 'next-optimal',
        title: 'Próxima Lección Óptima',
        description: `Continúa con ${nextModule.title}`,
        icon: <NavigateNext />,
        action: handleContinueLearning,
        priority: 'high'
      });
    }

    // Módulos débiles (simulado - en realidad vendría de quiz scores del módulo evaluation)
    const weakModules = Object.values(curriculumData.modules)
      .filter(module => {
        const progress = calculateModuleProgress(module.id);
        return progress > 0 && progress < 50; // módulos iniciados pero no completados
      })
      .slice(0, 2);

    weakModules.forEach(module => {
      recommendations.push({
        type: 'weak-module',
        title: 'Módulo para Reforzar',
        description: `${module.title} - ${calculateModuleProgress(module.id).toFixed(0)}% completado`,
        icon: <TrendingDown />,
        action: () => handleSectionClick(module.id),
        priority: 'medium'
      });
    });

    // Contenido para repasar (basado en tiempo transcurrido)
    const modulesToReview = Object.values(curriculumData.modules)
      .filter(module => calculateModuleProgress(module.id) === 100)
      .slice(0, 1);

    modulesToReview.forEach(module => {
      recommendations.push({
        type: 'review',
        title: 'Contenido para Repasar',
        description: `Repasa conceptos de ${module.title}`,
        icon: <Refresh />,
        action: () => handleSectionClick(module.id),
        priority: 'low'
      });
    });

    return recommendations.slice(0, 3); // Máximo 3 recomendaciones
  }, [nextModule, calculateModuleProgress, handleContinueLearning, handleSectionClick]);

  return generateRecommendations;
};

export default useRecommendations;
