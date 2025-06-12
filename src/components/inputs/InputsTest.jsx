import React, { useState } from 'react';
import { NumericInput, NumericInputMUI } from './index';
import './InputsTest.css';

function InputsTest() {
  const [values, setValues] = useState({
    basic: '',
    withUnit: '50',
    withError: 'abc',
    disabled: '100',
    muiBasic: '25',
    muiWithError: '999'
  });

  const handleChange = (field) => (e) => {
    setValues(prev => ({
      ...prev,
      [field]: e.target.value
    }));
  };

  return (
    <div className="inputs-test">
      <div className="inputs-test__header">
        <h1>Test de Inputs Numéricos</h1>
        <p>Componentes basados en el diseño de Figma Rectangle 9</p>
      </div>

      <div className="test-section">
        <h2>NumericInput (CSS Puro)</h2>
        <div className="test-grid">
          <div className="test-item">
            <h3>Básico</h3>
            <NumericInput
              value={values.basic}
              onChange={handleChange('basic')}
              placeholder="Ingresa un número"
              label="Valor básico"
            />
          </div>

          <div className="test-item">
            <h3>Con unidad</h3>
            <NumericInput
              value={values.withUnit}
              onChange={handleChange('withUnit')}
              placeholder="50"
              label="Frecuencia respiratoria"
              unit="bpm"
              min={12}
              max={60}
            />
          </div>

          <div className="test-item">
            <h3>Con error</h3>
            <NumericInput
              value={values.withError}
              onChange={handleChange('withError')}
              placeholder="Solo números"
              label="Valor con error"
              error={true}
              helperText="Este campo contiene un error"
            />
          </div>

          <div className="test-item">
            <h3>Deshabilitado</h3>
            <NumericInput
              value={values.disabled}
              onChange={handleChange('disabled')}
              label="Campo deshabilitado"
              disabled={true}
              helperText="Este campo está deshabilitado"
            />
          </div>

          <div className="test-item">
            <h3>Variante pequeña</h3>
            <NumericInput
              value="25"
              onChange={() => {}}
              placeholder="Pequeño"
              label="Input pequeño"
              className="numeric-input--small"
            />
          </div>

          <div className="test-item">
            <h3>Variante fluida</h3>
            <NumericInput
              value="150"
              onChange={() => {}}
              placeholder="Fluido"
              label="Input fluido"
              className="numeric-input--fluid"
            />
          </div>
        </div>
      </div>

      <div className="test-section">
        <h2>NumericInputMUI (Material-UI)</h2>
        <div className="test-grid">
          <div className="test-item">
            <h3>Básico MUI</h3>
            <NumericInputMUI
              value={values.muiBasic}
              onChange={handleChange('muiBasic')}
              placeholder="Número MUI"
              label="Valor MUI"
            />
          </div>

          <div className="test-item">
            <h3>Con error MUI</h3>
            <NumericInputMUI
              value={values.muiWithError}
              onChange={handleChange('muiWithError')}
              placeholder="Máximo 100"
              label="Valor con límite"
              error={parseInt(values.muiWithError) > 100}
              helperText={parseInt(values.muiWithError) > 100 ? "El valor no puede ser mayor a 100" : "Valor dentro del rango"}
              min={0}
              max={100}
            />
          </div>

          <div className="test-item">
            <h3>MUI Deshabilitado</h3>
            <NumericInputMUI
              value="75"
              onChange={() => {}}
              label="Campo MUI deshabilitado"
              disabled={true}
              helperText="Campo deshabilitado con MUI"
            />
          </div>
        </div>
      </div>

      <div className="test-section">
        <h2>Casos de Uso Específicos</h2>
        <div className="test-grid">
          <div className="test-item">
            <h3>Presión (cmH₂O)</h3>
            <NumericInput
              value="15"
              onChange={() => {}}
              label="PEEP"
              unit="cmH₂O"
              min={5}
              max={25}
              step={1}
              helperText="Presión positiva al final de la espiración"
            />
          </div>

          <div className="test-item">
            <h3>Volumen (mL)</h3>
            <NumericInput
              value="500"
              onChange={() => {}}
              label="Volumen Tidal"
              unit="mL"
              min={300}
              max={800}
              step={10}
              helperText="Volumen de aire por respiración"
            />
          </div>

          <div className="test-item">
            <h3>Oxígeno (%)</h3>
            <NumericInput
              value="40"
              onChange={() => {}}
              label="FiO₂"
              unit="%"
              min={21}
              max={100}
              step={1}
              helperText="Fracción inspirada de oxígeno"
            />
          </div>
        </div>
      </div>

      <div className="values-display">
        <h3>Valores actuales:</h3>
        <pre>{JSON.stringify(values, null, 2)}</pre>
      </div>
    </div>
  );
}

export default InputsTest; 