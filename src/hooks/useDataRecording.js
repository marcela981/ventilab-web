import { useState, useRef, useCallback } from 'react';

export const useDataRecording = () => {
  const [isRecording, setIsRecording] = useState(false);
  const [recordedData, setRecordedData] = useState([]);
  const [sensorDataBuffer, setSensorDataBuffer] = useState([]); // Buffer para datos de sensores
  const recordingStartTime = useRef(null);

  // Iniciar grabación
  const startRecording = useCallback(() => {
    setIsRecording(true);
    setRecordedData([]);
    recordingStartTime.current = Date.now();
    console.log('Iniciando grabación de datos enviados...');
  }, []);

  // Detener grabación
  const stopRecording = useCallback(() => {
    setIsRecording(false);
    console.log('Deteniendo grabación de datos enviados...');
  }, []);

  // Agregar datos enviados a la grabación
  const addSentData = useCallback((ventilationMode, ventilatorData, configFrame) => {
    if (isRecording) {
      const timestamp = Date.now();
      const dataPoint = {
        timestamp: timestamp,
        relativeTime: recordingStartTime.current ? ((timestamp - recordingStartTime.current) / 1000).toFixed(3) : '0.000',
        mode: ventilationMode,
        configFrame: configFrame,
        parameters: {
          fio2: ventilatorData.fio2 || 21,
          volumen: ventilatorData.volumen || 500,
          presionMax: ventilatorData.presionMax || 20,
          qMax: ventilatorData.qMax || 60,
          peep: ventilatorData.peep || 5,
          frecuencia: ventilatorData.frecuencia || 12,
          tiempoInspiratorio: ventilatorData.tiempoInspiratorio || 2.5,
          pausaInspiratoria: ventilatorData.pausaInspiratoria || 0.1,
          tiempoEspiratorio: ventilatorData.tiempoEspiratorio || 2.5,
          pausaEspiratoria: ventilatorData.pausaEspiratoria || 0.1,
          presionTanque: ventilatorData.presionTanque || 0,
          relacionIE1: ventilatorData.relacionIE1 || 1,
          relacionIE2: ventilatorData.relacionIE2 || 2,
          relacionTexto: ventilatorData.relacionTexto || "Relación 1:2 [s]"
        }
      };
      
      setRecordedData(prev => [...prev, dataPoint]);
      console.log('Datos enviados registrados:', dataPoint);
    }
  }, [isRecording]);

  // Agregar datos de sensores en tiempo real (como en Python)
  const addSensorData = useCallback((pressure, flow, volume) => {
    const timestamp = Date.now();
    const sensorPoint = {
      pressure: pressure,
      flow: flow,
      volume: volume,
      timestamp: timestamp,
      timeString: (timestamp / 1000).toString() // Formato similar al Python
    };
    
    // Agregar al buffer (mantener últimos 10000 puntos para evitar overflow)
    setSensorDataBuffer(prev => {
      const newBuffer = [...prev, sensorPoint];
      return newBuffer.length > 10000 ? newBuffer.slice(-10000) : newBuffer;
    });
    
    // Si está grabando, también agregar a datos grabados
    if (isRecording) {
      setRecordedData(prev => [...prev, sensorPoint]);
    }
  }, [isRecording]);

  // Generar archivo TXT
  const generateTxtFile = useCallback(() => {
    if (recordedData.length === 0) {
      console.warn('No hay datos enviados grabados para exportar');
      return null;
    }

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `ventilador_datos_enviados_${timestamp}.txt`;
    
    // Encabezado del archivo
    let content = `Datos Enviados al Ventilador - VentyLab\n`;
    content += `Fecha: ${new Date().toLocaleString()}\n`;
    content += `Total de configuraciones enviadas: ${recordedData.length}\n`;
    content += `Tiempo total: ${recordedData.length > 0 ? recordedData[recordedData.length - 1].relativeTime : 0} segundos\n\n`;
    content += `Formato: Tiempo(s)|Modo|FIO2|Volumen|PresionMax|QMax|PEEP|Frecuencia|Ti|PausaI|Te|PausaE|PresT|I:E|Trama\n`;
    content += `==========================================\n\n`;

    // Datos en formato numérico
    recordedData.forEach((dataPoint, index) => {
      const p = dataPoint.parameters;
      content += `${dataPoint.relativeTime}|${dataPoint.mode}|${p.fio2}|${p.volumen}|${p.presionMax}|${p.qMax}|${p.peep}|${p.frecuencia}|${p.tiempoInspiratorio}|${p.pausaInspiratoria}|${p.tiempoEspiratorio}|${p.pausaEspiratoria}|${p.presionTanque}|${p.relacionIE1}:${p.relacionIE2}|${dataPoint.configFrame}\n`;
    });

    // Estadísticas al final
    if (recordedData.length > 0) {
      const volumes = recordedData.map(d => d.parameters.volumen);
      const pressures = recordedData.map(d => d.parameters.presionMax);
      const flows = recordedData.map(d => d.parameters.qMax);
      const peeps = recordedData.map(d => d.parameters.peep);
      const frequencies = recordedData.map(d => d.parameters.frecuencia);

      content += `\n==========================================\n`;
      content += `ESTADÍSTICAS DE CONFIGURACIONES ENVIADAS\n`;
      content += `==========================================\n`;
      content += `Volumen:\n`;
      content += `  Máximo: ${Math.max(...volumes)} mL\n`;
      content += `  Mínimo: ${Math.min(...volumes)} mL\n`;
      content += `  Promedio: ${(volumes.reduce((a, b) => a + b, 0) / volumes.length).toFixed(1)} mL\n\n`;
      content += `Presión Máxima:\n`;
      content += `  Máximo: ${Math.max(...pressures)} cmH2O\n`;
      content += `  Mínimo: ${Math.min(...pressures)} cmH2O\n`;
      content += `  Promedio: ${(pressures.reduce((a, b) => a + b, 0) / pressures.length).toFixed(1)} cmH2O\n\n`;
      content += `Flujo Máximo:\n`;
      content += `  Máximo: ${Math.max(...flows)} L/min\n`;
      content += `  Mínimo: ${Math.min(...flows)} L/min\n`;
      content += `  Promedio: ${(flows.reduce((a, b) => a + b, 0) / flows.length).toFixed(1)} L/min\n\n`;
      content += `PEEP:\n`;
      content += `  Máximo: ${Math.max(...peeps)} cmH2O\n`;
      content += `  Mínimo: ${Math.min(...peeps)} cmH2O\n`;
      content += `  Promedio: ${(peeps.reduce((a, b) => a + b, 0) / peeps.length).toFixed(1)} cmH2O\n\n`;
      content += `Frecuencia:\n`;
      content += `  Máximo: ${Math.max(...frequencies)} resp/min\n`;
      content += `  Mínimo: ${Math.min(...frequencies)} resp/min\n`;
      content += `  Promedio: ${(frequencies.reduce((a, b) => a + b, 0) / frequencies.length).toFixed(1)} resp/min\n\n`;
      
      // Conteo por modo
      const volumeModeCount = recordedData.filter(d => d.mode === 'volume').length;
      const pressureModeCount = recordedData.filter(d => d.mode === 'pressure').length;
      content += `Modos de Ventilación:\n`;
      content += `  Volumen Control: ${volumeModeCount} configuraciones\n`;
      content += `  Presión Control: ${pressureModeCount} configuraciones\n`;
    }

    return { content, filename };
  }, [recordedData]);

  // Generar archivo PDF (versión simplificada)
  const generatePdfFile = useCallback(() => {
    if (recordedData.length === 0) {
      console.warn('No hay datos enviados grabados para exportar');
      return null;
    }

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `ventilador_datos_enviados_${timestamp}.pdf`;
    
    // Crear contenido HTML que se puede convertir a PDF
    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>Datos Enviados al Ventilador - VentyLab</title>
        <style>
          body { font-family: Arial, sans-serif; margin: 20px; }
          .header { text-align: center; border-bottom: 2px solid #de0b24; padding-bottom: 10px; margin-bottom: 20px; }
          .stats { background-color: #f5f5f5; padding: 15px; border-radius: 5px; margin: 20px 0; }
          .data-table { width: 100%; border-collapse: collapse; margin: 20px 0; font-size: 12px; }
          .data-table th, .data-table td { border: 1px solid #ddd; padding: 6px; text-align: center; }
          .data-table th { background-color: #de0b24; color: white; }
          .data-table tr:nth-child(even) { background-color: #f2f2f2; }
          .footer { text-align: center; margin-top: 30px; color: #666; }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>Datos Enviados al Ventilador - VentyLab</h1>
          <p>Fecha: ${new Date().toLocaleString()}</p>
          <p>Total de configuraciones enviadas: ${recordedData.length}</p>
          <p>Tiempo total: ${recordedData.length > 0 ? recordedData[recordedData.length - 1].relativeTime : 0} segundos</p>
        </div>

        <div class="stats">
          <h2>Estadísticas de Configuraciones Enviadas</h2>
          ${(() => {
            const volumes = recordedData.map(d => d.parameters.volumen);
            const pressures = recordedData.map(d => d.parameters.presionMax);
            const flows = recordedData.map(d => d.parameters.qMax);
            const peeps = recordedData.map(d => d.parameters.peep);
            const frequencies = recordedData.map(d => d.parameters.frecuencia);
            const volumeModeCount = recordedData.filter(d => d.mode === 'volume').length;
            const pressureModeCount = recordedData.filter(d => d.mode === 'pressure').length;
            
            return `
              <h3>Volumen</h3>
              <p>Máximo: ${Math.max(...volumes)} mL | Mínimo: ${Math.min(...volumes)} mL | Promedio: ${(volumes.reduce((a, b) => a + b, 0) / volumes.length).toFixed(1)} mL</p>
              
              <h3>Presión Máxima</h3>
              <p>Máximo: ${Math.max(...pressures)} cmH2O | Mínimo: ${Math.min(...pressures)} cmH2O | Promedio: ${(pressures.reduce((a, b) => a + b, 0) / pressures.length).toFixed(1)} cmH2O</p>
              
              <h3>Flujo Máximo</h3>
              <p>Máximo: ${Math.max(...flows)} L/min | Mínimo: ${Math.min(...flows)} L/min | Promedio: ${(flows.reduce((a, b) => a + b, 0) / flows.length).toFixed(1)} L/min</p>
              
              <h3>PEEP</h3>
              <p>Máximo: ${Math.max(...peeps)} cmH2O | Mínimo: ${Math.min(...peeps)} cmH2O | Promedio: ${(peeps.reduce((a, b) => a + b, 0) / peeps.length).toFixed(1)} cmH2O</p>
              
              <h3>Frecuencia</h3>
              <p>Máximo: ${Math.max(...frequencies)} resp/min | Mínimo: ${Math.min(...frequencies)} resp/min | Promedio: ${(frequencies.reduce((a, b) => a + b, 0) / frequencies.length).toFixed(1)} resp/min</p>
              
              <h3>Modos de Ventilación</h3>
              <p>Volumen Control: ${volumeModeCount} configuraciones | Presión Control: ${pressureModeCount} configuraciones</p>
            `;
          })()}
        </div>

        <h2>Configuraciones Enviadas (Primeras 20)</h2>
        <table class="data-table">
          <thead>
            <tr>
              <th>Tiempo (s)</th>
              <th>Modo</th>
              <th>FIO2 (%)</th>
              <th>Vol (mL)</th>
              <th>PIP (cmH2O)</th>
              <th>QMax (L/min)</th>
              <th>PEEP (cmH2O)</th>
              <th>Freq (resp/min)</th>
              <th>I:E</th>
            </tr>
          </thead>
          <tbody>
            ${recordedData.slice(0, 20).map(data => `
              <tr>
                <td>${data.relativeTime}</td>
                <td>${data.mode === 'volume' ? 'Vol' : 'Pres'}</td>
                <td>${data.parameters.fio2}</td>
                <td>${data.parameters.volumen}</td>
                <td>${data.parameters.presionMax}</td>
                <td>${data.parameters.qMax}</td>
                <td>${data.parameters.peep}</td>
                <td>${data.parameters.frecuencia}</td>
                <td>${data.parameters.relacionIE1}:${data.parameters.relacionIE2}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
        
        ${recordedData.length > 20 ? `<p><em>Mostrando las primeras 20 configuraciones de ${recordedData.length} totales</em></p>` : ''}

        <div class="footer">
          <p>Generado por VentyLab - Sistema de Monitoreo de Ventilador</p>
          <p>Universidad del Valle</p>
        </div>
      </body>
      </html>
    `;

    return { content: htmlContent, filename };
  }, [recordedData]);

  // Generar archivo de datos de sensores (formato Python)
  const generateSensorDataFile = useCallback(() => {
    if (sensorDataBuffer.length === 0) {
      console.warn('No hay datos de sensores para exportar');
      return null;
    }

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `datos_sensores_${timestamp}.txt`;
    
    // Formato exacto del Python: "presion=flujo=volumen=tiempo\n"
    let content = '';
    sensorDataBuffer.forEach(point => {
      content += `${point.pressure}=${point.flow}=${point.volume}=${point.timeString}\n`;
    });

    return { content, filename };
  }, [sensorDataBuffer]);

  // Limpiar buffer de datos de sensores
  const clearSensorBuffer = useCallback(() => {
    setSensorDataBuffer([]);
  }, []);

  // Descargar archivo
  const downloadFile = useCallback((content, filename, mimeType = 'text/plain') => {
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }, []);

  // Descargar como TXT
  const downloadAsTxt = useCallback(() => {
    const fileData = generateTxtFile();
    if (fileData) {
      downloadFile(fileData.content, fileData.filename, 'text/plain');
    }
  }, [generateTxtFile, downloadFile]);

  // Descargar como PDF (usando html2pdf si está disponible)
  const downloadAsPdf = useCallback(async () => {
    const fileData = generatePdfFile();
    if (fileData) {
      try {
        // Intentar usar html2pdf si está disponible
        if (window.html2pdf) {
          const element = document.createElement('div');
          element.innerHTML = fileData.content;
          document.body.appendChild(element);
          
          await window.html2pdf()
            .from(element)
            .save(fileData.filename);
          
          document.body.removeChild(element);
        } else {
          // Fallback: descargar como HTML
          downloadFile(fileData.content, fileData.filename.replace('.pdf', '.html'), 'text/html');
        }
      } catch (error) {
        console.error('Error generando PDF:', error);
        // Fallback: descargar como HTML
        downloadFile(fileData.content, fileData.filename.replace('.pdf', '.html'), 'text/html');
      }
    }
  }, [generatePdfFile, downloadFile]);

  return {
    isRecording,
    recordedData,
    sensorDataBuffer,
    hasSensorData: sensorDataBuffer.length > 0,
    startRecording,
    stopRecording,
    addSentData,
    addSensorData,
    generateSensorDataFile,
    clearSensorBuffer,
    downloadAsTxt,
    downloadAsPdf,
    hasData: recordedData.length > 0,
    downloadSensorData: useCallback(() => {
      const fileData = generateSensorDataFile();
      if (fileData) {
        const blob = new Blob([fileData.content], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = fileData.filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        console.log('Datos de sensores descargados:', fileData.filename);
      }
    }, [generateSensorDataFile])
  };
}; 