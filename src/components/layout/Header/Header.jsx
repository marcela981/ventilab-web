import React from 'react';
import './Header.css';

function Header({ 
  title = "VentyLab", 
  subtitle = "Curso Teleoperado de Ventilación Mecánica",
  showBreadcrumb = false,
  actions = []
}) {
  return (
    <header className="app-header">
      <div className="header-container">
        <div className="header-logo">
          <img 
            src="/logo-univalle.png" 
            alt="Universidad del Valle" 
            className="logo-univalle"
          />
          <img 
            src="/logo-ventylab.png" 
            alt="VentyLab" 
            className="logo-ventylab"
          />
        </div>
        
        <div className="header-title">
          <h1>{title}</h1>
          {subtitle && <span className="header-subtitle">{subtitle}</span>}
        </div>
        
        <div className="header-actions">
          {actions.map((action, index) => (
            <button key={index} className="header-action" onClick={action.onClick}>
              {action.icon}
              {action.label}
            </button>
          ))}
        </div>
      </div>
      
      {showBreadcrumb && (
        <div className="header-breadcrumb">
          {/* Futura navegación breadcrumb */}
        </div>
      )}
    </header>
  );
}

export default Header; 