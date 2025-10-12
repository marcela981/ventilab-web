import React from 'react';
import {
  Box,
  Typography,
  Tooltip,
  FormControlLabel,
  Switch,
  Button,
  Paper,
  Container,
  Grid,
  Slider,
  IconButton,
  Collapse,
  TextField,
} from '@mui/material';
import PersonIcon from '@mui/icons-material/Person';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import SettingsIcon from '@mui/icons-material/Settings';
import VisibilityIcon from '@mui/icons-material/Visibility';
import VisibilityOffIcon from '@mui/icons-material/VisibilityOff';
import DragIndicatorIcon from '@mui/icons-material/DragIndicator';
import KeyboardArrowDownIcon from '@mui/icons-material/KeyboardArrowDown';
import PsychologyIcon from '@mui/icons-material/Psychology';

import RealTimeCharts from '../RealTimeCharts';
import LoopChart from '../common/LoopChart';
import ValidatedInput from '../common/ValidatedInput';
import ComplianceStatus from '../ComplianceStatus';
import ValidationAlerts from '../ValidationAlerts';
import EditableCard, { EditControls } from '../common/EditableCard';
import AIAnalysisButton from '../common/AIAnalysisButton';
import ModeToggle from '../common/ModeToggle';

const MonitoringTab = ({
  // datos de paciente / fuente
  patientData,
  isDataPersisted,
  dataSource,
  setDataSource,

  // conexión y acciones
  serialConnection,
  handleSendConfiguration,
  handleStopVentilator,

  // estado UI
  configSent,
  isAdjustMode,
  toggleAdjustMode,
  resetCardConfiguration,

  // tarjetas y drag
  cardData,
  draggedCard,
  handleDragStart,
  handleDragOver,
  handleDrop,
  handleDragEnd,
  toggleCardVisibility,
  complianceCardExpanded,
  setComplianceCardExpanded,

  // valores/funciones cálculo
  ventilationMode,
  getValueColor,
  getTrend,
  displayData,
  ventilatorData,
  parameterValidation,
  handleParameterChange,
  complianceData,
  errorDetection,
  autoAdjustmentEnabled,
  lastAutoAdjustment,
  showValidationAlerts,
  setShowValidationAlerts,
  isAnalyzing,
  handleAIAnalysis,
}) => {
  return (
    <Box display="flex" flexDirection="row" alignItems="flex-start" mb={2} ml={2} pb={6}>
      {/* Imágenes*/}
      <Box display="flex" flexDirection="column" alignItems="left">
        <img src="/images/logo-univalle.svg" alt="Univalle" width={300} height={50} style={{ marginBottom: 4 }} />
        <img src="/images/logo.png" alt="VentyLab" width={260} height={130} />

        {/* Botón de modo de ajuste */}
        <Box mt={1} mb={1} display="flex" gap={1} flexDirection="column">
          {/* Control para cambiar entre datos reales y simulados */}
          <Tooltip 
            title={patientData ? "Alternar entre datos reales y los del paciente simulado" : "No hay datos de paciente simulado disponibles"}
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
                backgroundColor: dataSource === 'simulated' ? 'rgba(76, 175, 80, 0.2)' : 'rgba(255, 255, 255, 0.1)',
                borderRadius: 1,
                padding: '2px 8px',
                border: dataSource === 'simulated' ? '1px solid #4caf50' : '1px solid transparent',
                transition: 'all 0.3s'
              }}
            />
          </Tooltip>

          {/* Indicador de datos de paciente persistidos */}
          {isDataPersisted && patientData && (
            <Box sx={{ 
              backgroundColor: 'rgba(76, 175, 80, 0.1)', 
              border: '1px solid #4caf50',
              borderRadius: 1,
              padding: '4px 8px',
              display: 'flex',
              alignItems: 'center',
              gap: 0.5
            }}>
              <CheckCircleIcon sx={{ fontSize: 16, color: '#4caf50' }} />
              <Typography variant="caption" sx={{ fontSize: '10px', fontWeight: 600, color: '#4caf50' }}>
                {patientData.patientBasicData.nombre} {patientData.patientBasicData.apellido}
              </Typography>
            </Box>
          )}

          {/* Botones Enviar y Detener */}
          <Box display="flex" gap={1}>
            <Tooltip title="Enviar configuración al ventilador y guardar datos" placement="bottom" arrow>
              <Button
                variant="contained"
                size="small"
                onClick={handleSendConfiguration}
                disabled={!serialConnection.isConnected}
                startIcon={configSent ? <CheckCircleIcon /> : null}
                sx={{
                  backgroundColor: 'success.main',
                  color: '#fff',
                  minWidth: '80px',
                  height: '32px',
                  fontSize: '12px',
                  fontWeight: 600,
                  '&:hover': { backgroundColor: 'success.dark' }
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
                  minWidth: '80px',
                  height: '32px',
                  fontSize: '12px',
                  fontWeight: 600,
                  '&:hover': { backgroundColor: 'error.dark' }
                }}
              >
                Detener
              </Button>
            </Tooltip>
          </Box>

          <Box display="flex" gap={1}>
            <Tooltip title={isAdjustMode ? "Salir del modo de ajuste" : "Entrar al modo de ajuste para reorganizar tarjetas"} placement="bottom" arrow>
              <Button
                variant="outlined"
                onClick={toggleAdjustMode}
                startIcon={<SettingsIcon />}
                size="small"
              >
                {isAdjustMode ? 'Salir Ajuste' : 'Ajustar Tarjetas'}
              </Button>
            </Tooltip>
            {isAdjustMode && (
              <Tooltip title="Restablecer configuración original de tarjetas" placement="bottom" arrow>
                <Button variant="outlined" onClick={resetCardConfiguration} size="small" sx={{ color: 'warning.main', borderColor: 'warning.main', '&:hover': { backgroundColor: 'warning.main', color: '#fff' } }}>
                  Restablecer
                </Button>
              </Tooltip>
            )}
          </Box>
        </Box>

        {/* Valores de los parámetros - tiempo real*/}
        <Box mt={1} display="flex" flexDirection="column" gap={1}>
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
                  <Tooltip title={card.config.visible ? "Ocultar tarjeta" : "Mostrar tarjeta"} arrow>
                    <IconButton size="small" onClick={() => toggleCardVisibility(card.id)} sx={{ color: card.config.visible ? 'primary.main' : 'text.secondary', backgroundColor: 'rgba(0, 0, 0, 0.3)', '&:hover': { backgroundColor: 'rgba(0, 0, 0, 0.5)' } }}>
                      {card.config.visible ? <VisibilityIcon fontSize="small" /> : <VisibilityOffIcon fontSize="small" />}
                    </IconButton>
                  </Tooltip>
                  <Tooltip title="Arrastrar para reorganizar" arrow>
                    <IconButton size="small" sx={{ color: 'text.secondary', backgroundColor: 'rgba(0, 0, 0, 0.3)', cursor: 'grab', '&:hover': { backgroundColor: 'rgba(0, 0, 0, 0.5)' } }}>
                      <DragIndicatorIcon fontSize="small" />
                    </IconButton>
                  </Tooltip>
                  <AIAnalysisButton isAnalyzing={false}>
                    <PsychologyIcon fontSize="small" />
                  </AIAnalysisButton>
                </EditControls>
              )}

              <Box display="flex" flexDirection="column" alignItems="center" width="100%" mt={1}>
                <Box display="flex" flexDirection="row" alignItems="baseline" justifyContent="space-between" width="100%" px={1}>
                  <Box display="flex" alignItems="baseline" gap={0.5}>
                    <Typography variant="h6" sx={{ fontWeight: 600, lineHeight: 1, fontSize: '1.4rem', color: card.config.visible ? 'inherit' : 'text.secondary', ...(card.rawValue > 0 && { color: card.isConfigured ? '#4caf50' : getValueColor(card.id, card.rawValue) }) }}>
                      {card.value}
                    </Typography>
                    <Typography variant="body2" sx={{ fontWeight: 400, fontSize: '0.85rem', color: card.config.visible ? 'inherit' : 'text.secondary' }}>
                      {card.unit}
                    </Typography>
                  </Box>
                  <Typography variant="body2" sx={{ fontWeight: 600, fontSize: '0.8rem', color: card.config.visible ? 'inherit' : 'text.secondary', textAlign: 'right' }}>
                    {card.label}
                  </Typography>
                </Box>
                {card.config.visible && (
                  <Typography variant="caption" sx={{ fontSize: '10px', color: card.isConfigured ? '#4caf50' : '#ff9800', backgroundColor: card.isConfigured ? 'rgba(76, 175, 80, 0.1)' : 'rgba(255, 152, 0, 0.1)', px: 0.5, py: 0.2, borderRadius: 0.5, mt: 0.5, fontWeight: 500 }}>
                    {card.isConfigured ? 'CONFIGURADO' : 'MEDIDO'}
                  </Typography>
                )}
              </Box>

              {card.id === 'volumenIntegrado' && card.config.visible && (
                <Box display="flex" justifyContent="center" mt={0.5}>
                  <Tooltip title="Resetear volumen integrado a 0" arrow>
                    <IconButton size="small" onClick={card.onReset} sx={{ color: 'warning.main', backgroundColor: 'rgba(255, 152, 0, 0.1)', '&:hover': { backgroundColor: 'rgba(255, 152, 0, 0.2)', transform: 'scale(1.1)' }, width: 24, height: 24 }}>
                      <Typography variant="caption" sx={{ fontSize: '10px', fontWeight: 'bold' }}>↺</Typography>
                    </IconButton>
                  </Tooltip>
                </Box>
              )}

              {card.id === 'compliance' && card.config.visible && ventilationMode === 'pressure' && (
                <Box mt={1} sx={{ width: '100%' }}>
                  <Box display="flex" alignItems="center" justifyContent="center" mb={0.5}>
                    <Box sx={{ width: 6, height: 6, borderRadius: '50%', backgroundColor: card.status?.isCalculating ? 'orange' : card.status?.lastAdjustment ? 'success.main' : 'text.secondary', animation: card.status?.isCalculating ? 'pulse 1s infinite' : 'none', mr: 0.5 }} />
                    <Typography variant="caption" sx={{ fontSize: '9px', color: 'text.secondary' }}>
                      {card.status?.isCalculating ? `Calculando (${card.status.currentCycle}/5)` : card.status?.lastAdjustment ? 'Actualizada' : 'Lista'}
                    </Typography>
                  </Box>
                  <Collapse in={complianceCardExpanded}>
                    <Box sx={{ fontSize: '0.75rem', color: 'text.secondary', mt: 1 }}>
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
                    </Box>
                  </Collapse>
                  <Box display="flex" justifyContent="center" mt={0.5}>
                    <IconButton size="small" onClick={() => setComplianceCardExpanded(!complianceCardExpanded)} sx={{ color: 'text.secondary', p: 0.5, '&:hover': { backgroundColor: 'rgba(255, 255, 255, 0.1)' } }}>
                      {complianceCardExpanded ? (
                        <KeyboardArrowDownIcon sx={{ fontSize: 16, transform: 'rotate(180deg)' }} />
                      ) : (
                        <KeyboardArrowDownIcon sx={{ fontSize: 16 }} />
                      )}
                    </IconButton>
                  </Box>
                </Box>
              )}

              {card.config.visible && card.rawValue > 0 && (
                <Box sx={{ position: 'absolute', top: 8, left: 8, width: 8, height: 8, borderRadius: '50%', backgroundColor: getValueColor(card.id, card.rawValue), animation: 'pulse 2s infinite', '@keyframes pulse': { '0%': { opacity: 1 }, '50%': { opacity: 0.5 }, '100%': { opacity: 1 } } }} />
              )}
              {card.config.visible && card.rawValue > 0 && card.id !== 'compliance' && (
                <Box sx={{ position: 'absolute', top: 8, right: 8, width: 0, height: 0, borderLeft: '4px solid transparent', borderRight: '4px solid transparent', ...(getTrend(card.id, card.rawValue) === 'increasing' && { borderBottom: '8px solid #4caf50' }), ...(getTrend(card.id, card.rawValue) === 'decreasing' && { borderTop: '8px solid #f44336' }), ...(getTrend(card.id, card.rawValue) === 'stable' && { width: 8, height: 2, backgroundColor: '#ff9800', borderRadius: 1 }) }} />
              )}
            </EditableCard>
          ))}
        </Box>
      </Box>

      {/* Inputs Presión control y Volumen control */}
      <Box display="flex" flexDirection="row" alignItems="flex-start" ml={4} mt={2} gap={3}>
        {/* Input FIO2 */}
        <Box display="flex" flexDirection="column" alignItems="center" ml={ventilationMode === 'pressure' ? 0 : 0}>
          <Typography variant="subtitle2" sx={{ fontSize: '24px', fontWeight: 200 }}>% FIO2</Typography>
          <ValidatedInput
            parameter="fio2"
            value={ventilatorData.fio2}
            onChange={handleParameterChange}
            label="FIO2"
            unit="%"
            validation={parameterValidation.validateSingleParameter('fio2', ventilatorData.fio2, ventilatorData, ventilationMode)}
            ranges={parameterValidation.getParameterRanges('fio2')}
            sx={{ width: '180px', height: '100px' }}
            inputProps={{ min: 21, max: 100 }}
          />
        </Box>

        {ventilationMode === 'volume' && (
          <>
            <Box display="flex" flexDirection="column" alignItems="center">
              <Typography variant="subtitle2" sx={{ fontSize: '24px', fontWeight: 300 }}>Volumen</Typography>
              <ValidatedInput
                parameter="volumen"
                value={ventilatorData.volumen}
                onChange={handleParameterChange}
                label="Volumen"
                unit="ml"
                validation={parameterValidation.validateSingleParameter('volumen', ventilatorData.volumen, ventilatorData, ventilationMode)}
                ranges={parameterValidation.getParameterRanges('volumen')}
                sx={{ width: '180px', height: '80px' }}
                inputProps={{ min: 50, max: 2000 }}
              />
            </Box>
            <Box display="flex" flexDirection="column" alignItems="center">
              <Typography variant="subtitle2" sx={{ fontSize: '24px', fontWeight: 300 }}>Q Max</Typography>
              <TextField type="number" variant="outlined" size="small" inputProps={{ min: 0, step: 0.1 }} sx={{ width: '180px', height: '80px' }} value={ventilatorData.qMax || ''} onChange={e => handleParameterChange('qMax', Number(e.target.value))} helperText={ventilatorData.qMax ? `Calculado: ${ventilatorData.qMax.toFixed(1)} L/min` : 'Auto-calculado'} InputProps={{ readOnly: true }} />
            </Box>
          </>
        )}

        {ventilationMode === 'pressure' && (
          <>
            <Box display="flex" flexDirection="column" alignItems="center" ml={2}>
              <Typography variant="subtitle2" sx={{ fontSize: '24px', fontWeight: 300 }}>PIP [cmH2O]</Typography>
              <ValidatedInput
                parameter="presionMax"
                value={ventilatorData.presionMax || 20}
                onChange={handleParameterChange}
                label="PIP"
                unit="cmH2O"
                validation={parameterValidation.validateSingleParameter('presionMax', ventilatorData.presionMax || 20, ventilatorData, ventilationMode)}
                ranges={parameterValidation.getParameterRanges('presionMax')}
                sx={{ width: '180px', height: '80px' }}
                inputProps={{ min: 5, max: 60 }}
              />
            </Box>
          </>
        )}

        <Box display="flex" flexDirection="column" alignItems="center" ml={ventilationMode === 'pressure' ? 2 : 0}>
          <Typography variant="subtitle2" sx={{ fontSize: '24px', fontWeight: 300 }}>PEEP</Typography>
          <ValidatedInput
            parameter="peep"
            value={ventilatorData.peep}
            onChange={handleParameterChange}
            label="PEEP"
            unit="cmH2O"
            validation={parameterValidation.validateSingleParameter('peep', ventilatorData.peep, ventilatorData, ventilationMode)}
            ranges={parameterValidation.getParameterRanges('peep')}
            sx={{ width: '180px', height: '80px' }}
            inputProps={{ min: 0, max: 20 }}
          />
        </Box>

        <Box display="flex" flexDirection="column" alignItems="center" mt={4}>
          <ModeToggle
            ventilationMode={ventilationMode}
            onChange={() => {}}
            AnalysisButton={
              <Tooltip title="Analizar datos con Inteligencia Artificial" placement="bottom" arrow>
                <AIAnalysisButton isAnalyzing={isAnalyzing} onClick={handleAIAnalysis} />
              </Tooltip>
            }
          />
        </Box>
      </Box>

      {/* Graficos */}
      <Box sx={{ minHeight: '100vh', padding: 2, paddingBottom: '140px' }}>
        <Container maxWidth="xl" sx={{ mt: 1, marginLeft: ventilationMode === 'pressure' ? -62 : -83, marginTop: 15 }}>
          <Grid container spacing={3} justifyContent="center" alignItems="center">
            <Grid item xs={12} display="flex" flexDirection="column" alignItems="center" justifyContent="center">
              <Box display="flex" flexDirection="column" alignItems="center" gap={2} alignSelf="flex-start" sx={{ marginLeft: -40 }}>
                <Paper elevation={0} sx={{ width: 700, height: 230, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', p: 1, backgroundColor: 'rgba(141, 138, 138, 0.2)' }}>
                  <Typography variant="h6" sx={{ mb: 1, color: '#fff' }}>Gráfica de Presión</Typography>
                  {dataSource === 'simulated' ? (
                    <Box display="flex" justifyContent="center" alignItems="center" height="100%" flexDirection="column" gap={1}>
                      <PersonIcon sx={{ fontSize: 40, color: 'text.secondary' }}/>
                      <Typography sx={{color: 'text.secondary' }}>Las gráficas no están disponibles en modo Paciente Simulado.</Typography>
                      <Typography variant="caption" sx={{color: 'text.secondary' }}>Use los controles para ajustar los parámetros de simulación.</Typography>
                    </Box>
                  ) : (
                    <RealTimeCharts type="pressure" data={displayData} isConnected={serialConnection.isConnected} />
                  )}
                </Paper>
                <Paper elevation={0} sx={{ width: 700, height: 230, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', p: 1, backgroundColor: 'rgba(141, 138, 138, 0.2)' }}>
                  <Typography variant="h6" sx={{ mb: 1, color: '#fff' }}>Gráfica de Flujo</Typography>
                  {dataSource === 'simulated' ? (
                    <Box display="flex" justifyContent="center" alignItems="center" height="100%" flexDirection="column" gap={1}>
                      <PersonIcon sx={{ fontSize: 40, color: 'text.secondary' }}/>
                      <Typography sx={{color: 'text.secondary' }}>Las gráficas no están disponibles en modo Paciente Simulado.</Typography>
                    </Box>
                  ) : (
                    <RealTimeCharts type="flow" data={displayData} isConnected={serialConnection.isConnected} />
                  )}
                </Paper>
                <Paper elevation={0} sx={{ width: 700, height: 230, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', p: 1, backgroundColor: 'rgba(141, 138, 138, 0.2)' }}>
                  <Typography variant="h6" sx={{ mb: 1, color: '#fff' }}>Gráfica de Volumen</Typography>
                  {dataSource === 'simulated' ? (
                    <Box display="flex" justifyContent="center" alignItems="center" height="100%" flexDirection="column" gap={1}>
                      <PersonIcon sx={{ fontSize: 40, color: 'text.secondary' }}/>
                      <Typography sx={{color: 'text.secondary' }}>Las gráficas no están disponibles en modo Paciente Simulado.</Typography>
                    </Box>
                  ) : (
                    <RealTimeCharts type="volume" data={displayData} isConnected={serialConnection.isConnected} />
                  )}
                </Paper>
                <Paper elevation={0} sx={{ width: 700, height: 230, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', p: 1, backgroundColor: 'rgba(141, 138, 138, 0.2)' }}>
                  <Typography variant="h6" sx={{ mb: 1, color: '#fff' }}>Bucle Volumen vs Presión</Typography>
                  {dataSource === 'simulated' ? (
                    <Box display="flex" justifyContent="center" alignItems="center" height="100%" flexDirection="column" gap={1}>
                      <PersonIcon sx={{ fontSize: 40, color: 'text.secondary' }}/>
                      <Typography sx={{color: 'text.secondary' }}>Los bucles cerrados requieren datos en tiempo real.</Typography>
                    </Box>
                  ) : (
                    <LoopChart type="volume-pressure" data={displayData} isConnected={serialConnection.isConnected} />
                  )}
                </Paper>
                <Paper elevation={0} sx={{ width: 700, height: 230, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', p: 1, backgroundColor: 'rgba(141, 138, 138, 0.2)' }}>
                  <Typography variant="h6" sx={{ mb: 1, color: '#fff' }}>Bucle Flujo vs Volumen</Typography>
                  {dataSource === 'simulated' ? (
                    <Box display="flex" justifyContent="center" alignItems="center" height="100%" flexDirection="column" gap={1}>
                      <PersonIcon sx={{ fontSize: 40, color: 'text.secondary' }}/>
                      <Typography sx={{color: 'text.secondary' }}>Los bucles cerrados requieren datos en tiempo real.</Typography>
                    </Box>
                  ) : (
                    <LoopChart type="flow-volume" data={displayData} isConnected={serialConnection.isConnected} />
                  )}
                </Paper>
              </Box>
            </Grid>
          </Grid>
        </Container>
      </Box>

      {/* Panel derecho: sliders e inputs */}
      <Box display="flex" flexDirection="column" alignItems="center" ml={ventilationMode === 'pressure' ? -3 : -14} mt={18}>
        <Box display="flex" flexDirection="row" justifyContent="space-between" alignItems="center" width={300} mb={-1} sx={{ marginLeft: ventilationMode === 'pressure' ? -7 : -18 }}>
          <Typography variant="subtitle1" sx={{ fontSize: '24px', fontWeight: 200, textAlign: 'center' }}>Insp</Typography>
          <Typography variant="subtitle1" sx={{ fontSize: '24px', fontWeight: 200, textAlign: 'center' }}>Esp</Typography>
        </Box>
        <Slider value={ventilatorData.inspiracionEspiracion} min={0} max={1} step={0.01} sx={{ width: 300, mb: 3, marginLeft: ventilationMode === 'pressure' ? -9 : -18 }} onChange={(_, value) => handleParameterChange('inspiracionEspiracion', value)} />
        <Box display="flex" flexDirection="column" gap={2} mb={3} sx={{ width: 300, marginLeft: ventilationMode === 'pressure' ? -9 : -18 }}>
          <Typography variant="subtitle1" sx={{ fontSize: '24px', fontWeight: 200, textAlign: 'center' }}>Relación I:E</Typography>
          <Box display="flex" flexDirection="row" justifyContent="center" gap={2}>
            <TextField type="number" variant="outlined" size="small" sx={{ width: 140, '& .MuiInputBase-input': { backgroundColor: 'rgba(76, 175, 80, 0.08)', color: '#4caf50', fontWeight: 'bold' } }} value={ventilatorData.relacionIE1 || 1} InputProps={{ readOnly: true }} helperText="Inspiración" />
            <TextField type="number" variant="outlined" size="small" sx={{ width: 140, '& .MuiInputBase-input': { backgroundColor: 'rgba(76, 175, 80, 0.08)', color: '#4caf50', fontWeight: 'bold' } }} value={ventilatorData.relacionIE2 || 1} InputProps={{ readOnly: true }} helperText="Espiración" />
          </Box>
          <Box display="flex" justifyContent="center" mt={1}>
            <Typography variant="caption" sx={{ fontSize: '11px', color: '#4caf50', backgroundColor: 'rgba(76, 175, 80, 0.1)', px: 1, py: 0.5, borderRadius: 1, textAlign: 'center' }}>
              Ti: {ventilatorData.tiempoInspiratorio?.toFixed(2) || '0.00'}s | Te: {ventilatorData.tiempoEspiratorio?.toFixed(2) || '0.00'}s
            </Typography>
          </Box>
          <Typography variant="subtitle1" sx={{ fontSize: '24px', fontWeight: 200, textAlign: 'center' }}>Pausa Inspiratoria</Typography>
          <TextField type="number" variant="outlined" size="small" value={ventilatorData.pausaInspiratoria} onChange={e => handleParameterChange('pausaInspiratoria', Number(e.target.value))} />
          <Typography variant="subtitle1" sx={{ fontSize: '24px', fontWeight: 200, textAlign: 'center' }}>Pausa Espiratoria</Typography>
          <TextField type="number" variant="outlined" size="small" value={ventilatorData.pausaEspiratoria} onChange={e => handleParameterChange('pausaEspiratoria', Number(e.target.value))} />
        </Box>
        <Box display="flex" flexDirection="row" alignItems="center" width={300} mb={1} sx={{ marginLeft: ventilationMode === 'pressure' ? -9 : -18 }}>
          <Typography variant="subtitle1" sx={{ fontSize: '24px', fontWeight: 200, flex: 1, textAlign: 'left' }}>Frecuencia</Typography>
          <ValidatedInput
            parameter="frecuencia"
            value={ventilatorData.frecuencia}
            onChange={handleParameterChange}
            label="Frecuencia"
            unit="resp/min"
            validation={parameterValidation.validateSingleParameter('frecuencia', ventilatorData.frecuencia, ventilatorData, ventilationMode)}
            ranges={parameterValidation.getParameterRanges('frecuencia')}
            sx={{ width: 80, ml: 2 }}
            inputProps={{ min: 5, max: 60 }}
          />
        </Box>
        <Slider value={ventilatorData.frecuencia} min={0} max={24} step={1} sx={{ width: 300, marginLeft: ventilationMode === 'pressure' ? -9 : -18 }} onChange={(_, value) => handleParameterChange('frecuencia', value)} />
        <Box sx={{ width: 300, marginLeft: ventilationMode === 'pressure' ? -9 : -18, mt: 2 }}>
          {complianceData && errorDetection && (
            <ComplianceStatus
              complianceData={complianceData}
              errorDetection={errorDetection}
              autoAdjustmentEnabled={autoAdjustmentEnabled}
              lastAutoAdjustment={lastAutoAdjustment}
              ventilationMode={ventilationMode}
            />
          )}
        </Box>
        <Box sx={{ width: 300, marginLeft: ventilationMode === 'pressure' ? -9 : -18, mt: 2 }}>
          {parameterValidation && parameterValidation.validationState && (
            <ValidationAlerts
              validationState={parameterValidation.validationState}
              onClose={() => setShowValidationAlerts(false)}
              show={showValidationAlerts}
              compact={false}
            />
          )}
          <Box display="flex" justifyContent="center" mt={1}>
            <Button variant="outlined" size="small" onClick={() => setShowValidationAlerts(!showValidationAlerts)} startIcon={showValidationAlerts ? <VisibilityOffIcon /> : <VisibilityIcon />} sx={{ color: 'text.secondary', borderColor: 'rgba(255, 255, 255, 0.2)', '&:hover': { borderColor: 'primary.main', backgroundColor: 'rgba(255, 255, 255, 0.1)' } }}>
              {showValidationAlerts ? 'Ocultar Alertas' : 'Ver Alertas Detalladas'}
            </Button>
          </Box>
        </Box>
      </Box>
    </Box>
  );
};

export default MonitoringTab;
