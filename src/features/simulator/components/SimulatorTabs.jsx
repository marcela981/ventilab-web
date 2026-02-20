import React from 'react';
import {
  Box,
  Typography,
  BottomNavigation,
  BottomNavigationAction,
} from '@mui/material';

// Iconos para las pestañas de navegación
import PersonIcon from '@mui/icons-material/Person';
import MonitorHeartIcon from '@mui/icons-material/MonitorHeart';
import ShowChartIcon from '@mui/icons-material/ShowChart';
import WifiIcon from '@mui/icons-material/Wifi';

// Componentes de tabs
import PatientSimulatorTab from '@/shared/components/PatientSimulatorTab';
import GraphsTab from '@/shared/components/GraphsTab';
import MonitoringTab from '@/shared/components/MonitoringTab';
import ConnectionTabContent from '@/shared/components/ConnectionTabContent';

/**
 * SimulatorTabs.jsx (formerly DashboardTabs.jsx)
 *
 * Componente que maneja exclusivamente la navegación por tabs y el renderizado del contenido.
 * Incluye:
 * - BottomNavigation con 4 BottomNavigationAction
 * - Lógica de cambio de tab (activeTab state)
 * - Renderizado condicional de cada tab según el tab activo
 * - Cálculos de posicionamiento dinámico según el estado del sidebar
 */

const SimulatorTabs = ({
  // Estado de navegación
  activeTab,
  setActiveTab,

  // Cálculos de posicionamiento del sidebar
  navigationLeft,
  navigationWidth,

  // Props para MonitoringTab (Tab 1)
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

  // Props para ConnectionTabContent (Tab 3)
  systemStatus,
  handleConnection,
  handleDisconnection,
  maxMinData,
  dataRecording,
  setNotification,
}) => {

  // Función para renderizar el contenido según la pestaña activa
  const renderTabContent = () => {
    switch (activeTab) {
      case 0: // Simular Paciente
        return <PatientSimulatorTab />;

      case 1: // Monitoreo
        return (
          <MonitoringTab
            // datos de paciente / fuente
            patientData={patientData}
            isDataPersisted={isDataPersisted}
            dataSource={dataSource}
            setDataSource={setDataSource}

            // conexión y acciones
            serialConnection={serialConnection}
            handleSendConfiguration={handleSendConfiguration}
            handleStopVentilator={handleStopVentilator}

            // estado UI
            configSent={configSent}
            isAdjustMode={isAdjustMode}
            toggleAdjustMode={toggleAdjustMode}
            resetCardConfiguration={resetCardConfiguration}

            // tarjetas y drag
            cardData={cardData}
            draggedCard={draggedCard}
            handleDragStart={handleDragStart}
            handleDragOver={handleDragOver}
            handleDrop={handleDrop}
            handleDragEnd={handleDragEnd}
            toggleCardVisibility={toggleCardVisibility}
            complianceCardExpanded={complianceCardExpanded}
            setComplianceCardExpanded={setComplianceCardExpanded}

            // valores/funciones cálculo
            ventilationMode={ventilationMode}
            getValueColor={getValueColor}
            getTrend={getTrend}
            displayData={displayData}
            ventilatorData={ventilatorData}
            parameterValidation={parameterValidation}
            handleParameterChange={handleParameterChange}
            complianceData={complianceData}
            errorDetection={errorDetection}
            autoAdjustmentEnabled={autoAdjustmentEnabled}
            lastAutoAdjustment={lastAutoAdjustment}
            showValidationAlerts={showValidationAlerts}
            setShowValidationAlerts={setShowValidationAlerts}
            isAnalyzing={isAnalyzing}
            handleAIAnalysis={handleAIAnalysis}
          />
        );

      case 2: // Gráficas
        return <GraphsTab />;

      case 3: // Conexión
        return (
          <ConnectionTabContent
            serialConnection={serialConnection}
            systemStatus={systemStatus}
            handleConnection={handleConnection}
            handleDisconnection={handleDisconnection}
            handleSendConfiguration={handleSendConfiguration}
            getValueColor={getValueColor}
            ventilatorData={ventilatorData}
            maxMinData={maxMinData}
            dataRecording={dataRecording}
            setNotification={setNotification}
            patientData={patientData}
            ventilationMode={ventilationMode}
          />
        );

      default:
        return (
          <Box display="flex" justifyContent="center" alignItems="center" height="50vh" pb={6}>
            <Typography variant="h6">Pestaña no encontrada</Typography>
          </Box>
        );
    }
  };

  return (
    <>
      {/* Contenido del tab activo */}
      {renderTabContent()}

      {/* Barra de navegación fija en la parte inferior */}
      <BottomNavigation
        value={activeTab}
        onChange={(event, newValue) => setActiveTab(newValue)}
        sx={{
          position: 'fixed',
          bottom: 0,
          left: navigationLeft,
          right: 0,
          width: navigationWidth,
          backgroundColor: 'rgba(31, 31, 31, 0.95)',
          backdropFilter: 'blur(10px)',
          borderTop: '1px solid rgba(255, 255, 255, 0.1)',
          zIndex: 1100,
          transition: 'all 0.25s ease-in-out',
          '& .MuiBottomNavigationAction-root': {
            color: 'rgba(255, 255, 255, 0.6)',
            '&.Mui-selected': {
              color: '#de0b24',
            },
            '&:hover': {
              color: 'rgba(255, 255, 255, 0.8)',
            },
            minWidth: 80,
            fontSize: '12px'
          }
        }}
      >
        <BottomNavigationAction
          label="Simular Paciente"
          value={0}
          icon={<PersonIcon />}
        />
        <BottomNavigationAction
          label="Monitoreo"
          value={1}
          icon={<MonitorHeartIcon />}
        />
        <BottomNavigationAction
          label="Gráficas"
          value={2}
          icon={<ShowChartIcon />}
        />
        <BottomNavigationAction
          label="Conexión"
          value={3}
          icon={<WifiIcon />}
        />
      </BottomNavigation>
    </>
  );
};

export default SimulatorTabs;
