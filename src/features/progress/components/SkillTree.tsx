import React, { useMemo } from 'react';
import {
  Card,
  CardContent,
  Typography,
  Box,
  Tooltip,
  CircularProgress,
  useTheme
} from '@mui/material';
import { SkillNode } from '../types';

interface SkillTreeProps {
  skills: SkillNode[];
  onOpenSkill?: (id: string) => void;
}

/**
 * SkillTree - Grid/constelación simple de habilidades
 * 
 * Muestra habilidades como nodos clicables en un grid con:
 * - Colores según mastery (verde/ámbar/rojo)
 * - Conectores visuales para dependencias
 * - Tooltip informativo en hover
 * - Indicador de progreso
 */
const SkillTree: React.FC<SkillTreeProps> = ({
  skills,
  onOpenSkill
}) => {
  const theme = useTheme();

  // Calcular progressPct basado en masteryLevel si no está definido
  const getProgressPct = (skill: SkillNode): number => {
    if (skill.progressPct !== undefined) {
      return skill.progressPct;
    }
    // Valores por defecto basados en masteryLevel
    switch (skill.masteryLevel) {
      case 'master': return 100;
      case 'advanced': return 75;
      case 'intermediate': return 50;
      case 'beginner': return 25;
      case 'locked': return 0;
      default: return 0;
    }
  };

  // Obtener color según masteryLevel (verde/ámbar/rojo)
  const getMasteryColor = (mastery: SkillNode['masteryLevel']): string => {
    switch (mastery) {
      case 'master':
      case 'advanced':
        return '#F44336'; // Rojo - Avanzado/Maestro
      case 'intermediate':
        return '#FF9800'; // Ámbar/Naranja - Intermedio
      case 'beginner':
        return '#4CAF50'; // Verde - Principiante
      case 'locked':
        return '#9e9e9e'; // Gris - Bloqueado
      default:
        return '#9e9e9e';
    }
  };

  // Crear mapa de skills por ID para acceso rápido
  const skillsMap = useMemo(() => {
    const map = new Map<string, SkillNode>();
    skills.forEach(skill => map.set(skill.id, skill));
    return map;
  }, [skills]);

  // Función helper para obtener referencias de dependencias
  const getDependencySkills = (skill: SkillNode): SkillNode[] => {
    return skill.dependencies
      .map(depId => skillsMap.get(depId))
      .filter((dep): dep is SkillNode => dep !== undefined);
  };

  const handleNodeClick = (skill: SkillNode) => {
    if (skill.masteryLevel !== 'locked' && onOpenSkill) {
      onOpenSkill(skill.id);
    }
  };

  return (
    <Card
      sx={{
        border: '1px solid rgba(255, 255, 255, 0.1)',
        borderRadius: 2,
        backgroundColor: 'rgba(255, 255, 255, 0.05)',
        transition: 'all 0.3s ease'
      }}
    >
      <CardContent sx={{ p: 3, position: 'relative', minHeight: '400px' }}>
        {/* Grid container */}
        <Box
          sx={{
            position: 'relative',
            width: '100%',
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(120px, 1fr))',
            gap: 3,
            justifyContent: 'center',
            alignItems: 'center',
            py: 2,
            minHeight: '400px',
            maxWidth: '100%'
          }}
        >
          {/* Nodos de habilidades */}
          {skills.map((skill) => {
            const dependencies = getDependencySkills(skill);
            const color = getMasteryColor(skill.masteryLevel);
            const progressPct = getProgressPct(skill);
            const isLocked = skill.masteryLevel === 'locked';

            return (
              <Tooltip
                key={skill.id}
                title={
                  <Box>
                    <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 0.5 }}>
                      {skill.title}
                    </Typography>
                    <Typography variant="body2" sx={{ mb: 0.5 }}>
                      Ya deberías entender: {skill.description}
                    </Typography>
                    <Typography variant="caption" sx={{ display: 'block', opacity: 0.9 }}>
                      Progreso: {progressPct}%
                    </Typography>
                    {skill.xpReward > 0 && (
                      <Typography variant="caption" sx={{ display: 'block', opacity: 0.9 }}>
                        Recompensa: {skill.xpReward} XP
                      </Typography>
                    )}
                    {skill.dependencies.length > 0 && (
                      <Typography variant="caption" sx={{ display: 'block', mt: 0.5, opacity: 0.8 }}>
                        Requiere {skill.dependencies.length} habilidad(es) previa(s)
                      </Typography>
                    )}
                  </Box>
                }
                arrow
                placement="top"
              >
                <Box
                  onClick={() => handleNodeClick(skill)}
                  sx={{
                    position: 'relative',
                    width: 100,
                    height: 100,
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 0.75,
                    p: 1.5,
                    border: `2px solid ${color}`,
                    borderRadius: '50%',
                    backgroundColor: isLocked
                      ? 'rgba(158, 158, 158, 0.1)'
                      : `${color}20`,
                    cursor: isLocked ? 'not-allowed' : 'pointer',
                    opacity: isLocked ? 0.5 : 1,
                    transition: 'all 0.2s ease',
                    zIndex: 1,
                    margin: '0 auto',
                    '&:hover': !isLocked ? {
                      transform: 'scale(1.1)',
                      backgroundColor: `${color}30`,
                      boxShadow: `0 4px 12px ${color}40`,
                      borderColor: color,
                      borderWidth: '3px'
                    } : {},
                    // Conectores visuales para dependencias (usando pseudo-elementos)
                    ...(dependencies.length > 0 && {
                      '&::after': {
                        content: '""',
                        position: 'absolute',
                        top: -8,
                        left: '50%',
                        transform: 'translateX(-50%)',
                        width: '2px',
                        height: '20px',
                        backgroundColor: dependencies[0] 
                          ? getMasteryColor(dependencies[0].masteryLevel)
                          : color,
                        opacity: 0.4,
                        zIndex: 0
                      }
                    })
                  }}
                  aria-label={`Habilidad: ${skill.title}, ${skill.masteryLevel}, ${progressPct}% completado`}
                >
                  {/* Indicador de progreso circular */}
                  <Box
                    sx={{
                      position: 'absolute',
                      top: 0,
                      left: 0,
                      right: 0,
                      bottom: 0,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center'
                    }}
                  >
                    <CircularProgress
                      variant="determinate"
                      value={progressPct}
                      size={96}
                      thickness={3}
                      sx={{
                        color: color,
                        position: 'absolute',
                        '& .MuiCircularProgress-circle': {
                          strokeLinecap: 'round'
                        }
                      }}
                    />
                  </Box>

                  {/* Contenido del nodo */}
                  <Box
                    sx={{
                      position: 'relative',
                      zIndex: 2,
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: 0.5
                    }}
                  >
                    {/* Título truncado */}
                    <Typography
                      variant="caption"
                      sx={{
                        color: isLocked ? '#9e9e9e' : '#ffffff',
                        fontWeight: 700,
                        textAlign: 'center',
                        fontSize: '0.7rem',
                        lineHeight: 1.2,
                        maxWidth: '80px',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        display: '-webkit-box',
                        WebkitLineClamp: 2,
                        WebkitBoxOrient: 'vertical'
                      }}
                    >
                      {skill.title}
                    </Typography>

                    {/* Badge de mastery */}
                    <Box
                      sx={{
                        px: 0.75,
                        py: 0.25,
                        borderRadius: 1,
                        backgroundColor: `${color}40`,
                        border: `1px solid ${color}`,
                        display: 'flex',
                        alignItems: 'center',
                        gap: 0.25
                      }}
                    >
                      <Typography
                        variant="caption"
                        sx={{
                          fontSize: '0.6rem',
                          fontWeight: 700,
                          color: color,
                          textTransform: 'uppercase',
                          letterSpacing: 0.5
                        }}
                      >
                        {skill.masteryLevel === 'master' ? 'Maestro' :
                         skill.masteryLevel === 'advanced' ? 'Avanzado' :
                         skill.masteryLevel === 'intermediate' ? 'Intermedio' :
                         skill.masteryLevel === 'beginner' ? 'Principiante' :
                         'Bloqueado'}
                      </Typography>
                    </Box>

                    {/* Porcentaje de progreso */}
                    <Typography
                      variant="caption"
                      sx={{
                        fontSize: '0.65rem',
                        fontWeight: 600,
                        color: color,
                        opacity: 0.9
                      }}
                    >
                      {progressPct}%
                    </Typography>
                  </Box>
                </Box>
              </Tooltip>
            );
          })}
        </Box>

        {/* Mensaje si no hay habilidades */}
        {skills.length === 0 && (
          <Box
            sx={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              py: 4,
              textAlign: 'center'
            }}
          >
            <Typography variant="body2" sx={{ color: '#e8f4fd', opacity: 0.7 }}>
              No hay habilidades disponibles
            </Typography>
          </Box>
        )}
      </CardContent>
    </Card>
  );
};

export default SkillTree;
