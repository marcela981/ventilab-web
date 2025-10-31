import React from 'react';
import {
  Box,
  Typography,
  IconButton,
  Collapse,
  Tooltip,
} from '@mui/material';
import VisibilityIcon from '@mui/icons-material/Visibility';
import VisibilityOffIcon from '@mui/icons-material/VisibilityOff';
import DragIndicatorIcon from '@mui/icons-material/DragIndicator';
import KeyboardArrowDownIcon from '@mui/icons-material/KeyboardArrowDown';
import PsychologyIcon from '@mui/icons-material/Psychology';

import { EditableCard } from './styles/DashboardStyles';
import { EditControls } from '../common/EditableCard';
import AIAnalysisButton from '../common/AIAnalysisButton';

/**
 * MonitoringCards.jsx
 * 
 * Componente que encapsula toda la lógica de renderizado de las tarjetas de monitoreo.
 * Incluye:
 * - Mapeo del array cardData
 * - Lógica de drag & drop
 * - Controles de visibilidad y expansión
 * - Renderizado condicional según tipo de tarjeta
 * - Indicadores de estado en tiempo real
 * - Información expandida para compliance
 */

const MonitoringCards = ({
  // Props principales
  cardData,
  draggedCard,
  isAdjustMode,
  complianceCardExpanded,
  ventilationMode,
  
  // Handlers de drag & drop
  handleDragStart,
  handleDragOver,
  handleDrop,
  handleDragEnd,
  
  // Handlers de UI
  toggleCardVisibility,
  setComplianceCardExpanded,
  handleAIAnalysis,
  
  // Datos y funciones
  displayData,
  ventilatorData,
  complianceData,
  getValueColor,
  getTrend,
  isAnalyzing,
}) => {
  return (
    <Box mt={1} display="flex" flexDirection="column" gap={1}>
      {cardData.map((card, idx) => (
        <EditableCard
          key={card.id}
          elevation={3}
          isEditing={isAdjustMode}
          isVisible={card.config.visible}
          isDragging={draggedCard === card.id}
          isExpanded={card.id === 'compliance' && complianceCardExpanded}
          draggable={isAdjustMode}
          onDragStart={(e) => handleDragStart(e, card.id)}
          onDragOver={handleDragOver}
          onDrop={(e) => handleDrop(e, card.id)}
          onDragEnd={handleDragEnd}
        >
          {/* Controles de edición */}
          {isAdjustMode && (
            <EditControls>
              <Tooltip title={card.config.visible ? "Ocultar tarjeta" : "Mostrar tarjeta"} arrow>
                <IconButton
                  size="small"
                  onClick={() => toggleCardVisibility(card.id)}
                  sx={{ 
                    color: card.config.visible ? 'primary.main' : 'text.secondary',
                    backgroundColor: 'rgba(0, 0, 0, 0.3)',
                    '&:hover': { backgroundColor: 'rgba(0, 0, 0, 0.5)' }
                  }}
                >
                  {card.config.visible ? <VisibilityIcon fontSize="small" /> : <VisibilityOffIcon fontSize="small" />}
                </IconButton>
              </Tooltip>
              
              <Tooltip title="Arrastrar para reorganizar" arrow>
                <IconButton
                  size="small"
                  sx={{ 
                    color: 'text.secondary',
                    backgroundColor: 'rgba(0, 0, 0, 0.3)',
                    cursor: 'grab',
                    '&:hover': { backgroundColor: 'rgba(0, 0, 0, 0.5)' }
                  }}
                >
                  <DragIndicatorIcon fontSize="small" />
                </IconButton>
              </Tooltip>
              
              <AIAnalysisButton isAnalyzing={isAnalyzing} onClick={handleAIAnalysis}>
                <PsychologyIcon fontSize="small" />
              </AIAnalysisButton>
            </EditControls>
          )}
          
          {/* Contenido de la tarjeta */}
          <Box display="flex" flexDirection="column" alignItems="center" width="100%" mt={1}>
            {/* Línea principal: Valor + Unidad + Label */}
            <Box display="flex" flexDirection="row" alignItems="baseline" justifyContent="space-between" width="100%" px={1}>
              {/* Valor y unidad a la izquierda */}
              <Box display="flex" alignItems="baseline" gap={0.5}>
                <Typography 
                  variant="h6" 
                  sx={{ 
                    fontWeight: 600, 
                    lineHeight: 1,
                    fontSize: '1.4rem',
                    color: card.config.visible ? 'inherit' : 'text.secondary',
                    // Color dinámico basado en el valor y si es configurado o medido
                    ...(card.rawValue > 0 && {
                      color: card.isConfigured 
                        ? '#4caf50' // Verde para valores configurados
                        : getValueColor(card.id, card.rawValue) // Colores dinámicos para valores medidos
                    })
                  }}
                >
                  {card.value}
                </Typography>
                <Typography 
                  variant="body2" 
                  sx={{ 
                    fontWeight: 400, 
                    fontSize: '0.85rem',
                    color: card.config.visible ? 'inherit' : 'text.secondary'
                  }}
                >
                  {card.unit}
                </Typography>
              </Box>
              
              {/* Label a la derecha */}
              <Typography 
                variant="body2" 
                sx={{ 
                  fontWeight: 600, 
                  fontSize: '0.8rem',
                  color: card.config.visible ? 'inherit' : 'text.secondary',
                  textAlign: 'right'
                }}
              >
                {card.label}
              </Typography>
            </Box>
            
            {/* Indicador de tipo de valor debajo */}
            {card.config.visible && (
              <Typography 
                variant="caption" 
                sx={{ 
                  fontSize: '10px',
                  color: card.isConfigured ? '#4caf50' : '#ff9800',
                  backgroundColor: card.isConfigured ? 'rgba(76, 175, 80, 0.1)' : 'rgba(255, 152, 0, 0.1)',
                  px: 0.5,
                  py: 0.2,
                  borderRadius: 0.5,
                  mt: 0.5,
                  fontWeight: 500
                }}
              >
                {card.isConfigured ? 'CONFIGURADO' : 'MEDIDO'}
              </Typography>
            )}
          </Box>

          {/* Botón de reset para volumen integrado */}
          {card.id === 'volumenIntegrado' && card.config.visible && (
            <Box display="flex" justifyContent="center" mt={0.5}>
              <Tooltip title="Resetear volumen integrado a 0" arrow>
                <IconButton
                  size="small"
                  onClick={card.onReset}
                  sx={{ 
                    color: 'warning.main',
                    backgroundColor: 'rgba(255, 152, 0, 0.1)',
                    '&:hover': { 
                      backgroundColor: 'rgba(255, 152, 0, 0.2)',
                      transform: 'scale(1.1)'
                    },
                    width: 24,
                    height: 24
                  }}
                >
                  <Typography variant="caption" sx={{ fontSize: '10px', fontWeight: 'bold' }}>
                    ↺
                  </Typography>
                </IconButton>
              </Tooltip>
            </Box>
          )}

          {/* Información adicional para la tarjeta de compliance */}
          {card.id === 'compliance' && card.config.visible && ventilationMode === 'pressure' && (
            <Box mt={1} sx={{ width: '100%' }}>
              {/* Información básica siempre visible */}
              <Box display="flex" alignItems="center" justifyContent="center" mb={0.5}>
                <Box
                  sx={{
                    width: 6,
                    height: 6,
                    borderRadius: '50%',
                    backgroundColor: card.status?.isCalculating 
                      ? 'orange' 
                      : card.status?.lastAdjustment 
                      ? 'success.main' 
                      : 'text.secondary',
                    animation: card.status?.isCalculating ? 'pulse 1s infinite' : 'none',
                    mr: 0.5
                  }}
                />
                <Typography variant="caption" sx={{ fontSize: '9px', color: 'text.secondary' }}>
                  {card.status?.isCalculating 
                    ? `Calculando (${card.status.currentCycle}/5)`
                    : card.status?.lastAdjustment
                    ? 'Actualizada'
                    : 'Lista'
                  }
                </Typography>
              </Box>

              {/* Información expandida */}
              <Collapse in={complianceCardExpanded}>
                <Box sx={{ fontSize: '0.75rem', color: 'text.secondary', mt: 1 }}>
                  {/* Estado de cálculo */}
                  {card.status && card.status.isCalculating && (
                    <Box sx={{ bgcolor: 'rgba(255, 152, 0, 0.1)', p: 0.5, borderRadius: 0.5, mb: 0.5 }}>
                      <Typography variant="caption" color="warning.main" display="block" sx={{ fontSize: '9px' }}>
                        <strong>Estado:</strong> Calculando compliance automática
                      </Typography>
                      <Typography variant="caption" color="warning.main" display="block" sx={{ fontSize: '9px' }}>
                        <strong>Progreso:</strong> Ciclo {card.status.currentCycle} de {card.status.totalCycles}
                      </Typography>
                    </Box>
                  )}

                  {/* Último ajuste */}
                  {card.status && card.status.lastAdjustment && (
                    <Box sx={{ bgcolor: 'rgba(76, 175, 80, 0.1)', p: 0.5, borderRadius: 0.5, mb: 0.5 }}>
                      <Typography variant="caption" color="success.main" display="block" sx={{ fontSize: '9px' }}>
                        <strong>Último ajuste:</strong> {card.status.lastAdjustment.timestamp.toLocaleTimeString()}
                      </Typography>
                      {card.status.lastAdjustment.error && (
                        <Typography variant="caption" color="success.main" display="block" sx={{ fontSize: '9px' }}>
                          <strong>Error detectado:</strong> {card.status.lastAdjustment.error.toFixed(1)}%
                        </Typography>
                      )}
                      <Typography variant="caption" color="success.main" display="block" sx={{ fontSize: '9px' }}>
                        <strong>Nueva C:</strong> {card.status.lastAdjustment.newCompliance?.toFixed(5)} L/cmH₂O
                      </Typography>
                    </Box>
                  )}

                  {/* Errores actuales */}
                  {card.errors && card.errors.length > 0 && (
                    <Box sx={{ bgcolor: 'rgba(244, 67, 54, 0.1)', p: 0.5, borderRadius: 0.5, mb: 0.5 }}>
                      <Typography variant="caption" color="error.main" display="block" sx={{ fontSize: '9px', fontWeight: 'bold' }}>
                        Errores detectados ({card.errors.length}):
                      </Typography>
                      {card.errors.slice(0, 3).map((error, index) => (
                        <Typography 
                          key={index} 
                          variant="caption" 
                          color={error.severity === 'high' ? 'error.main' : 'warning.main'}
                          display="block"
                          sx={{ fontSize: '8px', ml: 1 }}
                        >
                          • {error.type.replace('_', ' ')}: {error.errorPercentage?.toFixed(1)}%
                        </Typography>
                      ))}
                      {card.errors.length > 3 && (
                        <Typography variant="caption" color="text.secondary" display="block" sx={{ fontSize: '8px', ml: 1 }}>
                          ... y {card.errors.length - 3} más
                        </Typography>
                      )}
                    </Box>
                  )}

                  {/* Información técnica */}
                  <Box sx={{ bgcolor: 'rgba(255, 255, 255, 0.05)', p: 0.5, borderRadius: 0.5 }}>
                    <Typography variant="caption" color="text.secondary" display="block" sx={{ fontSize: '9px' }}>
                      <strong>Rango normal:</strong> 0.015 - 0.15 L/cmH₂O
                    </Typography>
                    <Typography variant="caption" color="text.secondary" display="block" sx={{ fontSize: '9px' }}>
                      <strong>Precisión:</strong> ±5% (umbral de recálculo)
                    </Typography>
                    <Typography variant="caption" color="text.secondary" display="block" sx={{ fontSize: '9px' }}>
                      <strong>Método:</strong> Promedio de 3 ciclos (filtrado)
                    </Typography>
                  </Box>
                </Box>
              </Collapse>

              {/* Flecha para expandir/colapsar */}
              <Box display="flex" justifyContent="center" mt={0.5}>
                <IconButton
                  size="small"
                  onClick={() => setComplianceCardExpanded(!complianceCardExpanded)}
                  sx={{ 
                    color: 'text.secondary', 
                    p: 0.5,
                    '&:hover': { backgroundColor: 'rgba(255, 255, 255, 0.1)' }
                  }}
                >
                  {complianceCardExpanded ? (
                    <KeyboardArrowDownIcon sx={{ fontSize: 16, transform: 'rotate(180deg)' }} />
                  ) : (
                    <KeyboardArrowDownIcon sx={{ fontSize: 16 }} />
                  )}
                </IconButton>
              </Box>
            </Box>
          )}
          
          {/* Indicador de estado en tiempo real */}
          {card.config.visible && card.rawValue > 0 && (
            <Box
              sx={{
                position: 'absolute',
                top: 8,
                left: 8,
                width: 8,
                height: 8,
                borderRadius: '50%',
                backgroundColor: getValueColor(card.id, card.rawValue),
                animation: 'pulse 2s infinite',
                '@keyframes pulse': {
                  '0%': { opacity: 1 },
                  '50%': { opacity: 0.5 },
                  '100%': { opacity: 1 }
                }
              }}
            />
          )}

          {/* Indicador de tendencia */}
          {card.config.visible && card.rawValue > 0 && card.id !== 'compliance' && (
            <Box
              sx={{
                position: 'absolute',
                top: 8,
                right: 8,
                width: 0,
                height: 0,
                borderLeft: '4px solid transparent',
                borderRight: '4px solid transparent',
                ...(getTrend(card.id, card.rawValue) === 'increasing' && {
                  borderBottom: '8px solid #4caf50'
                }),
                ...(getTrend(card.id, card.rawValue) === 'decreasing' && {
                  borderTop: '8px solid #f44336'
                }),
                ...(getTrend(card.id, card.rawValue) === 'stable' && {
                  width: 8,
                  height: 2,
                  backgroundColor: '#ff9800',
                  borderRadius: 1
                })
              }}
            />
          )}
        </EditableCard>
      ))}
    </Box>
  );
};

export default MonitoringCards;
