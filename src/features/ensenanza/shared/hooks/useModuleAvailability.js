import { useMemo } from 'react';

/**
 * Hook para determinar la disponibilidad de un módulo del currículo
 * basándose en sus prerrequisitos y el progreso del usuario.
 * 
 * Este hook es puro y no realiza llamadas externas; solo procesa
 * los datos que recibe como parámetros.
 * 
 * @param {Object} params - Parámetros del hook
 * @param {string} params.moduleId - ID del módulo a verificar (usado para referencia, no afecta el cálculo)
 * @param {string[]} [params.prerequisites=[]] - Array de IDs o nombres de módulos prerrequisitos
 * @param {string[]} [params.completedModules=[]] - Array de IDs o nombres de módulos completados por el usuario
 * @returns {Object} Objeto con el estado de disponibilidad del módulo
 * @returns {boolean} returns.isAvailable - true si todos los prerrequisitos están completos
 * @returns {string[]} returns.missingPrerequisites - IDs o nombres de los módulos prerrequisitos faltantes
 * @returns {'available'|'blocked'} returns.status - Estado semántico del módulo ('available' o 'blocked')
 * 
 * @example
 * // Ejemplo de uso:
 * // const { isAvailable, missingPrerequisites, status } = useModuleAvailability({
 * //   moduleId: 'module-3',
 * //   prerequisites: ['module-1', 'module-2'],
 * //   completedModules: ['module-1']
 * // });
 * // Resultado esperado:
 * // {
 * //   isAvailable: false,
 * //   missingPrerequisites: ['module-2'],
 * //   status: 'blocked'
 * // }
 * 
 * @example
 * // Caso donde todos los prerrequisitos están completos:
 * // const result = useModuleAvailability({
 * //   moduleId: 'module-3',
 * //   prerequisites: ['module-1', 'module-2'],
 * //   completedModules: ['module-1', 'module-2']
 * // });
 * // Resultado: { isAvailable: true, missingPrerequisites: [], status: 'available' }
 */
const useModuleAvailability = ({ moduleId, prerequisites = [], completedModules = [] } = {}) => {
  return useMemo(() => {
    // Convertir completedModules a Set para búsquedas O(1)
    const completedSet = new Set(completedModules);
    
    // Calcular módulos prerrequisitos faltantes
    const missingPrerequisites = prerequisites.filter(prereq => !completedSet.has(prereq));
    
    // Determinar si el módulo está disponible (todos los prerrequisitos completos)
    const isAvailable = missingPrerequisites.length === 0;
    
    // Estado semántico del módulo
    const status = isAvailable ? 'available' : 'blocked';
    
    return {
      isAvailable,
      missingPrerequisites,
      status
    };
  }, [moduleId, prerequisites, completedModules]);
};

export default useModuleAvailability;

