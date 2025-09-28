import { GoogleGenerativeAI } from '@google/generative-ai';

let genAI = null;
let model = null;

// Solo inicializar en el cliente
if (typeof window !== 'undefined') {
  try {
    genAI = new GoogleGenerativeAI(process.env.NEXT_PUBLIC_GEMINI_API_KEY);
    model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
  } catch (error) {
    console.warn('No se pudo inicializar Gemini en el cliente:', error);
  }
}

export class GeminiService {
  constructor() {
    // No hacer nada en el constructor para SSR
  }

  async analyzeVentilatorConfiguration(userConfig, optimalConfig, ventilationMode, patientData = null) {
    // Verificar que estemos en el cliente y que el modelo esté disponible
    if (typeof window === 'undefined' || !model) {
      return {
        success: false,
        error: 'Servicio de IA no disponible en el servidor',
        analysis: 'El análisis de IA solo está disponible en el cliente.'
      };
    }

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
      
      const result = await model.generateContent(prompt);
      const response = await result.response;
      const text = response.text();
      
      return {
        success: true,
        analysis: text,
        recommendations: this.extractRecommendations(text)
      };
    } catch (error) {
      console.error('Error al analizar con Gemini:', error);
      return {
        success: false,
        error: error.message || 'Error desconocido',
        analysis: 'No se pudo analizar la configuración en este momento. Por favor, verifica tu conexión a internet y la API key de Gemini.'
      };
    }
  }

  buildAnalysisPrompt(userConfig, optimalConfig, ventilationMode, patientData) {
    const modeText = ventilationMode === 'volume' ? 'Volumen Control' : 'Presión Control';
    
    // Validar que tengamos al menos la configuración del usuario
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

  formatConfig(config) {
    // Validar que config sea un objeto válido
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

  extractRecommendations(analysis) {
    // Extraer recomendaciones específicas del texto de Gemini
    const recommendations = [];
    
    // Buscar patrones comunes en las respuestas
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
}

export default new GeminiService();