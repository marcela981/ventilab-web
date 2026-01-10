import React from 'react';
import { Lock, LockOpen } from '@mui/icons-material';

/**
 * ModuleStatusIcons - Componente presentacional para mostrar el estado de disponibilidad de un módulo
 * 
 * Componente puramente visual que muestra un ícono de candado según la disponibilidad del módulo.
 * No contiene lógica de negocio, solo renderiza el ícono apropiado.
 * 
 * @param {Object} props - Props del componente
 * @param {boolean} props.isAvailable - Si el módulo está disponible (true = candado abierto, false = candado cerrado)
 * @param {number} [props.size=20] - Tamaño del ícono en píxeles
 * @param {string} [props.className=''] - Clases CSS adicionales para el ícono
 * @param {string} [props.color] - Color del ícono cuando está disponible (opcional, por defecto usa color del tema)
 * @returns {JSX.Element} Componente de ícono
 * 
 * @example
 * // Módulo disponible
 * <ModuleStatusIcons isAvailable={true} size={24} className="my-icon" />
 * 
 * @example
 * // Módulo bloqueado
 * <ModuleStatusIcons isAvailable={false} />
 */
const ModuleStatusIcons = ({ isAvailable, size = 20, className = '', color }) => {
  const IconComponent = isAvailable ? LockOpen : Lock;
  const ariaLabel = isAvailable ? 'Módulo disponible' : 'Módulo bloqueado';
  
  // Color: disponible usa el color proporcionado o color del tema, bloqueado SIEMPRE negro
  // Si no está disponible, ignoramos cualquier color pasado y forzamos negro explícitamente
  const iconColor = !isAvailable 
    ? '#000000'              // Si está bloqueado, SIEMPRE negro, sin excepciones
    : (color || undefined); // Si está disponible, usa el color proporcionado o undefined (color del tema)

  return (
    <IconComponent
      sx={{
        width: size,
        height: size,
        fontSize: size,
        // Forzar color negro cuando no está disponible, ignorando cualquier estilo heredado
        color: !isAvailable ? '#000000' : iconColor,
        // Asegurar que el color negro se aplique a todos los elementos del SVG
        ...(isAvailable ? {} : {
          color: '#000000 !important',
          '& *': {
            color: '#000000 !important',
            fill: 'currentColor'
          }
        })
      }}
      className={className}
      aria-label={ariaLabel}
      aria-hidden={false}
      focusable="false"
    />
  );
};

/**
 * ModuleLockBadge - Wrapper utilitario para ModuleStatusIcons con contenedor circular
 * 
 * Renderiza ModuleStatusIcons dentro de un contenedor circular con fondo semitransparente
 * para una apariencia consistente en las cards de módulos. Útil para mostrar el estado
 * de bloqueo/desbloqueo en la esquina de las cards.
 * 
 * @param {Object} props - Props del componente
 * @param {boolean} props.isAvailable - Si el módulo está disponible
 * @param {number} [props.size=20] - Tamaño del ícono en píxeles
 * @param {string} [props.className=''] - Clases CSS adicionales para el contenedor
 * @param {string} [props.color] - Color del ícono cuando está disponible (opcional)
 * @returns {JSX.Element} Badge con ícono de estado
 * 
 * @example
 * // Módulo disponible
 * <ModuleLockBadge isAvailable={true} size={20} />
 * 
 * @example
 * // Módulo bloqueado
 * <ModuleLockBadge isAvailable={false} />
 */
export const ModuleLockBadge = ({ isAvailable, size = 20, className = '', color }) => {
  return (
    <div
      className={className}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '8px',
        borderRadius: '50%',
        backgroundColor: isAvailable 
          ? 'rgba(255, 255, 255, 0.15)'  // Fondo muy claro para disponible
          : 'rgba(0, 0, 0, 0.3)',         // Fondo semitransparente oscuro para bloqueado
        transition: 'background-color 0.2s ease-in-out'
      }}
    >
      <ModuleStatusIcons isAvailable={isAvailable} size={size} color={color} />
    </div>
  );
};

export default ModuleStatusIcons;

