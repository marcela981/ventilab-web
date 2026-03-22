import React, { Suspense, useState } from 'react';
import {
  Box,
  Typography,
  BottomNavigation,
  BottomNavigationAction,
} from '@mui/material';
import PersonIcon from '@mui/icons-material/Person';
import MonitorHeartIcon from '@mui/icons-material/MonitorHeart';
import ShowChartIcon from '@mui/icons-material/ShowChart';
import WifiIcon from '@mui/icons-material/Wifi';

// Tab 2: Gráficas — fallback placeholder si no se inyecta chartsContent
import GraficasTab from '@/features/simulador/graficas/GraficasTab';

// Tab 0: Simular Paciente — lazy-loaded desde su propio submódulo
const FormularioPaciente = React.lazy(
  () => import('@/features/simulador/simuladorPaciente/FormularioPaciente'),
);

/**
 * SimuladorTabs — orquestador de navegación del simulador.
 *
 * Responsabilidades:
 *   - Gestionar el estado `activeTab` (no delega esto al padre).
 *   - Renderizar el componente correcto para cada tab.
 *   - Mostrar la barra de navegación fija en la parte inferior.
 *
 * Las tabs con estado complejo (Monitoreo y Conexión) reciben su contenido
 * listo para renderizar a través de `monitoringContent` y `connectionContent`.
 * Esto elimina el prop-drilling y evita dependencias circulares entre submódulos.
 *
 * @param navigationLeft   - Offset izquierdo dinámico según el sidebar.
 * @param navigationWidth  - Ancho dinámico según el sidebar.
 * @param monitoringContent - JSX ya construido para la tab Monitoreo (tab 1).
 * @param connectionContent - JSX ya construido para la tab Conexión (tab 3).
 * @param defaultTab       - Tab inicial (0 = Paciente). Opcional, default 1.
 * @param onTabChange      - Callback opcional para notificar al padre.
 */
const SimuladorTabs = ({
  navigationLeft,
  navigationWidth,
  monitoringContent,
  connectionContent,
  /** JSX pre-construido para la tab Gráficas (tab 2). Si no se pasa, usa el placeholder. */
  chartsContent,
  defaultTab = 1,
  onTabChange,
}) => {
  const [activeTab, setActiveTab] = useState(defaultTab);

  const handleTabChange = (_, newValue) => {
    setActiveTab(newValue);
    onTabChange?.(newValue);
  };

  const renderContent = () => {
    switch (activeTab) {
      case 0:
        return (
          <Box pb={6}>
            <Suspense
              fallback={
                <Box display="flex" justifyContent="center" alignItems="center" height="50vh">
                  <Typography variant="h6">Cargando Simulador de Paciente…</Typography>
                </Box>
              }
            >
              <FormularioPaciente onPatientConfigured={() => setActiveTab(1)} />
            </Suspense>
          </Box>
        );

      case 1:
        return monitoringContent ?? null;

      case 2:
        return chartsContent ?? <GraficasTab />;

      case 3:
        return connectionContent ?? null;

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
      {renderContent()}

      <BottomNavigation
        value={activeTab}
        onChange={handleTabChange}
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
            '&.Mui-selected': { color: '#de0b24' },
            '&:hover': { color: 'rgba(255, 255, 255, 0.8)' },
            minWidth: 80,
            fontSize: '12px',
          },
        }}
      >
        <BottomNavigationAction label="Simular Paciente" value={0} icon={<PersonIcon />} />
        <BottomNavigationAction label="Monitoreo"        value={1} icon={<MonitorHeartIcon />} />
        <BottomNavigationAction label="Gráficas"         value={2} icon={<ShowChartIcon />} />
        <BottomNavigationAction label="Conexión"         value={3} icon={<WifiIcon />} />
      </BottomNavigation>
    </>
  );
};

export default SimuladorTabs;
