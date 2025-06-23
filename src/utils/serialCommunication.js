export class SerialProtocol {
  // === ENVÍO DE TRAMAS ===
  
  /**
   * Crea trama de configuración según el modo y tipo de onda
   * @param {string} mode - 'Volumen control', 'Presion control', 'Flujo control'
   * @param {string} waveType - 'Escalon', 'Rampa Descendente'
   * @param {Object} parameters - Parámetros del ventilador
   */
  static createConfigFrame(mode, waveType = 'Escalon', parameters) {
    let trama = '';
    
    // Modo de operación
    if (mode === 'Volumen control' || mode === 'volume') {
      trama = 'V?';
    } else if (mode === 'Presion control' || mode === 'pressure') {
      trama = 'P?';
    } else if (mode === 'Flujo control' || mode === 'flow') {
      trama = 'F?';
    }

    // Tipo de onda
    if (waveType === 'Escalon') {
      trama += 'E?';
    } else if (waveType === 'Rampa Descendente') {
      trama += 'R?';
    }

    // Parámetros en el mismo orden que Python
    trama += `${parameters.fio2 || 21}?`;
    trama += `${parameters.volumen || 500}?`;
    trama += `${parameters.presionMax || 20}?`;
    trama += `${parameters.qMax || 60}?`;
    trama += `${parameters.peep || 5}?`;
    trama += `${parameters.frecuencia || 12}?`;
    trama += `${parameters.tiempoInspiratorio || 2.5}?`;
    trama += `${parameters.pausaInspiratoria || 0.1}?`;
    trama += `${parameters.tiempoEspiratorio || 2.5}?`;
    trama += `${parameters.pausaEspiratoria || 0.1}?`;
    trama += `${parameters.air || 0}?`;
    trama += `${parameters.o2 || 0}?`;
    trama += `${parameters.presionTanque || 0}`;

    return trama;
  }

  /**
   * Crea trama de inicio del sistema
   */
  static createStartFrame() {
    return 'a?E?0?0?0?0?0?0?0?0?0?0';
  }

  /**
   * Crea trama de parada del sistema
   */
  static createStopFrame() {
    return 'f?E?0?0?0?0?0?0?0?0?0?0';
  }

  /**
   * Crea trama de reset del sistema
   */
  static createResetFrame() {
    return 'r?E?0?0?0?0?0?0?0?0?0?0';
  }

  /**
   * Crea trama de desconexión
   */
  static createDisconnectFrame() {
    return 'b?E?0?0?0?0?0?0?0?0?0?0';
  }

  // === DECODIFICACIÓN DE TRAMAS ===

  /**
   * Decodifica cualquier tipo de trama recibida
   * @param {string} frame - Trama recibida desde el dispositivo
   * @returns {Object} - Objeto con el tipo y datos decodificados
   */
  static decodeFrame(frame) {
    if (!frame || frame.length === 0) {
      return { type: 'unknown', data: null, error: 'Trama vacía' };
    }

    const firstChar = frame[0];

    switch (firstChar) {
      case 'S':
        return this.decodeSensorFrame(frame);
      
      case 'L':
        return this.decodeStatusFrame(frame);
      
      case 'A':
        return this.decodeAckFrame(frame);
      
      case 'E':
        return this.decodeErrorFrame(frame);
      
      case 'C':
        return this.decodeConfigConfirmFrame(frame);
      
      case 'D':
        return this.decodeDebugFrame(frame);
      
      default:
        return {
          type: 'unknown',
          data: frame,
          error: `Tipo de trama desconocido: ${firstChar}`
        };
    }
  }

  /**
   * Decodifica trama de sensores (migrado desde Python)
   * Formato: S + P<valor>F<valor>V<valor>?
   */
  static decodeSensorFrame(frame) {
    try {
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
        type: 'sensor',
        data: {
          pressure: parseFloat(pressure.substring(1)) || 0,
          flow: parseFloat(flow.substring(1)) || 0,
          volume: parseFloat(volume.substring(1)) || 0,
          timestamp: Date.now()
        },
        error: null
      };
    } catch (error) {
      return {
        type: 'sensor',
        data: null,
        error: `Error decodificando trama de sensores: ${error.message}`
      };
    }
  }

  /**
   * Decodifica trama de estado del sistema
   * Formato: L + mensaje
   */
  static decodeStatusFrame(frame) {
    try {
      const message = frame.substring(1); // Remover 'L'
      return {
        type: 'status',
        data: {
          message: message,
          timestamp: Date.now()
        },
        error: null
      };
    } catch (error) {
      return {
        type: 'status',
        data: null,
        error: `Error decodificando trama de estado: ${error.message}`
      };
    }
  }

  /**
   * Decodifica trama de confirmación (ACK)
   * Formato: A + código
   */
  static decodeAckFrame(frame) {
    try {
      const code = frame.substring(1);
      return {
        type: 'ack',
        data: {
          code: code,
          message: this.getAckMessage(code),
          timestamp: Date.now()
        },
        error: null
      };
    } catch (error) {
      return {
        type: 'ack',
        data: null,
        error: `Error decodificando trama ACK: ${error.message}`
      };
    }
  }

  /**
   * Decodifica trama de error
   * Formato: E + código de error + descripción
   */
  static decodeErrorFrame(frame) {
    try {
      const errorData = frame.substring(1);
      const parts = errorData.split('?');
      const errorCode = parts[0] || 'UNKNOWN';
      const description = parts[1] || 'Error sin descripción';
      
      return {
        type: 'error',
        data: {
          code: errorCode,
          description: description,
          severity: this.getErrorSeverity(errorCode),
          timestamp: Date.now()
        },
        error: null
      };
    } catch (error) {
      return {
        type: 'error',
        data: null,
        error: `Error decodificando trama de error: ${error.message}`
      };
    }
  }

  /**
   * Decodifica trama de confirmación de configuración
   * Formato: C + OK/ERROR + detalles
   */
  static decodeConfigConfirmFrame(frame) {
    try {
      const configData = frame.substring(1);
      const isSuccess = configData.startsWith('OK');
      const details = configData.substring(2);
      
      return {
        type: 'config_confirm',
        data: {
          success: isSuccess,
          details: details,
          timestamp: Date.now()
        },
        error: null
      };
    } catch (error) {
      return {
        type: 'config_confirm',
        data: null,
        error: `Error decodificando confirmación de configuración: ${error.message}`
      };
    }
  }

  /**
   * Decodifica trama de debug
   * Formato: D + información de debug
   */
  static decodeDebugFrame(frame) {
    try {
      const debugInfo = frame.substring(1);
      return {
        type: 'debug',
        data: {
          info: debugInfo,
          timestamp: Date.now()
        },
        error: null
      };
    } catch (error) {
      return {
        type: 'debug',
        data: null,
        error: `Error decodificando trama de debug: ${error.message}`
      };
    }
  }

  // === MÉTODOS AUXILIARES ===

  /**
   * Obtiene mensaje descriptivo para códigos ACK
   */
  static getAckMessage(code) {
    const ackMessages = {
      '01': 'Configuración recibida correctamente',
      '02': 'Sistema iniciado',
      '03': 'Sistema detenido',
      '04': 'Sistema reiniciado',
      '05': 'Parámetros validados',
      '06': 'Modo cambiado exitosamente',
      '07': 'Calibración completada',
      '08': 'Conexión establecida',
      '09': 'Desconexión exitosa',
      '10': 'Comando ejecutado'
    };
    
    return ackMessages[code] || `Confirmación recibida: ${code}`;
  }

  /**
   * Determina la severidad de un error
   */
  static getErrorSeverity(errorCode) {
    const criticalErrors = ['E001', 'E002', 'E003', 'E010', 'E011'];
    const warningErrors = ['E004', 'E005', 'E006'];
    
    if (criticalErrors.includes(errorCode)) {
      return 'critical';
    } else if (warningErrors.includes(errorCode)) {
      return 'warning';
    } else {
      return 'info';
    }
  }

  /**
   * Valida formato de trama antes del envío
   */
  static validateFrame(frame) {
    if (!frame || typeof frame !== 'string') {
      return { valid: false, error: 'Trama debe ser una cadena no vacía' };
    }

    if (frame.length < 3) {
      return { valid: false, error: 'Trama demasiado corta' };
    }

    // Validar que tenga el formato esperado (comando + separadores)
    if (!frame.includes('?')) {
      return { valid: false, error: 'Trama debe contener separadores "?"' };
    }

    return { valid: true, error: null };
  }

  /**
   * Crea trama personalizada
   */
  static createCustomFrame(command, parameters = []) {
    let frame = command + '?';
    parameters.forEach(param => {
      frame += `${param}?`;
    });
    return frame.slice(0, -1); // Remover último '?'
  }
}

// === CLASE PARA MANEJO DE COLA DE MENSAJES ===

export class SerialMessageQueue {
  constructor() {
    this.queue = [];
    this.isProcessing = false;
    this.callbacks = {
      sensor: [],
      status: [],
      error: [],
      ack: [],
      config_confirm: [],
      debug: [],
      unknown: []
    };
  }

  /**
   * Registra callback para un tipo de mensaje
   */
  onMessage(type, callback) {
    if (this.callbacks[type]) {
      this.callbacks[type].push(callback);
    }
  }

  /**
   * Procesa una trama recibida
   */
  processFrame(frame) {
    const decoded = SerialProtocol.decodeFrame(frame);
    
    // Ejecutar callbacks registrados para este tipo
    if (this.callbacks[decoded.type]) {
      this.callbacks[decoded.type].forEach(callback => {
        try {
          callback(decoded);
        } catch (error) {
          console.error(`Error en callback ${decoded.type}:`, error);
        }
      });
    }

    return decoded;
  }

  /**
   * Limpia callbacks
   */
  clearCallbacks(type = null) {
    if (type) {
      this.callbacks[type] = [];
    } else {
      Object.keys(this.callbacks).forEach(key => {
        this.callbacks[key] = [];
      });
    }
  }
}
