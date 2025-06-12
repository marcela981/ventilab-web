import React, { useState } from 'react';
import './MainLayout.css';

function MainLayout({ 
  sidebar, 
  children, 
  controls, 
  sidebarWidth = "330px",
  controlsWidth = "320px",
  showControls = true,
  showSidebar = true 
}) {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [controlsCollapsed, setControlsCollapsed] = useState(false);

  const toggleSidebar = () => {
    setSidebarCollapsed(!sidebarCollapsed);
  };

  const toggleControls = () => {
    setControlsCollapsed(!controlsCollapsed);
  };

  // Determinar si no hay sidebars activos
  const noSidebars = !showSidebar && !showControls;
  
  // Clases dinámicas para el layout
  const layoutClasses = [
    'main-layout',
    sidebarCollapsed ? 'sidebar-collapsed' : '',
    controlsCollapsed ? 'controls-collapsed' : '',
    noSidebars ? 'no-sidebars' : ''
  ].filter(Boolean).join(' ');

  return (
    <div 
      className={layoutClasses}
      style={{
        '--sidebar-width': sidebarWidth,
        '--controls-width': controlsWidth
      }}
    >
      {/* Sidebar */}
      {showSidebar && (
        <aside className={`main-sidebar ${sidebarCollapsed ? 'collapsed' : ''}`}>
          <button 
            className="sidebar-toggle"
            onClick={toggleSidebar}
            aria-label="Toggle sidebar"
          >
            <span className="toggle-icon">
              {sidebarCollapsed ? '→' : '←'}
            </span>
          </button>
          <div className="sidebar-content">
            {sidebar}
          </div>
        </aside>
      )}

      {/* Main Content */}
      <main className="main-content">
        <div className="content-wrapper">
          {children}
        </div>
      </main>

      {/* Controls Panel */}
      {showControls && controls && (
        <aside className={`main-controls ${controlsCollapsed ? 'collapsed' : ''}`}>
          <button 
            className="controls-toggle"
            onClick={toggleControls}
            aria-label="Toggle controls"
          >
            <span className="toggle-icon">
              {controlsCollapsed ? '←' : '→'}
            </span>
          </button>
          <div className="controls-content">
            {controls}
          </div>
        </aside>
      )}

      {/* Mobile Overlay */}
      {!sidebarCollapsed && showSidebar && (
        <div 
          className="mobile-overlay"
          onClick={toggleSidebar}
          aria-hidden="true"
        />
      )}
    </div>
  );
}

export default MainLayout; 