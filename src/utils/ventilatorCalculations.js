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

  calculateMaxFlow(tidalVolume, inspiratoryTime) {
    // Multiplicamos por 60 para pasar segundos a minutos y dividimos en 1000 para pasar ml a L
    // El factor 0.98 es un factor de corrección
    return (60 * tidalVolume) / (1000 * inspiratoryTime) * 0.98;
  }

  calculateTankPressure(maxFlow) {
    return (0.0025 * Math.pow(maxFlow, 2)) + (0.2203 * maxFlow) - 0.5912;
  }

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

  applyExponentialFilter(newValue, previousValue, alpha) {
    return (alpha * newValue) + ((1 - alpha) * previousValue);
  }

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
   * Valida que los parámetros sean físicamente posibles y seguros
   */
  validateParameters(frequency, inspiratoryTime, expiratoryTime, tidalVolume, peakPressure, peep, fio2, ieRatioSlider) {
    const errors = [];
    const warnings = [];
    const criticalErrors = [];

    // === VALIDACIONES CRÍTICAS (impiden el envío) ===
    
    // Frecuencia respiratoria
    if (frequency < 5 || frequency > 60) {
      criticalErrors.push('Frecuencia debe estar entre 5 y 60 resp/min');
    }

    // FIO2
    if (fio2 < 21 || fio2 > 100) {
      criticalErrors.push('FIO2 debe estar entre 21% y 100%');
    }

    // PEEP
    if (peep < 0 || peep > 20) {
      criticalErrors.push('PEEP debe estar entre 0 y 20 cmH2O');
    }

    // Presión pico
    if (peakPressure < 5 || peakPressure > 60) {
      criticalErrors.push('Presión pico debe estar entre 5 y 60 cmH2O');
    }

    // Volumen tidal
    if (tidalVolume < 50 || tidalVolume > 2000) {
      criticalErrors.push('Volumen tidal debe estar entre 50 y 2000 ml');
    }

    // Tiempos inspiratorio y espiratorio
    if (inspiratoryTime < 0.2 || inspiratoryTime > 3.0) {
      criticalErrors.push('Tiempo inspiratorio debe estar entre 0.2 y 3.0 segundos');
    }

    if (expiratoryTime < 0.2 || expiratoryTime > 10.0) {
      criticalErrors.push('Tiempo espiratorio debe estar entre 0.2 y 10.0 segundos');
    }

    // === VALIDACIONES DE ADVERTENCIA (permiten envío pero muestran alerta) ===

    // Presión pico alta
    if (peakPressure > 35) {
      warnings.push('Presión pico alta (>35 cmH2O) - riesgo de barotrauma');
    }

    // Presión pico muy alta
    if (peakPressure > 50) {
      warnings.push('Presión pico muy alta (>50 cmH2O) - riesgo crítico de barotrauma');
    }

    // PEEP alto
    if (peep > 15) {
      warnings.push('PEEP alto (>15 cmH2O) - puede afectar retorno venoso');
    }

    // Volumen tidal alto
    if (tidalVolume > 1000) {
      warnings.push('Volumen tidal alto (>1000 ml) - riesgo de volutrauma');
    }

    // Volumen tidal bajo
    if (tidalVolume < 200) {
      warnings.push('Volumen tidal bajo (<200 ml) - puede causar atelectasia');
    }

    // Frecuencia alta
    if (frequency > 35) {
      warnings.push('Frecuencia alta (>35 resp/min) - puede causar auto-PEEP');
    }

    // Frecuencia baja
    if (frequency < 8) {
      warnings.push('Frecuencia baja (<8 resp/min) - puede causar hipoventilación');
    }

    // Relación I:E
    const ieRatio = inspiratoryTime / expiratoryTime;
    if (ieRatio > 1.5) {
      warnings.push('Relación I:E alta (>1.5:1) - riesgo hemodinámico');
    }

    if (ieRatio > 2.0) {
      warnings.push('Relación I:E muy alta (>2:1) - riesgo crítico hemodinámico');
    }

    // FIO2 alto
    if (fio2 > 80) {
      warnings.push('FIO2 alto (>80%) - riesgo de toxicidad por oxígeno');
    }

    // FIO2 muy alto
    if (fio2 > 95) {
      warnings.push('FIO2 muy alto (>95%) - riesgo crítico de toxicidad');
    }

    // === VALIDACIONES DE CONSISTENCIA ===

    // Presión pico debe ser mayor que PEEP
    if (peakPressure <= peep) {
      criticalErrors.push('Presión pico debe ser mayor que PEEP');
    }

    // Tiempo total del ciclo debe ser razonable
    const totalCycleTime = inspiratoryTime + expiratoryTime;
    const expectedCycleTime = 60 / frequency;
    const timeError = Math.abs(totalCycleTime - expectedCycleTime);
    
    if (timeError > 0.5) {
      warnings.push(`Tiempo de ciclo inconsistente (esperado: ${expectedCycleTime.toFixed(1)}s, actual: ${totalCycleTime.toFixed(1)}s)`);
    }

    // === RANGOS DE SEGURIDAD POR TIPO DE PACIENTE ===
    const patientType = this.getPatientType(tidalVolume, frequency);
    
    if (patientType === 'pediatric') {
      if (tidalVolume > 500) {
        warnings.push('Volumen tidal alto para paciente pediátrico');
      }
      if (peakPressure > 30) {
        warnings.push('Presión pico alta para paciente pediátrico');
      }
    } else if (patientType === 'adult') {
      if (tidalVolume < 300) {
        warnings.push('Volumen tidal bajo para paciente adulto');
      }
    }

    return {
      valid: criticalErrors.length === 0,
      criticalErrors,
      warnings,
      errors: [...criticalErrors, ...warnings],
      patientType,
      severity: criticalErrors.length > 0 ? 'critical' : warnings.length > 0 ? 'warning' : 'safe'
    };
  }

  /**
   * Determina el tipo de paciente basado en los parámetros
   */
  getPatientType(tidalVolume, frequency) {
    if (tidalVolume < 200 && frequency > 20) {
      return 'pediatric';
    } else if (tidalVolume > 400 && frequency < 20) {
      return 'adult';
    } else {
      return 'general';
    }
  }

  /**
   * Valida parámetros específicos para modo volumen control
   */
  validateVolumeControlParameters(frequency, tidalVolume, inspiratoryTime, peep, fio2) {
    const validation = this.validateParameters(frequency, inspiratoryTime, 0, tidalVolume, 0, peep, fio2);
    
    // Validaciones específicas para volumen control
    if (tidalVolume < 100) {
      validation.criticalErrors.push('Volumen tidal muy bajo para modo volumen control');
    }
    
    if (inspiratoryTime < 0.3) {
      validation.criticalErrors.push('Tiempo inspiratorio muy corto para modo volumen control');
    }

    return validation;
  }

  /**
   * Valida parámetros específicos para modo presión control
   */
  validatePressureControlParameters(frequency, peakPressure, peep, inspiratoryTime, fio2) {
    const validation = this.validateParameters(frequency, inspiratoryTime, 0, 0, peakPressure, peep, fio2);
    
    // Validaciones específicas para presión control
    if (peakPressure - peep < 5) {
      validation.warnings.push('Diferencia PIP-PEEP baja (<5 cmH2O) - puede resultar en bajo volumen tidal');
    }
    
    if (peakPressure - peep > 40) {
      validation.warnings.push('Diferencia PIP-PEEP alta (>40 cmH2O) - riesgo de volutrauma');
    }

    return validation;
  }

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