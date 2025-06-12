import React, { useState, useEffect } from 'react';
import './Slider.css';

const Slider = ({ 
  value = 50, 
  onChange = () => {}, 
  className = '',
  disabled = false,
  labels = { left: 'Insp', right: 'Esp' },
  min = 0,
  max = 100,
  step = 50
}) => {
  const [sliderValue, setSliderValue] = useState(value);

  // Sincronizar el valor interno cuando cambie el valor desde afuera
  useEffect(() => {
    setSliderValue(value);
  }, [value]);

  const handleSliderChange = (e) => {
    const newValue = parseInt(e.target.value);
    setSliderValue(newValue);
    onChange(newValue);
  };

  const getSliderPercentage = () => {
    // Convertir el valor actual a porcentaje para el display visual
    return ((sliderValue - min) / (max - min)) * 100;
  };

  return (
    <div className={`slider ${className} ${disabled ? 'slider--disabled' : ''}`}>
      {/* Labels Group */}
      <div className="slider__labels">
        <div className="slider__label slider__label--left">{labels.left}</div>
        <div className="slider__label slider__label--right">{labels.right}</div>
      </div>
      
      {/* Slider Container */}
      <div className="slider__container">
        {/* Active Track */}
        <div 
          className="slider__track slider__track--active"
          style={{ width: `${getSliderPercentage()}%` }}
        >
          <div className="slider__track-fill"></div>
        </div>
        
        {/* Handle */}
        <div 
          className="slider__handle"
          style={{ left: `calc(${getSliderPercentage()}% - 2px)` }}
        >
          <div className="slider__state-layer"></div>
        </div>
        
        {/* Inactive Track */}
        <div 
          className="slider__track slider__track--inactive"
          style={{ width: `${100 - getSliderPercentage()}%` }}
        >
          <div className="slider__track-fill"></div>
          <div className="slider__track-stop">
            <div className="slider__dot"></div>
          </div>
        </div>
        
        {/* Hidden Input Range */}
        <input
          type="range"
          min={min}
          max={max}
          step={step}
          value={sliderValue}
          onChange={handleSliderChange}
          className="slider__input"
          disabled={disabled}
        />
        
        {/* Stops (discrete points) */}
        <div className="slider__stops">
          <div className="slider__stop" data-value={min}></div>
          <div className="slider__stop" data-value={Math.floor((min + max) / 2)}></div>
          <div className="slider__stop" data-value={max}></div>
        </div>
      </div>
    </div>
  );
};

export default Slider; 