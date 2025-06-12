import React, { useState } from 'react';
import { MainLayout } from '../../components/layout';
import { Slider, MetricCard } from '../../components/ui';
import './VentilatorConfigurator.css';

function VentilatorConfigurator() {
  // Estado para parámetros del ventilador
  const [parameters, setParameters] = useState({
    fio2: 100,
    volume: 500,
    qmax: 36.0,
    peep: 1.0,
    ratio_insp: 0.80,
    ratio_exp: 2.40,
    pausa_insp: 1.0,
    pausa_exp: 1.0,
    frequency: 12
  });

  // Estado para el slider Insp/Esp
  const [inspEspValue, setInspEspValue] = useState(50);
  
  // Estado para el slider de Frecuencia
  const [frequencySliderValue, setFrequencySliderValue] = useState(parameters.frequency); // Usar directamente el valor de frecuencia

  // Estado para las métricas del ventilador
  const [metrics] = useState([
    { value: '31', unit: 'cm H2O', label: 'Presión pico' },
    { value: '25', unit: 'cm H2O', label: 'Presión media' },
    { value: '21', unit: 'cm H2O', label: 'PEEP' },
    { value: '45', unit: 'L/min', label: 'Flujo Max' },
    { value: '39.1', unit: 'L/min', label: 'Flujo' },
    { value: '-40', unit: 'L/min', label: 'Flujo Min' },
    { value: '500', unit: 'mL', label: 'Vol max' },
    { value: '480', unit: 'mL', label: 'Volumen' }
  ]);

  const handleParameterChange = (name, value) => {
    setParameters(prev => ({
      ...prev,
      [name]: value
    }));
    
    // Sincronizar el slider de frecuencia cuando se cambie desde los botones
    if (name === 'frequency') {
      setFrequencySliderValue(value);
    }
  };

  const handleSliderChange = (value) => {
    setInspEspValue(value);
    // Aquí puedes agregar lógica adicional para manejar el cambio del slider
    console.log('Slider Insp/Esp value:', value);
  };

  const handleFrequencySliderChange = (value) => {
    setFrequencySliderValue(value);
    // Usar directamente el valor del slider sin conversión
    handleParameterChange('frequency', value);
    console.log('Frequency slider value:', value);
  };

  // Componente para input individual con diseño de Figma
  const ParameterInput = ({ label, value, onChange, unit, min, max, step }) => {
    const handleIncrement = () => {
      const newValue = Math.min(value + step, max);
      onChange(newValue);
    };

    const handleDecrement = () => {
      const newValue = Math.max(value - step, min);
      onChange(newValue);
    };

    return (
      <div className="parameter-input-figma">
        <div className="parameter-input-figma__label">
          {label}
        </div>
        <div className="parameter-input-figma__container">
          <div className="parameter-input-figma__value">
            {value}
          </div>
          <div className="parameter-input-figma__arrows">
            <button
              type="button"
              className="parameter-input-figma__arrow parameter-input-figma__arrow--up"
              onClick={handleIncrement}
              disabled={value >= max}
            >
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                <path d="M7 14L12 9L17 14" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </button>
            <button
              type="button"
              className="parameter-input-figma__arrow parameter-input-figma__arrow--down"
              onClick={handleDecrement}
              disabled={value <= min}
            >
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                <path d="M7 10L12 15L17 10" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </button>
          </div>
        </div>
      </div>
    );
  };

  // Header con logos - Group 59
  const renderHeader = () => {
    return (
      <div className="header-logos">
        {/* Logo Universidad del Valle */}
        <div className="logo-univalle">
          <img src="/images/logo-univalle.png" alt="Universidad del Valle" />
        </div>
        {/* Logo VentyLab */}
        <div className="logo-venty">
          <img src="/images/logo.png" alt="VentyLab" />
        </div>
      </div>
    );
  };

  // Renderizar los 4 parámetros principales - Group 60
  const renderTopParameters = () => {
    return (
      <div className="top-parameters-figma">
        <ParameterInput
          label="% FIO2"
          value={parameters.fio2}
          onChange={(value) => handleParameterChange('fio2', value)}
          unit="%"
          min={21}
          max={100}
          step={1}
        />
        
        <ParameterInput
          label="Volumen"
          value={parameters.volume}
          onChange={(value) => handleParameterChange('volume', value)}
          unit="mL"
          min={200}
          max={800}
          step={10}
        />
        
        <ParameterInput
          label="Q Max"
          value={parameters.qmax}
          onChange={(value) => handleParameterChange('qmax', value)}
          unit="L/min"
          min={10}
          max={60}
          step={0.1}
        />
        
        <ParameterInput
          label="PEEP"
          value={parameters.peep}
          onChange={(value) => handleParameterChange('peep', value)}
          unit="cmH₂O"
          min={0}
          max={20}
          step={0.1}
        />
      </div>
    );
  };

  // Renderizar las tarjetas de métricas - Group 63
  const renderMetricCards = () => {
    return (
      <div className="metrics-cards-container">
        {metrics.map((metric, index) => (
          <MetricCard
            key={index}
            value={metric.value}
            unit={metric.unit}
            label={metric.label}
            className="metric-card--no-debug"
          />
        ))}
      </div>
    );
  };

  return (
    <MainLayout
        showControls={false}
        showSidebar={false}
      >
        <div className="configurator-content">
          {/* Header con logos y parámetros en la parte superior */}
          <div className="top-section">
            {renderHeader()}
            {renderTopParameters()}
            {renderMetricCards()}
          </div>
          
          {/* Slider Insp/Esp en la posición especificada */}
          <div className="slider-container">
            <Slider 
              value={inspEspValue}
              onChange={handleSliderChange}
            />
          </div>
          
          {/* Inputs debajo del slider */}
          <div className="bottom-inputs-container">
            <div className="inputs-section">
              {/* Relación I:E */}
              <div className="ie-ratio-section">
                <div className="ie-ratio-title">Relación I:E</div>
                <div className="ie-ratio-inputs">
                  {/* Input Inspiratorio */}
                  <div className="ie-ratio-input">
                    <div className="ie-ratio-input__container">
                      <div className="ie-ratio-input__value">
                        {parameters.ratio_insp.toFixed(2)}
                      </div>
                      <div className="ie-ratio-input__arrows">
                        <button
                          type="button"
                          className="ie-ratio-input__arrow"
                          onClick={() => handleParameterChange('ratio_insp', Math.min(parameters.ratio_insp + 0.1, 3.0))}
                          disabled={parameters.ratio_insp >= 3.0}
                        >
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="none">
                            <path d="M7 14L12 9L17 14" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                          </svg>
                        </button>
                        <button
                          type="button"
                          className="ie-ratio-input__arrow"
                          onClick={() => handleParameterChange('ratio_insp', Math.max(parameters.ratio_insp - 0.1, 0.5))}
                          disabled={parameters.ratio_insp <= 0.5}
                        >
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="none">
                            <path d="M7 10L12 15L17 10" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                          </svg>
                        </button>
                      </div>
                    </div>
                  </div>
                  
                  {/* Input Espiratorio */}
                  <div className="ie-ratio-input">
                    <div className="ie-ratio-input__container">
                      <div className="ie-ratio-input__value">
                        {parameters.ratio_exp.toFixed(2)}
                      </div>
                      <div className="ie-ratio-input__arrows">
                        <button
                          type="button"
                          className="ie-ratio-input__arrow"
                          onClick={() => handleParameterChange('ratio_exp', Math.min(parameters.ratio_exp + 0.1, 5.0))}
                          disabled={parameters.ratio_exp >= 5.0}
                        >
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="none">
                            <path d="M7 14L12 9L17 14" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                          </svg>
                        </button>
                        <button
                          type="button"
                          className="ie-ratio-input__arrow"
                          onClick={() => handleParameterChange('ratio_exp', Math.max(parameters.ratio_exp - 0.1, 1.0))}
                          disabled={parameters.ratio_exp <= 1.0}
                        >
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="none">
                            <path d="M7 10L12 15L17 10" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                          </svg>
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              
              {/* Pausa Inspiratoria */}
              <div className="pause-input-section pause-inspiratoria">
                <div className="pause-input-title">Pausa Inspiratoria</div>
                <div className="pause-input__container">
                  <div className="pause-input__value">
                    {parameters.pausa_insp.toFixed(1)}
                  </div>
                  <div className="pause-input__arrows">
                    <button
                      type="button"
                      className="pause-input__arrow"
                      onClick={() => handleParameterChange('pausa_insp', Math.min(parameters.pausa_insp + 0.1, 3.0))}
                      disabled={parameters.pausa_insp >= 3.0}
                    >
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                        <path d="M7 14L12 9L17 14" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                    </button>
                    <button
                      type="button"
                      className="pause-input__arrow"
                      onClick={() => handleParameterChange('pausa_insp', Math.max(parameters.pausa_insp - 0.1, 0.0))}
                      disabled={parameters.pausa_insp <= 0.0}
                    >
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                        <path d="M7 10L12 15L17 10" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                    </button>
                  </div>
                </div>
              </div>
              
              {/* Pausa Espiratoria */}
              <div className="pause-input-section pause-espiratoria">
                <div className="pause-input-title">Pausa Espiratoria</div>
                <div className="pause-input__container">
                  <div className="pause-input__value">
                    {parameters.pausa_exp.toFixed(1)}
                  </div>
                  <div className="pause-input__arrows">
                    <button
                      type="button"
                      className="pause-input__arrow"
                      onClick={() => handleParameterChange('pausa_exp', Math.min(parameters.pausa_exp + 0.1, 3.0))}
                      disabled={parameters.pausa_exp >= 3.0}
                    >
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                        <path d="M7 14L12 9L17 14" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                    </button>
                    <button
                      type="button"
                      className="pause-input__arrow"
                      onClick={() => handleParameterChange('pausa_exp', Math.max(parameters.pausa_exp - 0.1, 0.0))}
                      disabled={parameters.pausa_exp <= 0.0}
                    >
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                        <path d="M7 10L12 15L17 10" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
          
          {/* Slider de Frecuencia debajo de los inputs de pausa */}
          <div className="frequency-section">
            {/* Título y input en la misma línea */}
            <div className="frequency-title-input-row">
              <div className="frequency-title">Frecuencia</div>
              
              <div className="frequency-input-row">
                <div className="frequency-input">
                  <div className="frequency-input__container">
                    <div className="frequency-input__value">
                      {parameters.frequency}
                    </div>
                    <div className="frequency-input__arrows">
                      <button
                        type="button"
                        className="frequency-input__arrow"
                        onClick={() => handleParameterChange('frequency', Math.min(parameters.frequency + 1, 24))}
                        disabled={parameters.frequency >= 24}
                      >
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                          <path d="M7 14L12 9L17 14" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                        </svg>
                      </button>
                      <button
                        type="button"
                        className="frequency-input__arrow"
                        onClick={() => handleParameterChange('frequency', Math.max(parameters.frequency - 1, 0))}
                        disabled={parameters.frequency <= 0}
                      >
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                          <path d="M7 10L12 15L17 10" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                        </svg>
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            
            {/* Slider de frecuencia */}
            <div className="frequency-slider">
              <Slider 
                value={frequencySliderValue}
                onChange={handleFrequencySliderChange}
                labels={{ left: '0', right: '24' }}
                min={0}
                max={24}
                step={1}
              />
            </div>
          </div>
          
          {/* Gráficas sin contenedores de carta */}
          <div className="charts-container">
            <div className="chart-simple">
              <div className="chart-placeholder">
              </div>
            </div>
            
            <div className="chart-simple">
              <div className="chart-placeholder">
              </div>
            </div>
            
            <div className="chart-simple">
              <div className="chart-placeholder">
              </div>
            </div>
          </div>
        </div>
      </MainLayout>
  );
}

export default VentilatorConfigurator; 