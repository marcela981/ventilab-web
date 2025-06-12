import React, { useState } from 'react';
import { FormField, ParameterCard, ValueDisplay, ModeSelector } from './index';
import './ComponentTest.css';

function ComponentTest() {
  // Estados para los componentes
  const [fio2, setFio2] = useState(100);
  const [volume, setVolume] = useState(500);
  const [peep, setPeep] = useState(1.0);
  const [qMax, setQMax] = useState(36.0);
  const [mode, setMode] = useState('volume');
  const [pressure, setPressure] = useState(31);
  const [flow, setFlow] = useState(39.1);

  // Opciones para el selector de modo
  const modeOptions = [
    { value: 'volume', label: 'Volumen Control' },
    { value: 'pressure', label: 'Presión Control' },
    { value: 'flow', label: 'Flujo Control' },
    { value: 'assist', label: 'Asistido', disabled: false }
  ];

  return (
    <div className="component-test">
      <div className="component-test__header">
        <h1>Componentes UI - Ventilador Mecánico</h1>
        <p>Página de testing para visualizar todos los componentes UI desarrollados</p>
      </div>

      {/* FormField Testing */}
      <section className="test-section">
        <h2>FormField - Campos de Entrada</h2>
        <div className="test-grid test-grid--form-fields">
          <FormField 
            label="FIO2" 
            value={fio2} 
            unit="%" 
            min={21} 
            max={100}
            step={1}
            onChange={setFio2}
          />
          <FormField 
            label="Volumen" 
            value={volume} 
            unit="mL" 
            min={100}
            max={1000}
            step={50}
            onChange={setVolume}
          />
          <FormField 
            label="Q Max" 
            value={qMax} 
            unit="L/min" 
            min={10}
            max={60}
            step={0.5}
            precision={1}
            onChange={setQMax}
          />
          <FormField 
            label="PEEP" 
            value={peep} 
            unit="cm H2O" 
            min={0}
            max={20}
            step={0.5}
            precision={1}
            onChange={setPeep}
          />
        </div>

        <h3>Estados Especiales</h3>
        <div className="test-grid test-grid--form-fields">
          <FormField 
            label="Deshabilitado" 
            value={500} 
            unit="mL" 
            min={100}
            max={1000}
            disabled={true}
            onChange={() => {}}
          />
          <FormField 
            label="Con Error" 
            value={-1} 
            unit="cm H2O" 
            min={0}
            max={20}
            error={true}
            helperText="Valor fuera de rango"
            onChange={() => {}}
          />
          <FormField 
            label="Entrada manual" 
            value={25} 
            unit="%" 
            min={0}
            max={100}
            helperText="Puedes escribir directamente"
            onChange={() => {}}
          />
        </div>
      </section>

      {/* ParameterCard Testing */}
      <section className="test-section">
        <h2>ParameterCard - Tarjetas de Parámetros</h2>
        <div className="test-grid test-grid--parameter-cards">
          <ParameterCard 
            title="Presión pico" 
            value={31} 
            unit="cm H2O" 
          />
          <ParameterCard 
            title="Presión media" 
            value={25} 
            unit="cm H2O" 
            variant="highlight" 
          />
          <ParameterCard 
            title="PEEP" 
            value={21} 
            unit="cm H2O" 
          />
          <ParameterCard 
            title="Flujo Max" 
            value={45} 
            unit="L/min" 
            variant="highlight" 
          />
          <ParameterCard 
            title="Flujo" 
            value={flow} 
            unit="L/min" 
          />
          <ParameterCard 
            title="Flujo Min" 
            value={-40} 
            unit="L/min" 
          />
          <ParameterCard 
            title="Vol max" 
            value={500} 
            unit="mL" 
          />
          <ParameterCard 
            title="Volumen" 
            value={480} 
            unit="mL" 
          />
        </div>

        <h3>Variantes y Estados</h3>
        <div className="test-grid test-grid--parameter-cards">
          <ParameterCard 
            title="Normal" 
            value={100} 
            unit="%" 
            variant="default" 
          />
          <ParameterCard 
            title="Destacado" 
            value={250} 
            unit="mL" 
            variant="highlight" 
          />
          <ParameterCard 
            title="Alerta" 
            value="ERROR" 
            unit="" 
            variant="warning" 
          />
          <ParameterCard 
            title="Sin datos" 
            value={null} 
            unit="cm H2O" 
          />
        </div>
      </section>

      {/* ValueDisplay Testing */}
      <section className="test-section">
        <h2>ValueDisplay - Visualización de Valores</h2>
        <div className="test-grid test-grid--value-displays">
          <ValueDisplay 
            value={pressure} 
            unit="cm H2O" 
            label="Presión" 
            showArrows={true}
            onIncrement={() => setPressure(p => Math.min(p + 1, 50))}
            onDecrement={() => setPressure(p => Math.max(p - 1, 0))}
            min={0}
            max={50}
          />
          <ValueDisplay 
            value={flow} 
            unit="L/min" 
            label="Flujo" 
            precision={1}
            color="success"
          />
          <ValueDisplay 
            value={42.5} 
            unit="°C" 
            label="Temperatura" 
            precision={1}
            color="warning"
          />
          <ValueDisplay 
            value={95} 
            unit="%" 
            label="SpO2" 
            color="success"
          />
        </div>

        <h3>Sin Flechas y Diferentes Colores</h3>
        <div className="test-grid test-grid--value-displays">
          <ValueDisplay 
            value={120} 
            unit="bpm" 
            label="Frecuencia" 
            color="primary"
          />
          <ValueDisplay 
            value={75} 
            unit="mmHg" 
            label="Presión arterial" 
            color="secondary"
          />
          <ValueDisplay 
            value={null} 
            unit="mL" 
            label="Sin datos" 
            color="warning"
          />
        </div>
      </section>

      {/* ModeSelector Testing */}
      <section className="test-section">
        <h2>ModeSelector - Selector de Modo</h2>
        <div className="test-grid test-grid--mode-selectors">
          <div className="mode-selector-container">
            <h3>Selector Principal</h3>
            <ModeSelector 
              mode={mode}
              onChange={setMode}
              options={modeOptions}
            />
          </div>

          <div className="mode-selector-container">
            <h3>Selector Simple</h3>
            <ModeSelector 
              mode="pressure"
              onChange={() => {}}
              options={[
                { value: 'pressure', label: 'Presión' },
                { value: 'volume', label: 'Volumen' }
              ]}
            />
          </div>

          <div className="mode-selector-container">
            <h3>Selector Deshabilitado</h3>
            <ModeSelector 
              mode="flow"
              onChange={() => {}}
              disabled={true}
            />
          </div>
        </div>
      </section>

      {/* Información del Estado Actual */}
      <section className="test-section">
        <h2>Estado Actual de los Componentes</h2>
        <div className="current-state">
          <div className="state-item">
            <strong>FIO2:</strong> {fio2}%
          </div>
          <div className="state-item">
            <strong>Volumen:</strong> {volume} mL
          </div>
          <div className="state-item">
            <strong>Q Max:</strong> {qMax} L/min
          </div>
          <div className="state-item">
            <strong>PEEP:</strong> {peep} cm H2O
          </div>
          <div className="state-item">
            <strong>Modo:</strong> {modeOptions.find(opt => opt.value === mode)?.label}
          </div>
          <div className="state-item">
            <strong>Presión:</strong> {pressure} cm H2O
          </div>
          <div className="state-item">
            <strong>Flujo:</strong> {flow} L/min
          </div>
        </div>
      </section>
    </div>
  );
}

export default ComponentTest;