/*
 * Funcionalidad: MonitoringTab
 * Descripción: Tab de monitoreo del simulador. Compone las tres columnas
 *   (métricas, gráficas, controles) del dashboard de ventilación.
 * Versión: 1.1
 * Autor: Marcela Mazo Castro
 * Proyecto: VentyLab
 * Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria
 *        que integre un sistema de retroalimentación usando modelos de lenguaje
 * Institución: Universidad del Valle
 * Contacto: marcela.mazo@correounivalle.edu.co
 */

import React, { useState, useMemo } from 'react';
import { Box } from '@mui/material';

import { useVentilatorData } from '@/features/simulador/conexion/websocket/hooks/useVentilatorData';
import { useConexionVentiladorContext } from '@/features/simulador/conexion/contexto/ConexionVentiladorContext';
import { useRenderCount } from '@/shared/dev/perfInstrumentation';

import MetricColumn from './MetricColumn';
import ParameterInputRow from './ParameterInputRow';
import ChartsColumn from './ChartsColumn';
import ControlsColumn from './ControlsColumn';

// ===========================================================================
// Métricas medidas a partir del stream WebSocket (ventilador real / simulación
// del backend). Las tarjetas de valores medidos no pueden leerse del pipeline
// serial (vacío con el ventilador remoto); se derivan del buffer del store:
//   Pico  = máx de presión       Media = promedio de presión
//   PEEP  = mín de presión        (baseline al final de la espiración)
//   Flujo/Vol: máx, mín y actual (última muestra). Ventana = buffer (~300
//   muestras, ~5-10 s), estable para un monitor en vivo.
// ===========================================================================
function computeLiveStats(data) {
  if (!data || data.length === 0) return null;
  let pMax = -Infinity, pMin = Infinity, pSum = 0;
  let fMax = -Infinity, fMin = Infinity;
  let vMax = -Infinity;
  for (let i = 0; i < data.length; i++) {
    const { pressure, flow, volume } = data[i];
    if (pressure > pMax) pMax = pressure;
    if (pressure < pMin) pMin = pressure;
    pSum += pressure;
    if (flow > fMax) fMax = flow;
    if (flow < fMin) fMin = flow;
    if (volume > vMax) vMax = volume;
  }
  const last = data[data.length - 1];
  return {
    pPeak: pMax,
    pMean: pSum / data.length,
    pPeep: pMin,
    fMax,
    fMin,
    fNow: last.flow,
    vMax,
    vNow: last.volume,
  };
}

/**
 * Devuelve una copia de la tarjeta con el valor medido del stream, o la MISMA
 * tarjeta si no aplica (preserva identidad para el React.memo de MetricColumn).
 * `forceMeasured` = true cuando hay ventilador físico real: todas las tarjetas
 * de valor reflejan lo medido por el equipo, ignorando los setpoints del modo.
 */
function injectLiveCardValue(card, s, ventilationMode, forceMeasured) {
  const withValue = (n, isConfigured = false) =>
    Number.isFinite(n)
      ? { ...card, value: n.toFixed(1), rawValue: n, isConfigured }
      : card;

  switch (card.id) {
    case 'presionPico':
      // En modo presión el PIP configurado manda (salvo ventilador real).
      return !forceMeasured && ventilationMode === 'pressure' ? card : withValue(s.pPeak);
    case 'presionMedia':
      return withValue(s.pMean);
    case 'peep':
      return withValue(s.pPeep);
    case 'flujoMax':
      return !forceMeasured && card.isConfigured ? card : withValue(s.fMax);
    case 'flujo':
      return withValue(s.fNow);
    case 'flujoMin':
      return withValue(s.fMin);
    case 'volMax':
      return withValue(s.vMax);
    case 'volumen':
      // En modo volumen el VT configurado manda (salvo ventilador real).
      return !forceMeasured && ventilationMode === 'volume' ? card : withValue(s.vNow);
    default:
      return card;
  }
}

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
  handleModeChange,
}) => {
  useRenderCount('MonitoringTab');
  const [chartsEnabled, setChartsEnabled] = useState(false);
  const { data: streamData } = useVentilatorData();
  // ¿Conectada al ventilador físico por WebSocket/MQTT? (FSM de conexión).
  // Cuando es así, las curvas deben pintarse con los datos reales sin exigir el
  // toggle "Simular Gráficas" (ese opt-in es sólo para el modo simulado).
  const { estaConectado } = useConexionVentiladorContext();

  // Estadísticas medidas del stream WS (memoizadas por buffer): pico/media/PEEP,
  // máx/mín/actual de flujo y volumen.
  const liveStats = useMemo(() => computeLiveStats(streamData), [streamData]);

  // Inyectar los valores medidos en las tarjetas cuando hay datos en vivo.
  // IMPORTANTE: el gate debe coincidir EXACTAMENTE con el de ChartsColumn (cuándo
  // se pintan las curvas); de lo contrario las gráficas muestran señal pero las
  // tarjetas (Pico/Media/PEEP…) se quedan con los valores configurados por defecto.
  //   curvas activas = ventilador real (serial/FSM) con datos, o "Simular
  //   Gráficas" activo con datos. No depende de `dataSource`/`isSimulated`.
  // Con ventilador real (forceMeasured) TODAS las tarjetas de valor reflejan lo
  // medido por el equipo; con "Simular Gráficas" los setpoints configurados (PIP
  // en presión, VT en volumen) siguen mandando. Memoizado: sin inyección conserva
  // la identidad de `cardData` para que MetricColumn (React.memo) no se re-renderice.
  const displayCardData = useMemo(() => {
    const realVent = Boolean(serialConnection?.isConnected) || estaConectado;
    const injectLive = realVent || chartsEnabled;
    if (!injectLive || !liveStats) return cardData;
    return cardData.map((card) => injectLiveCardValue(card, liveStats, ventilationMode, realVent));
  }, [cardData, serialConnection?.isConnected, estaConectado, chartsEnabled, liveStats, ventilationMode]);

  return (
    <Box sx={{ px: { xs: 1, sm: 2 }, pt: 1, pb: 10 }}>
      <Box sx={{ display: 'flex', flexDirection: { xs: 'column', sm: 'row' }, alignItems: 'flex-start', gap: 1.5 }}>
        
        {/* ── Column 1: Logos + action buttons + metric cards ── */}
        <MetricColumn
          patientData={patientData}
          isDataPersisted={isDataPersisted}
          dataSource={dataSource}
          setDataSource={setDataSource}
          chartsEnabled={chartsEnabled}
          setChartsEnabled={setChartsEnabled}
          serialConnection={serialConnection}
          handleSendConfiguration={handleSendConfiguration}
          handleStopVentilator={handleStopVentilator}
          configSent={configSent}
          isAdjustMode={isAdjustMode}
          toggleAdjustMode={toggleAdjustMode}
          resetCardConfiguration={resetCardConfiguration}
          cardData={displayCardData}
          draggedCard={draggedCard}
          handleDragStart={handleDragStart}
          handleDragOver={handleDragOver}
          handleDrop={handleDrop}
          handleDragEnd={handleDragEnd}
          toggleCardVisibility={toggleCardVisibility}
          complianceCardExpanded={complianceCardExpanded}
          setComplianceCardExpanded={setComplianceCardExpanded}
          ventilationMode={ventilationMode}
          getValueColor={getValueColor}
          getTrend={getTrend}
        />

        {/* ── Column 2: Parameter inputs + charts ── */}
        <Box sx={{ flex: 1, minWidth: 0, overflow: 'visible' }}>
          {/* Parameter inputs row + ModeToggle en fila fija */}
          <ParameterInputRow
            ventilationMode={ventilationMode}
            ventilatorData={ventilatorData}
            parameterValidation={parameterValidation}
            handleParameterChange={handleParameterChange}
          />

          {/* Charts */}
          <ChartsColumn
            dataSource={dataSource}
            displayData={displayData}
            serialConnection={serialConnection}
            chartsEnabled={chartsEnabled}
            isRealVentilatorConnected={estaConectado}
          />
        </Box>

        {/* ── Column 3: sliders e inputs (panel derecho) ── */}
        <ControlsColumn
          ventilationMode={ventilationMode}
          ventilatorData={ventilatorData}
          handleParameterChange={handleParameterChange}
          parameterValidation={parameterValidation}
          complianceData={complianceData}
          errorDetection={errorDetection}
          autoAdjustmentEnabled={autoAdjustmentEnabled}
          lastAutoAdjustment={lastAutoAdjustment}
          showValidationAlerts={showValidationAlerts}
          setShowValidationAlerts={setShowValidationAlerts}
          handleModeChange={handleModeChange}
          isAnalyzing={isAnalyzing}
          handleAIAnalysis={handleAIAnalysis}
        />

      </Box>
    </Box>
  );
};

export default MonitoringTab;
