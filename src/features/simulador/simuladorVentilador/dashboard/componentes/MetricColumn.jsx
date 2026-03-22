import React from 'react';
import {
  Box,
  Typography,
  Tooltip,
  FormControlLabel,
  Switch,
  Button,
  IconButton,
  Collapse,
} from '@mui/material';
import PersonIcon from '@mui/icons-material/Person';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import SettingsIcon from '@mui/icons-material/Settings';
import VisibilityIcon from '@mui/icons-material/Visibility';
import VisibilityOffIcon from '@mui/icons-material/VisibilityOff';
import DragIndicatorIcon from '@mui/icons-material/DragIndicator';
import KeyboardArrowDownIcon from '@mui/icons-material/KeyboardArrowDown';
import PsychologyIcon from '@mui/icons-material/Psychology';

import EditableCard, { EditControls } from './EditableCard';
import AIAnalysisButton from '@/features/simulador/compartido/componentes/AIAnalysisButton';

const MetricColumn = ({
  patientData,
  isDataPersisted,
  dataSource,
  setDataSource,
  serialConnection,
  handleSendConfiguration,
  handleStopVentilator,
  configSent,
  isAdjustMode,
  toggleAdjustMode,
  resetCardConfiguration,
  cardData,
  draggedCard,
  handleDragStart,
  handleDragOver,
  handleDrop,
  handleDragEnd,
  toggleCardVisibility,
  complianceCardExpanded,
  setComplianceCardExpanded,
  ventilationMode,
  getValueColor,
  getTrend,
}) => {
  return (
    <Box sx={{ width: { xs: '100%', sm: '300px' }, flexShrink: 0, minWidth: '280px', overflow: 'hidden', mt: 0, pl: { sm: 1 } }}>
      <Box display="flex" flexDirection="column" alignItems="flex-start" gap={1}>
        {/* Logos */}
        <Box>
          <img
            src="/images/logo.png"
            alt="VentyLab"
            style={{ display: 'block', width: '100%', maxWidth: 160, height: 'auto', marginBottom: 2 }}
          />
          <img
            src="/images/logo-univalle.svg"
            alt="Univalle"
            style={{ display: 'block', width: '100%', maxWidth: 180, height: 'auto' }}
          />
        </Box>

        {/* Data source toggle */}
        <Tooltip
          title={
            patientData
              ? 'Alternar entre datos reales y los del paciente simulado'
              : 'No hay datos de paciente simulado disponibles'
          }
          placement="bottom"
          arrow
        >
          <FormControlLabel
            control={
              <Switch
                checked={dataSource === 'simulated'}
                onChange={(e) => setDataSource(e.target.checked ? 'simulated' : 'real')}
                disabled={!patientData}
                size="small"
              />
            }
            label={
              <Box display="flex" alignItems="center" gap={0.5}>
                <PersonIcon fontSize="inherit" />
                <Typography variant="caption" sx={{ fontSize: '10px', fontWeight: 600 }}>
                  {dataSource === 'simulated' ? 'Paciente Simulado' : 'Datos Reales'}
                </Typography>
              </Box>
            }
            sx={{
              backgroundColor:
                dataSource === 'simulated'
                  ? 'rgba(76, 175, 80, 0.2)'
                  : 'rgba(255, 255, 255, 0.1)',
              borderRadius: 1,
              padding: '2px 8px',
              border:
                dataSource === 'simulated'
                  ? '1px solid #4caf50'
                  : '1px solid transparent',
              transition: 'all 0.3s',
              mx: 0,
            }}
          />
        </Tooltip>

        {/* Patient indicator */}
        {isDataPersisted && patientData && (
          <Box
            sx={{
              backgroundColor: 'rgba(76, 175, 80, 0.1)',
              border: '1px solid #4caf50',
              borderRadius: 1,
              padding: '4px 8px',
              display: 'flex',
              alignItems: 'center',
              gap: 0.5,
              width: '100%',
            }}
          >
            <CheckCircleIcon sx={{ fontSize: 16, color: '#4caf50' }} />
            <Typography
              variant="caption"
              sx={{ fontSize: '10px', fontWeight: 600, color: '#4caf50' }}
            >
              {patientData.patientBasicData.nombre} {patientData.patientBasicData.apellido}
            </Typography>
          </Box>
        )}

        {/* Send / Stop buttons */}
        <Box display="flex" gap={0.5} flexWrap="wrap">
          <Tooltip
            title="Enviar configuración al ventilador y guardar datos"
            placement="bottom"
            arrow
          >
            <Button
              variant="contained"
              size="small"
              onClick={handleSendConfiguration}
              disabled={!serialConnection.isConnected}
              startIcon={configSent ? <CheckCircleIcon /> : null}
              sx={{
                backgroundColor: 'success.main',
                color: '#fff',
                minWidth: '70px',
                height: '28px',
                fontSize: '11px',
                fontWeight: 600,
                '&:hover': { backgroundColor: 'success.dark' },
              }}
            >
              {configSent ? 'Guardado' : 'Enviar'}
            </Button>
          </Tooltip>
          <Tooltip title="Detener el ventilador" placement="bottom" arrow>
            <Button
              variant="contained"
              size="small"
              onClick={handleStopVentilator}
              disabled={!serialConnection.isConnected}
              sx={{
                backgroundColor: 'error.main',
                color: '#fff',
                minWidth: '70px',
                height: '28px',
                fontSize: '11px',
                fontWeight: 600,
                '&:hover': { backgroundColor: 'error.dark' },
              }}
            >
              Detener
            </Button>
          </Tooltip>
        </Box>

        {/* Adjust mode buttons */}
        <Box display="flex" gap={0.5} flexWrap="wrap">
          <Tooltip
            title={
              isAdjustMode
                ? 'Salir del modo de ajuste'
                : 'Entrar al modo de ajuste para reorganizar tarjetas'
            }
            placement="bottom"
            arrow
          >
            <Button
              variant="outlined"
              onClick={toggleAdjustMode}
              startIcon={<SettingsIcon />}
              size="small"
              sx={{ fontSize: '11px', height: '28px' }}
            >
              {isAdjustMode ? 'Salir Ajuste' : 'Ajustar'}
            </Button>
          </Tooltip>
          {isAdjustMode && (
            <Tooltip
              title="Restablecer configuración original de tarjetas"
              placement="bottom"
              arrow
            >
              <Button
                variant="outlined"
                onClick={resetCardConfiguration}
                size="small"
                sx={{
                  color: 'warning.main',
                  borderColor: 'warning.main',
                  '&:hover': { backgroundColor: 'warning.main', color: '#fff' },
                }}
              >
                Restablecer
              </Button>
            </Tooltip>
          )}
        </Box>

        {/* Metric cards */}
        <Box display="flex" flexDirection="column" gap={0.5} width="100%">
          {cardData.map((card) => (
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
              {isAdjustMode && (
                <EditControls>
                  <Tooltip
                    title={card.config.visible ? 'Ocultar tarjeta' : 'Mostrar tarjeta'}
                    arrow
                  >
                    <IconButton
                      size="small"
                      onClick={() => toggleCardVisibility(card.id)}
                      sx={{
                        color: card.config.visible ? 'primary.main' : 'text.secondary',
                        backgroundColor: 'rgba(0, 0, 0, 0.3)',
                        '&:hover': { backgroundColor: 'rgba(0, 0, 0, 0.5)' },
                      }}
                    >
                      {card.config.visible ? (
                        <VisibilityIcon fontSize="small" />
                      ) : (
                        <VisibilityOffIcon fontSize="small" />
                      )}
                    </IconButton>
                  </Tooltip>
                  <Tooltip title="Arrastrar para reorganizar" arrow>
                    <IconButton
                      size="small"
                      sx={{
                        color: 'text.secondary',
                        backgroundColor: 'rgba(0, 0, 0, 0.3)',
                        cursor: 'grab',
                        '&:hover': { backgroundColor: 'rgba(0, 0, 0, 0.5)' },
                      }}
                    >
                      <DragIndicatorIcon fontSize="small" />
                    </IconButton>
                  </Tooltip>
                  <AIAnalysisButton isAnalyzing={false}>
                    <PsychologyIcon fontSize="small" />
                  </AIAnalysisButton>
                </EditControls>
              )}

              <Box
                display="flex"
                flexDirection="column"
                alignItems="center"
                width="100%"
                mt={0}
              >
                <Box
                  display="flex"
                  flexDirection="row"
                  alignItems="baseline"
                  justifyContent="space-between"
                  width="100%"
                  px={0.5}
                >
                  <Box display="flex" alignItems="baseline" gap={0.5}>
                    <Typography
                      variant="h6"
                      sx={{
                        fontWeight: 600,
                        lineHeight: 1,
                        fontSize: '1.1rem',
                        color: card.config.visible ? 'inherit' : 'text.secondary',
                        ...(card.rawValue > 0 && {
                          color: card.isConfigured
                            ? '#4caf50'
                            : getValueColor(card.id, card.rawValue),
                        }),
                      }}
                    >
                      {card.value}
                    </Typography>
                    <Typography
                      variant="body2"
                      sx={{
                        fontWeight: 400,
                        fontSize: '0.75rem',
                        color: card.config.visible ? 'inherit' : 'text.secondary',
                      }}
                    >
                      {card.unit}
                    </Typography>
                  </Box>
                  <Typography
                    variant="body2"
                    sx={{
                      fontWeight: 600,
                      fontSize: '0.7rem',
                      color: card.config.visible ? 'inherit' : 'text.secondary',
                      textAlign: 'right',
                    }}
                  >
                    {card.label}
                  </Typography>
                </Box>
                {card.config.visible && (
                  <Typography
                    variant="caption"
                    sx={{
                      fontSize: '9px',
                      color: card.isConfigured ? '#4caf50' : '#ff9800',
                      backgroundColor: card.isConfigured
                        ? 'rgba(76, 175, 80, 0.1)'
                        : 'rgba(255, 152, 0, 0.1)',
                      px: 0.4,
                      py: 0.1,
                      borderRadius: 0.5,
                      mt: 0.3,
                      fontWeight: 500,
                    }}
                  >
                    {card.isConfigured ? 'CONF' : 'MED'}
                  </Typography>
                )}
              </Box>

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
                          transform: 'scale(1.1)',
                        },
                        width: 24,
                        height: 24,
                      }}
                    >
                      <Typography variant="caption" sx={{ fontSize: '10px', fontWeight: 'bold' }}>
                        ↺
                      </Typography>
                    </IconButton>
                  </Tooltip>
                </Box>
              )}

              {card.id === 'compliance' &&
                card.config.visible &&
                ventilationMode === 'pressure' && (
                  <Box mt={1} sx={{ width: '100%' }}>
                    <Box
                      display="flex"
                      alignItems="center"
                      justifyContent="center"
                      mb={0.5}
                    >
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
                          animation: card.status?.isCalculating
                            ? 'pulse 1s infinite'
                            : 'none',
                          mr: 0.5,
                        }}
                      />
                      <Typography
                        variant="caption"
                        sx={{ fontSize: '9px', color: 'text.secondary' }}
                      >
                        {card.status?.isCalculating
                          ? `Calculando (${card.status.currentCycle}/5)`
                          : card.status?.lastAdjustment
                          ? 'Actualizada'
                          : 'Lista'}
                      </Typography>
                    </Box>
                    <Collapse in={complianceCardExpanded}>
                      <Box sx={{ fontSize: '0.75rem', color: 'text.secondary', mt: 1 }}>
                        {card.status && card.status.isCalculating && (
                          <Box
                            sx={{
                              bgcolor: 'rgba(255, 152, 0, 0.1)',
                              p: 0.5,
                              borderRadius: 0.5,
                              mb: 0.5,
                            }}
                          >
                            <Typography
                              variant="caption"
                              color="warning.main"
                              display="block"
                              sx={{ fontSize: '9px' }}
                            >
                              <strong>Estado:</strong> Calculando compliance automática
                            </Typography>
                            <Typography
                              variant="caption"
                              color="warning.main"
                              display="block"
                              sx={{ fontSize: '9px' }}
                            >
                              <strong>Progreso:</strong> Ciclo {card.status.currentCycle} de{' '}
                              {card.status.totalCycles}
                            </Typography>
                          </Box>
                        )}
                      </Box>
                    </Collapse>
                    <Box display="flex" justifyContent="center" mt={0.5}>
                      <IconButton
                        size="small"
                        onClick={() => setComplianceCardExpanded(!complianceCardExpanded)}
                        sx={{
                          color: 'text.secondary',
                          p: 0.5,
                          '&:hover': { backgroundColor: 'rgba(255, 255, 255, 0.1)' },
                        }}
                      >
                        {complianceCardExpanded ? (
                          <KeyboardArrowDownIcon
                            sx={{ fontSize: 16, transform: 'rotate(180deg)' }}
                          />
                        ) : (
                          <KeyboardArrowDownIcon sx={{ fontSize: 16 }} />
                        )}
                      </IconButton>
                    </Box>
                  </Box>
                )}

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
                      '100%': { opacity: 1 },
                    },
                  }}
                />
              )}
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
                      borderBottom: '8px solid #4caf50',
                    }),
                    ...(getTrend(card.id, card.rawValue) === 'decreasing' && {
                      borderTop: '8px solid #f44336',
                    }),
                    ...(getTrend(card.id, card.rawValue) === 'stable' && {
                      width: 8,
                      height: 2,
                      backgroundColor: '#ff9800',
                      borderRadius: 1,
                    }),
                  }}
                />
              )}
            </EditableCard>
          ))}
        </Box>
      </Box>
    </Box>
  );
};

export default MetricColumn;
