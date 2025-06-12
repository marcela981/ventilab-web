import React from 'react';
import { ParameterCard } from '../../ui';
import './Sidebar.css';

function Sidebar({ 
  data = {}, 
  isCollapsed = false, 
  onToggle, 
  variant = "monitoring" 
}) {
  // Datos por defecto para el monitoreo
  const defaultData = {
    pressure: {
      peak: { value: 31, unit: 'cm H2O', label: 'Presión pico' },
      mean: { value: 25, unit: 'cm H2O', label: 'Presión media' },
      peep: { value: 21, unit: 'cm H2O', label: 'PEEP' }
    },
    flow: {
      max: { value: 45, unit: 'L/min', label: 'Flujo Max' },
      current: { value: 39.1, unit: 'L/min', label: 'Flujo' },
      min: { value: -40, unit: 'L/min', label: 'Flujo Min' }
    },
    volume: {
      max: { value: 500, unit: 'mL', label: 'Vol max' },
      current: { value: 480, unit: 'mL', label: 'Volumen' }
    }
  };

  const monitoringData = { ...defaultData, ...data };

  const renderMonitoringCards = () => {
    const cards = [];
    
    // Presión
    Object.entries(monitoringData.pressure).forEach(([key, item]) => {
      cards.push(
        <ParameterCard
          key={`pressure-${key}`}
          label={item.label}
          value={item.value}
          unit={item.unit}
          variant="monitoring"
          size="large"
          className="monitoring-card"
        />
      );
    });

    // Flujo
    Object.entries(monitoringData.flow).forEach(([key, item]) => {
      cards.push(
        <ParameterCard
          key={`flow-${key}`}
          label={item.label}
          value={item.value}
          unit={item.unit}
          variant="monitoring"
          size="large"
          className="monitoring-card"
        />
      );
    });

    // Volumen
    Object.entries(monitoringData.volume).forEach(([key, item]) => {
      cards.push(
        <ParameterCard
          key={`volume-${key}`}
          label={item.label}
          value={item.value}
          unit={item.unit}
          variant="monitoring"
          size="large"
          className="monitoring-card"
        />
      );
    });

    return cards;
  };

  const renderNavigationItems = () => {
    return (
      <div className="sidebar-navigation">
        <nav className="nav-menu">
          <a href="#configuracion" className="nav-item active">
            <span className="nav-icon">⚙️</span>
            <span className="nav-label">Configuración</span>
          </a>
          <a href="#monitoreo" className="nav-item">
            <span className="nav-icon">📊</span>
            <span className="nav-label">Monitoreo</span>
          </a>
          <a href="#graficas" className="nav-item">
            <span className="nav-icon">📈</span>
            <span className="nav-label">Gráficas</span>
          </a>
          <a href="#conexion" className="nav-item">
            <span className="nav-icon">🔗</span>
            <span className="nav-label">Conexión</span>
          </a>
        </nav>
      </div>
    );
  };

  return (
    <div className={`sidebar ${isCollapsed ? 'collapsed' : ''} sidebar-${variant}`}>
      <div className="sidebar-header">
        <h3 className="sidebar-title">
          {variant === 'monitoring' ? 'Monitoreo' : 'Navegación'}
        </h3>
        {onToggle && (
          <button 
            className="sidebar-toggle-btn"
            onClick={onToggle}
            aria-label="Toggle sidebar"
          >
            {isCollapsed ? '→' : '←'}
          </button>
        )}
      </div>

      <div className="sidebar-content">
        {variant === 'monitoring' ? (
          <div className="monitoring-grid">
            {renderMonitoringCards()}
          </div>
        ) : (
          renderNavigationItems()
        )}
      </div>

      {variant === 'monitoring' && (
        <div className="sidebar-footer">
          <div className="update-indicator">
            <span className="indicator-dot"></span>
            <span className="indicator-text">Tiempo real</span>
          </div>
        </div>
      )}
    </div>
  );
}

export default Sidebar; 