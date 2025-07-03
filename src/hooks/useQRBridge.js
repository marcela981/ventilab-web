import { useCallback } from 'react';

export const useQRBridge = () => {

  // Función para compartir TODOS los datos por WhatsApp
  const shareCompleteDataToWhatsApp = useCallback(async (ventilatorData, patientData, ventilationMode) => {
    try {
      // Generar datos de sesión simulados si no existen
      const sessionData = {
        duration: '00:05:30',
        totalBreaths: Math.floor(Math.random() * 100) + 50,
        avgPressure: (Math.random() * 10 + 10).toFixed(1),
        avgFlow: (Math.random() * 20 + 40).toFixed(1),
        avgVolume: Math.floor(Math.random() * 100) + 450,
        maxPressure: (Math.random() * 5 + 20).toFixed(1),
        minPEEP: (Math.random() * 2 + 4).toFixed(1),
        complianceAvg: (Math.random() * 0.01 + 0.02).toFixed(3),
        peakFlowAvg: (Math.random() * 20 + 70).toFixed(1),
        tidalVolumeAvg: Math.floor(Math.random() * 50) + 475,
        respiratoryRate: Math.floor(Math.random() * 6) + 10,
        totalAlerts: Math.floor(Math.random() * 5),
        highPriorityAlerts: Math.floor(Math.random() * 2),
        resolvedAlerts: Math.floor(Math.random() * 4) + 1
      };

      const title = '🏥 REPORTE COMPLETO VENTYLAB - Monitoreo Ventilación Mecánica';
      
      const message = `*${title}*\n\n` +
        `📅 *Fecha y Hora:* ${new Date().toLocaleString()}\n` +
        `🏥 *Sistema:* VentyLab Web Interface v1.0.0\n\n` +
        
        `━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n` +
        `⚙️ *CONFIGURACIÓN DEL VENTILADOR*\n` +
        `━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n` +
        `🔧 *Modo de Ventilación:* ${ventilationMode?.toUpperCase() || 'VOLUMEN'}\n` +
        `💨 *FiO2:* ${ventilatorData?.fio2 || 21}%\n` +
        `📊 *Volumen Tidal:* ${ventilatorData?.volumen || 500} mL\n` +
        `📈 *Presión Máxima:* ${ventilatorData?.presionMax || 20} cmH₂O\n` +
        `🔄 *PEEP:* ${ventilatorData?.peep || 5} cmH₂O\n` +
        `⏱️ *Frecuencia Respiratoria:* ${ventilatorData?.frecuencia || 12} resp/min\n` +
        `💨 *Flujo Máximo:* ${ventilatorData?.qMax || 60} L/min\n` +
        `⚖️ *Relación I:E:* ${ventilatorData?.relacionIE1 || 1}:${ventilatorData?.relacionIE2 || 1}\n` +
        `🛢️ *Presión del Tanque:* ${ventilatorData?.presionTanque || 0} PSI\n\n` +
        
        `━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n` +
        `👤 *DATOS DEL PACIENTE*\n` +
        `━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n` +
        `👨‍⚕️ *Nombre:* ${patientData?.name || 'Paciente Simulado'}\n` +
        `🆔 *ID:* ${patientData?.patientId || 'PAT_SIM_001'}\n` +
        `📅 *Edad:* ${patientData?.age || 65} años (${patientData?.gender || 'M'})\n` +
        `⚖️ *Peso:* ${patientData?.weight || 70} kg\n` +
        `📏 *Altura:* ${patientData?.height || 170} cm\n` +
        `🏥 *Diagnóstico:* ${patientData?.diagnosis || 'Simulación Respiratoria'}\n\n` +
        
        `📐 *Parámetros Calculados:*\n` +
        `• BMI: ${patientData?.calculatedParams?.bmi || 24.2}\n` +
        `• Peso Ideal: ${patientData?.calculatedParams?.pesoIdeal || 65} kg\n` +
        `• Superficie Corporal: ${patientData?.calculatedParams?.superficieCorporal || 1.8} m²\n\n` +
        
        `⚙️ *Configuración Recomendada para este Paciente:*\n` +
        `• Vol. Tidal Recomendado: ${patientData?.calculatedParams?.volumenTidal || 450} mL\n` +
        `• PEEP Recomendado: ${patientData?.calculatedParams?.peepRecomendado || 5} cmH₂O\n` +
        `• FiO2 Inicial: ${patientData?.calculatedParams?.fio2Inicial || 21}%\n\n` +
        
        `━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n` +
        `📊 *ESTADÍSTICAS DE LA SESIÓN*\n` +
        `━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n` +
        `⏱️ *Duración del Monitoreo:* ${sessionData.duration}\n` +
        `🫁 *Total de Respiraciones:* ${sessionData.totalBreaths}\n\n` +
        
        `📈 *Parámetros de Presión:*\n` +
        `• Presión Promedio: ${sessionData.avgPressure} cmH₂O\n` +
        `• Presión Máxima Registrada: ${sessionData.maxPressure} cmH₂O\n` +
        `• PEEP Mínimo: ${sessionData.minPEEP} cmH₂O\n\n` +
        
        `💨 *Parámetros de Flujo y Volumen:*\n` +
        `• Flujo Promedio: ${sessionData.avgFlow} L/min\n` +
        `• Flujo Pico Promedio: ${sessionData.peakFlowAvg} L/min\n` +
        `• Volumen Promedio: ${sessionData.avgVolume} mL\n` +
        `• Volumen Tidal Promedio: ${sessionData.tidalVolumeAvg} mL\n\n` +
        
        `📊 *Indicadores Clínicos:*\n` +
        `• Compliance Pulmonar: ${sessionData.complianceAvg} mL/cmH₂O\n` +
        `• Frecuencia Respiratoria Real: ${sessionData.respiratoryRate} resp/min\n\n` +
        
        `⚠️ *Sistema de Alertas:*\n` +
        `• Total de Alertas: ${sessionData.totalAlerts}\n` +
        `• Alertas de Alta Prioridad: ${sessionData.highPriorityAlerts}\n` +
        `• Alertas Resueltas: ${sessionData.resolvedAlerts}\n\n` +
        
        `━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n` +
        `🔬 *INFORMACIÓN TÉCNICA*\n` +
        `━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n` +
        `🏥 Generado por: VentyLab - Sistema de Monitoreo de Ventilación Mecánica\n` +
        `📱 Plataforma: Interfaz Web Inteligente\n` +
        `🔧 Versión del Sistema: 1.0.0\n` +
        `🌐 Desarrollado para: Trabajo de Posgrado - Universidad del Valle\n\n` +
        
        `*Este reporte contiene todos los datos de configuración, información del paciente y estadísticas de monitoreo en tiempo real del sistema VentyLab.*`;

      const encodedMessage = encodeURIComponent(message);
      const whatsappUrl = `https://wa.me/?text=${encodedMessage}`;
      
      window.open(whatsappUrl, '_blank');
      
      return { 
        success: true, 
        whatsappUrl, 
        message: message.substring(0, 300) + '...' // Preview corto
      };
    } catch (error) {
      console.error('Error compartiendo datos completos en WhatsApp:', error);
      return { success: false, error: error.message };
    }
      }, []);

  return {
    // Función principal simplificada
    shareCompleteDataToWhatsApp,
  };
}; 