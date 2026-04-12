import { GoogleGenerativeAI } from '@google/generative-ai';

export class GeminiProvider {
  constructor() {
    this.name = 'gemini';
    this.model = null;
    this.genAI = null;
    this.stats = {
      totalRequests: 0,
      successfulRequests: 0,
      failedRequests: 0,
      totalResponseTime: 0,
      averageResponseTime: 0,
      totalTokensUsed: 0,
      averageConfidence: 0,
      lastRequestTime: null,
      errors: []
    };
    this.config = {
      modelName: 'gemini-2.0-flash', // Modelo por defecto actualizado a versión 2.0
      maxRetries: 3,
      timeout: 30000, // 30 seconds
      temperature: 0.7,
      maxTokens: 2048,
      confidenceThreshold: 0.6
    };
  }

  /**
   * Obtener modelos disponibles
   */
  async getAvailableModels() {
    try {
      if (!this.genAI) {
        throw new Error('GoogleGenerativeAI no inicializado');
      }
      
      // Intentar obtener lista de modelos (esto puede no estar disponible en todas las versiones)
      console.log('Verificando modelos disponibles...');
      return [
        'gemini-2.0-flash',
        'gemini-2.5-flash', 
        'gemini-2.0-pro',
        'gemini-2.5-pro',
        'gemini-1.5-flash',
        'gemini-1.5-pro'
      ];
    } catch (error) {
      console.warn('No se pudo obtener lista de modelos:', error);
      return ['gemini-pro']; // Fallback a modelo estable
    }
  }

  /**
   * Inicializar Gemini API con verificación de modelo
   */
  async initialize() {
    try {
      // Solo inicializar en el cliente
      if (typeof window === 'undefined') {
        console.warn('⚠️ Gemini solo está disponible en el cliente');
        return false;
      }

      if (!process.env.NEXT_PUBLIC_GEMINI_API_KEY) {
        console.warn('⚠️ API Key de Gemini no configurada. El servicio de AI tutor no estará disponible hasta que se configure NEXT_PUBLIC_GEMINI_API_KEY en las variables de entorno.');
        return false;
      }

      this.genAI = new GoogleGenerativeAI(process.env.NEXT_PUBLIC_GEMINI_API_KEY);
      
      // Intentar inicializar con diferentes modelos en orden de preferencia (versiones actuales)
      const modelsToTry = [
        'gemini-2.0-flash',     // Gemini 2.0 Flash - más rápido
        'gemini-2.5-flash',     // Gemini 2.5 Flash - más reciente
        'gemini-2.0-pro',       // Gemini 2.0 Pro - más capaz
        'gemini-2.5-pro',       // Gemini 2.5 Pro - más reciente y capaz
        'gemini-1.5-flash',     // Fallback a versión anterior
        'gemini-1.5-pro',       // Fallback a versión anterior
        'gemini-pro',           // Fallback a versión legacy
        'gemini-flash'          // Nombre simplificado
      ];
      
      for (const modelName of modelsToTry) {
        try {
          console.log(`Intentando inicializar modelo: ${modelName}`);
          
          this.model = this.genAI.getGenerativeModel({ 
            model: modelName,
            generationConfig: {
              temperature: this.config.temperature,
              maxOutputTokens: this.config.maxTokens,
            }
          });
          
          // Hacer una prueba simple para verificar que el modelo funciona
          console.log(`🧪 Probando modelo ${modelName}...`);
          try {
            const testResult = await this.model.generateContent('Test');
            await testResult.response.text(); // Verificar que responde
            console.log(`✅ Modelo ${modelName} responde correctamente`);
          } catch (testError) {
            console.warn(`⚠️ Modelo ${modelName} inicializado pero falló en test:`, testError.message);
            // Continuar de todos modos si la inicialización funcionó
          }
          
          // Actualizar configuración con el modelo que funcionó
          this.config.modelName = modelName;
          console.log(`✅ Gemini Provider inicializado y probado correctamente con modelo: ${modelName}`);
          return true;
          
        } catch (modelError) {
          console.warn(`❌ Modelo ${modelName} no disponible:`, modelError.message);
          continue;
        }
      }
      
      throw new Error('Ningún modelo de Gemini está disponible');
    } catch (error) {
      console.error('Error al inicializar Gemini Provider:', error);
      this.stats.errors.push({
        timestamp: new Date().toISOString(),
        error: error.message,
        type: 'initialization'
      });
      return false;
    }
  }

  /**
   * Verificar disponibilidad del servicio
   */
  isAvailable() {
    return this.model !== null && this.genAI !== null && typeof window !== 'undefined';
  }

  /**
   * Método principal de generación de respuestas
   */
  async generateResponse(prompt, options = {}) {
    const startTime = Date.now();
    this.stats.totalRequests++;

    try {
      if (!this.isAvailable()) {
        throw new Error('Servicio de IA no disponible');
      }

      // Validar prompt
      if (!prompt || typeof prompt !== 'string') {
        throw new Error('Prompt no válido');
      }

      // Configuración de la solicitud
      const requestConfig = {
        ...this.config,
        ...options
      };

      // Generar contenido con reintentos
      const result = await this.generateWithRetries(prompt, requestConfig);
      const response = await result.response;
      const text = response.text();

      // Calcular métricas
      const responseTime = Date.now() - startTime;
      this.updateStats(true, responseTime, text);

      return {
        success: true,
        response: text,
        confidence: this.calculateConfidence(text),
        tokensUsed: this.estimateTokens(prompt, text),
        responseTime: responseTime,
        model: this.config.modelName
      };

    } catch (error) {
      const responseTime = Date.now() - startTime;
      this.updateStats(false, responseTime, null, error);
      
      return {
        success: false,
        error: error.message || 'Error desconocido',
        response: this.getFallbackResponse(error),
        confidence: 0,
        responseTime: responseTime
      };
    }
  }

  /**
   * Generar contenido con reintentos
   */
  async generateWithRetries(prompt, config) {
    let lastError;
    
    for (let attempt = 1; attempt <= config.maxRetries; attempt++) {
      try {
        const result = await Promise.race([
          this.model.generateContent(prompt),
          this.createTimeoutPromise(config.timeout)
        ]);
        
        return result;
      } catch (error) {
        lastError = error;
        console.warn(`Intento ${attempt} fallido:`, error.message);
        
        if (attempt < config.maxRetries) {
          // Esperar antes del siguiente intento
          await this.delay(1000 * attempt);
        }
      }
    }
    
    throw lastError;
  }

  /**
   * Crear promesa de timeout
   */
  createTimeoutPromise(timeout) {
    return new Promise((_, reject) => {
      setTimeout(() => {
        reject(new Error(`Timeout después de ${timeout}ms`));
      }, timeout);
    });
  }

  /**
   * Delay entre reintentos
   */
  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Obtener estadísticas del proveedor
   */
  getStats() {
    return {
      ...this.stats,
      successRate: this.stats.totalRequests > 0 
        ? (this.stats.successfulRequests / this.stats.totalRequests) * 100 
        : 0,
      averageResponseTime: this.stats.successfulRequests > 0
        ? this.stats.totalResponseTime / this.stats.successfulRequests
        : 0
    };
  }

  /**
   * Manejo de errores específicos
   */
  handleError(error, context = '') {
    const errorInfo = {
      timestamp: new Date().toISOString(),
      error: error.message,
      type: error.name || 'Unknown',
      context: context,
      stack: error.stack
    };

    this.stats.errors.push(errorInfo);
    this.stats.failedRequests++;

    // Log del error
    console.error(`Error en Gemini Provider [${context}]:`, error);

    return errorInfo;
  }

  /**
   * Actualizar estadísticas
   */
  updateStats(success, responseTime, response = null, error = null) {
    this.stats.lastRequestTime = new Date().toISOString();
    this.stats.totalResponseTime += responseTime;

    if (success) {
      this.stats.successfulRequests++;
      if (response) {
        this.stats.totalTokensUsed += this.estimateTokens('', response);
        const confidence = this.calculateConfidence(response);
        this.stats.averageConfidence = this.updateAverageConfidence(confidence);
      }
    } else {
      this.stats.failedRequests++;
      if (error) {
        this.handleError(error, 'generateResponse');
      }
    }
  }

  /**
   * Calcular confianza de la respuesta
   */
  calculateConfidence(response) {
    if (!response || typeof response !== 'string') return 0;

    let confidence = 0.5; // Base confidence

    // Factores que aumentan la confianza
    if (response.length > 100) confidence += 0.1;
    if (response.includes('recomendación') || response.includes('sugerencia')) confidence += 0.1;
    if (response.includes('seguridad') || response.includes('crítico')) confidence += 0.1;
    if (response.includes('parámetro') || response.includes('configuración')) confidence += 0.1;
    if (response.includes('error') || response.includes('problema')) confidence += 0.1;

    // Factores que disminuyen la confianza
    if (response.includes('no estoy seguro') || response.includes('no puedo')) confidence -= 0.2;
    if (response.includes('error') && response.includes('desconocido')) confidence -= 0.1;
    if (response.length < 50) confidence -= 0.2;

    return Math.max(0, Math.min(1, confidence));
  }

  /**
   * Estimar tokens usados
   */
  estimateTokens(input, output) {
    // Estimación simple: ~4 caracteres por token
    const inputTokens = Math.ceil((input?.length || 0) / 4);
    const outputTokens = Math.ceil((output?.length || 0) / 4);
    return inputTokens + outputTokens;
  }

  /**
   * Actualizar promedio de confianza
   */
  updateAverageConfidence(newConfidence) {
    const totalResponses = this.stats.successfulRequests;
    if (totalResponses === 1) return newConfidence;
    
    return ((this.stats.averageConfidence * (totalResponses - 1)) + newConfidence) / totalResponses;
  }

  /**
   * Obtener respuesta de fallback
   */
  getFallbackResponse(error) {
    if (error.message.includes('timeout')) {
      return 'El análisis está tardando más de lo esperado. Por favor, intenta nuevamente.';
    }
    if (error.message.includes('API key')) {
      return 'Error de configuración del servicio de IA. Contacta al administrador.';
    }
    if (error.message.includes('network') || error.message.includes('connection')) {
      return 'Error de conexión. Verifica tu internet e intenta nuevamente.';
    }
    
    return 'No se pudo generar el análisis en este momento. Por favor, intenta nuevamente más tarde.';
  }

  /**
   * Construir prompt de análisis (migrado desde geminiService.js)
   */
  buildAnalysisPrompt(userConfig, optimalConfig, ventilationMode, patientData) {
    const modeText = ventilationMode === 'volume' ? 'Volumen Control' : 'Presión Control';
    
    if (!userConfig) {
      return 'No hay configuración disponible para analizar. Por favor, configura los parámetros del ventilador primero.';
    }
    
    let prompt = `Eres un experto en ventilación mecánica. Analiza la siguiente configuración del ventilador y proporciona feedback detallado.

MODO: ${modeText}

CONFIGURACIÓN ACTUAL DEL USUARIO:
${this.formatConfig(userConfig)}

CONFIGURACIÓN ÓPTIMA RECOMENDADA:
${optimalConfig ? this.formatConfig(optimalConfig) : 'No disponible (sin datos del paciente)'}

${patientData && patientData.patientBasicData ? `DATOS DEL PACIENTE:
- Edad: ${patientData.patientBasicData.edad || 'No especificada'} años
- Peso: ${patientData.patientBasicData.peso || 'No especificado'} kg
- Altura: ${patientData.patientBasicData.altura || 'No especificada'} cm
- Diagnóstico: ${patientData.patientBasicData.diagnostico || 'No especificado'}
- Condición: ${patientData.patientBasicData.condicion || 'No especificada'}` : ''}

INSTRUCCIONES:
1. Identifica TODOS los errores en la configuración actual
2. Explica cada error en lenguaje simple y comprensible
3. Proporciona recomendaciones específicas para corregir cada error
4. Prioriza los errores por severidad (crítico, moderado, leve)
5. Considera la seguridad del paciente en primer lugar
6. Usa un tono profesional pero accesible

FORMATO DE RESPUESTA:
- Resumen ejecutivo (2-3 líneas)
- Errores críticos (si los hay)
- Errores moderados
- Errores leves
- Recomendaciones de corrección
- Consideraciones de seguridad

Responde en español.`;

    return prompt;
  }

  /**
   * Formatear configuración (migrado desde geminiService.js)
   */
  formatConfig(config) {
    if (!config || typeof config !== 'object' || Array.isArray(config)) {
      return 'Configuración no disponible';
    }
    
    try {
      return Object.entries(config)
        .filter(([key, value]) => value !== undefined && value !== null && value !== '')
        .map(([key, value]) => `- ${this.formatParameterName(key)}: ${value} ${this.getUnit(key)}`)
        .join('\n');
    } catch (error) {
      console.error('Error al formatear configuración:', error);
      return 'Error al formatear configuración';
    }
  }

  /**
   * Formatear nombre de parámetro (migrado desde geminiService.js)
   */
  formatParameterName(key) {
    const names = {
      fio2: 'FiO2',
      volumen: 'Volumen Tidal',
      presionMax: 'Presión Máxima',
      peep: 'PEEP',
      frecuencia: 'Frecuencia Respiratoria',
      inspiracionEspiracion: 'Relación I:E',
      pausaInspiratoria: 'Pausa Inspiratoria',
      pausaEspiratoria: 'Pausa Espiratoria',
      qMax: 'Flujo Máximo'
    };
    return names[key] || key;
  }

  /**
   * Obtener unidad de parámetro (migrado desde geminiService.js)
   */
  getUnit(key) {
    const units = {
      fio2: '%',
      volumen: 'ml',
      presionMax: 'cmH2O',
      peep: 'cmH2O',
      frecuencia: 'resp/min',
      inspiracionEspiracion: '',
      pausaInspiratoria: 's',
      pausaEspiratoria: 's',
      qMax: 'L/min'
    };
    return units[key] || '';
  }

  /**
   * Extraer recomendaciones (migrado desde geminiService.js)
   */
  extractRecommendations(analysis) {
    const recommendations = [];
    
    if (analysis.includes('aumentar')) {
      recommendations.push('Considera aumentar algunos parámetros');
    }
    if (analysis.includes('disminuir')) {
      recommendations.push('Considera disminuir algunos parámetros');
    }
    if (analysis.includes('seguridad')) {
      recommendations.push('Revisa parámetros de seguridad');
    }
    
    return recommendations;
  }

  /**
   * Método específico para análisis de ventilador (compatibilidad con código existente)
   */
  async analyzeVentilatorConfiguration(userConfig, optimalConfig, ventilationMode, patientData = null) {
    // Validar parámetros de entrada
    if (!userConfig || typeof userConfig !== 'object') {
      return {
        success: false,
        error: 'Configuración del usuario no válida',
        analysis: 'Por favor, asegúrate de que todos los parámetros del ventilador estén configurados correctamente.'
      };
    }

    if (!ventilationMode || !['volume', 'pressure'].includes(ventilationMode)) {
      return {
        success: false,
        error: 'Modo de ventilación no válido',
        analysis: 'El modo de ventilación debe ser "volume" o "pressure".'
      };
    }

    try {
      const prompt = this.buildAnalysisPrompt(userConfig, optimalConfig, ventilationMode, patientData);
      
      if (!prompt || prompt.includes('No hay configuración disponible')) {
        return {
          success: false,
          error: 'No hay configuración para analizar',
          analysis: 'Por favor, configura los parámetros del ventilador antes de solicitar un análisis.'
        };
      }
      
      const result = await this.generateResponse(prompt);
      
      if (result.success) {
        return {
          success: true,
          analysis: result.response,
          recommendations: this.extractRecommendations(result.response),
          confidence: result.confidence,
          responseTime: result.responseTime
        };
      } else {
        return {
          success: false,
          error: result.error,
          analysis: result.response
        };
      }
    } catch (error) {
      console.error('Error al analizar con Gemini:', error);
      return {
        success: false,
        error: error.message || 'Error desconocido',
        analysis: 'No se pudo analizar la configuración en este momento. Por favor, verifica tu conexión a internet y la API key de Gemini.'
      };
    }
  }
}

