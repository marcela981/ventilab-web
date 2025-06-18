/**
 * Cálculos del ventilador mecánico migrados desde Python
 */

export class VentilatorCalculations {
  constructor() {
    this.compliance = 0.02051; // L/cmH2O - Compliance pulmonar por defecto
    this.autoC = 0;
    this.arrayPmax = [];
    this.arrayPmin = [];
    this.arrayV = [];
  }

  /**
   * Calcula el tiempo de ciclo total
   */
  calculateCycleTime(frequency) {
    return 60 / frequency; // segundos
  }

  /**
   * Calcula el tiempo espiratorio
   */
  calculateExpiratoryTime(frequency, inspiratoryTime, inspiratoryPause = 0) {
    const cycleTime = this.calculateCycleTime(frequency);
    return cycleTime - inspiratoryTime - inspiratoryPause;
  }

  /**
   * Calcula la relación I:E
   */
  calculateIERatio(inspiratoryTime, expiratoryTime) {
    const ieRatio = inspiratoryTime / expiratoryTime;
    
    if (ieRatio > 1) {
      // Relación I:E invertida
      return {
        ratio: `${ieRatio.toFixed(1)}:1`,
        decimal: ieRatio,
        inverted: true
      };
    } else {
      return {
        ratio: `1:${(1 / ieRatio).toFixed(1)}`,
        decimal: ieRatio,
        inverted: false
      };
    }
  }

  /**
   * Calcula tiempos basados en relación I:E (migrado desde Python)
   */
  calculateTimingFromIERatio(frequency, ieRatioSlider, expiratoryPause1 = 0, expiratoryPause2 = 0) {
    const cycleTime = this.calculateCycleTime(frequency) - expiratoryPause1 - expiratoryPause2;
    let inspiratoryTime = 0;
    let expiratoryTime = 0;
    let message = '';

    if (ieRatioSlider === 0) {
      message = "Relación 1:1 [s]";
      inspiratoryTime = cycleTime * 0.5;
    } else if (ieRatioSlider > 0) {
      message = `Relación 1:${1 + (ieRatioSlider / 10)} [s]`;
      inspiratoryTime = cycleTime * (1 / (2 + (ieRatioSlider / 10)));
    } else {
      message = `Relación ${1 + (ieRatioSlider / (-10))}:1 [s]`;
      inspiratoryTime = cycleTime * ((1 + (ieRatioSlider / (-10))) / (2 + (ieRatioSlider / (-10))));
    }

    expiratoryTime = cycleTime - inspiratoryTime;

    return {
      inspiratoryTime,
      expiratoryTime,
      message,
      cycleTime
    };
  }

  /**
   * Calcula flujo máximo para volumen control (migrado desde Python)
   */
  calculateMaxFlow(tidalVolume, inspiratoryTime) {
    // Multiplicamos por 60 para pasar segundos a minutos y dividimos en 1000 para pasar ml a L
    // El factor 0.98 es un factor de corrección
    return (60 * tidalVolume) / (1000 * inspiratoryTime) * 0.98;
  }

  /**
   * Calcula presión del tanque (migrado desde Python)
   */
  calculateTankPressure(maxFlow) {
    return (0.0025 * Math.pow(maxFlow, 2)) + (0.2203 * maxFlow) - 0.5912;
  }

  /**
   * Calcula volumen tidal para presión control (migrado desde Python)
   */
  calculateTidalVolumePressureControl(peakPressure, peep, inspiratoryTime) {
    const C = this.compliance; // Compliance pulmonar L/cmH2O
    const Vtil = 1000 * (C * (peakPressure - peep)); // ml
    const Qmax = (C * (peakPressure - peep)) / (inspiratoryTime / 60); // L/min
    
    return {
      tidalVolume: Vtil,
      maxFlow: Qmax,
      tankPressure: this.calculateTankPressure(Qmax)
    };
  }

  /**
   * Filtro de media móvil exponencial (migrado desde Python)
   */
  applyExponentialFilter(newValue, previousValue, alpha) {
    return (alpha * newValue) + ((1 - alpha) * previousValue);
  }

  /**
   * Actualiza compliance automática (migrado desde Python)
   */
  updateCompliance(peakPressure, measuredPressure, measuredVolume) {
    this.autoC += 1;
    this.arrayPmax.push(measuredPressure);
    this.arrayPmin.push(Math.min(...this.arrayPmax.slice(-100))); // PEEP aproximado
    this.arrayV.push(measuredVolume);

    // Cuando pasen 5 ciclos se empieza a recalcular la compliance
    if (this.autoC === 5) {
      const error = ((Math.abs(peakPressure - this.arrayPmax[this.autoC - 1])) / peakPressure) * 100;
      
      if (error > 5) {
        // Se eliminan los primeros dos términos ya que siempre son elevados
        const filteredPmax = this.arrayPmax.slice(2);
        const filteredPmin = this.arrayPmin.slice(2);
        const filteredV = this.arrayV.slice(2);
        
        // Se encuentra el promedio
        const promPmax = filteredPmax.reduce((a, b) => a + b, 0) / filteredPmax.length;
        const promPmin = filteredPmin.reduce((a, b) => a + b, 0) / filteredPmin.length;
        const promV = (filteredV.reduce((a, b) => a + b, 0) / filteredV.length) / 1000;

        // Nueva compliance
        this.compliance = promV / (promPmax - promPmin);
        
        return {
          newCompliance: this.compliance,
          averagePressure: promPmax,
          averagePEEP: promPmin,
          averageVolume: promV
        };
      }
    }

    return null;
  }

  /**
   * Valida que los parámetros sean físicamente posibles
   */
  validateParameters(frequency, inspiratoryTime, expiratoryTime, tidalVolume, peakPressure) {
    const errors = [];
    const warnings = [];

    // Validaciones básicas
    if (frequency < 5 || frequency > 60) {
      errors.push('Frecuencia debe estar entre 5 y 60 resp/min');
    }

    if (inspiratoryTime < 0.3) {
      errors.push('Tiempo inspiratorio muy corto (mínimo 0.3s)');
    }

    if (expiratoryTime < 0.3) {
      errors.push('Tiempo espiratorio muy corto (mínimo 0.3s)');
    }

    if (tidalVolume < 100 || tidalVolume > 2000) {
      errors.push('Volumen tidal debe estar entre 100 y 2000 ml');
    }

    if (peakPressure > 50) {
      warnings.push('Presión pico muy alta, riesgo de barotrauma');
    }

    const ieRatio = inspiratoryTime / expiratoryTime;
    if (ieRatio > 2) {
      warnings.push('Relación I:E muy alta, riesgo hemodinámico');
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings
    };
  }

  /**
   * Decodifica trama de sensores (migrado desde Python)
   */
  decodeSensorFrame(frame) {
    let pressure = '';
    let flow = '';
    let volume = '';
    let flag1 = 0;
    let flag2 = 0;
    let flag3 = 0;

    for (let i = 0; i < frame.length; i++) {
      const char = frame[i];
      if (char === 'P') {
        flag1 = 1;
      } else if (char === 'F') {
        flag1 = 0;
        flag2 = 1;
      } else if (char === 'V') {
        flag2 = 0;
        flag3 = 1;
      } else if (char === '?') {
        flag3 = 0;
      }

      if (flag1 === 1) {
        pressure += char;
      }
      if (flag2 === 1) {
        flow += char;
      }
      if (flag3 === 1) {
        volume += char;
      }
    }

    return {
      pressure: parseFloat(pressure.substring(1)),
      flow: parseFloat(flow.substring(1)),
      volume: parseFloat(volume.substring(1))
    };
  }
}

// Instancia global para usar en toda la aplicación
export const ventilatorCalculations = new VentilatorCalculations(); 