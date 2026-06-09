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
import { useRenderCount } from '@/shared/dev/perfInstrumentation';

import MetricColumn from './MetricColumn';
import ParameterInputRow from './ParameterInputRow';
import ChartsColumn from './ChartsColumn';
import ControlsColumn from './ControlsColumn';

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
  const { latest } = useVentilatorData();

  const isSimulated = dataSource === 'simulated';

  // Inyectar datos en tiempo real del WebSocket si la simulación de gráficas está
  // activa. Memoizado: cuando no hay inyección en vivo, conserva la identidad de
  // `cardData`, de modo que MetricColumn (React.memo) no se re-renderiza de más.
  const displayCardData = useMemo(() => {
    if (!(isSimulated && chartsEnabled && latest)) return cardData;

    return cardData.map((card) => {
      let newValue = card.value;
      let newRawValue = card.rawValue;

      switch (card.id) {
        case 'presionPico':
        case 'presionMedia':
          if (card.id === 'presionMedia' || ventilationMode !== 'pressure') {
            newValue = latest.pressure.toFixed(1);
            newRawValue = latest.pressure;
          }
          break;
        case 'flujoMax':
        case 'flujo':
        case 'flujoMin':
          if (card.id !== 'flujoMax' || !card.isConfigured) {
            newValue = latest.flow.toFixed(1);
            newRawValue = latest.flow;
          }
          break;
        case 'volMax':
        case 'volumen':
          if (card.id === 'volMax' || ventilationMode !== 'volume') {
            newValue = latest.volume.toFixed(1);
            newRawValue = latest.volume;
          }
          break;
        default:
          break;
      }

      return { ...card, value: newValue, rawValue: newRawValue };
    });
  }, [cardData, isSimulated, chartsEnabled, latest, ventilationMode]);

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
