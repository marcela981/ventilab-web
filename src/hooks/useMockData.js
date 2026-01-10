import { useState, useEffect } from 'react';

const useMockData = (isConnected = true, interval = 1000) => {
  const [mockData, setMockData] = useState({
    pressure: [],
    flow: [],
    volume: [],
    time: [],
  });

  // Generar datos de prueba realistas para un ventilador
  const generateMockData = () => {
    const now = Date.now();
    
    // Simular ciclo respiratorio (inspiración y espiración)
    const cycleTime = 4000; // 4 segundos por ciclo
    const cycleProgress = (now % cycleTime) / cycleTime;
    
    // Presión: pico durante inspiración, PEEP durante espiración
    let pressure;
    if (cycleProgress < 0.3) {
      // Inspiración: subida rápida
      const inspProgress = cycleProgress / 0.3;
      pressure = 5 + (25 - 5) * Math.sin(inspProgress * Math.PI / 2);
    } else if (cycleProgress < 0.4) {
      // Meseta: presión constante
      pressure = 25;
    } else {
      // Espiración: bajada a PEEP
      const expProgress = (cycleProgress - 0.4) / 0.6;
      pressure = 25 - (25 - 5) * Math.sin(expProgress * Math.PI / 2);
    }
    
    // Agregar ruido aleatorio
    pressure += (Math.random() - 0.5) * 2;
    
    // Flujo: positivo durante inspiración, negativo durante espiración
    let flow;
    if (cycleProgress < 0.3) {
      // Inspiración: flujo inspiratorio
      const inspProgress = cycleProgress / 0.3;
      flow = 60 * Math.sin(inspProgress * Math.PI);
    } else if (cycleProgress < 0.4) {
      // Meseta: flujo cero
      flow = 0;
    } else {
      // Espiración: flujo espiratorio
      const expProgress = (cycleProgress - 0.4) / 0.6;
      flow = -40 * Math.sin(expProgress * Math.PI);
    }
    
    // Agregar ruido aleatorio
    flow += (Math.random() - 0.5) * 5;
    
    // Volumen: acumulación durante inspiración, descarga durante espiración
    let volume;
    if (cycleProgress < 0.3) {
      // Inspiración: acumulación de volumen
      const inspProgress = cycleProgress / 0.3;
      volume = 500 * Math.sin(inspProgress * Math.PI / 2);
    } else if (cycleProgress < 0.4) {
      // Meseta: volumen máximo
      volume = 500;
    } else {
      // Espiración: descarga de volumen
      const expProgress = (cycleProgress - 0.4) / 0.6;
      volume = 500 * Math.cos(expProgress * Math.PI / 2);
    }
    
    // Agregar ruido aleatorio
    volume += (Math.random() - 0.5) * 20;
    
    return {
      pressure: Math.max(0, pressure),
      flow: flow,
      volume: Math.max(0, volume),
      time: now,
    };
  };

  useEffect(() => {
    if (!isConnected) return;

    const intervalId = setInterval(() => {
      const newDataPoint = generateMockData();
      
      setMockData(prevData => {
        const updatedData = {
          pressure: [...prevData.pressure, newDataPoint.pressure],
          flow: [...prevData.flow, newDataPoint.flow],
          volume: [...prevData.volume, newDataPoint.volume],
          time: [...prevData.time, newDataPoint.time],
        };

        // Mantener solo los últimos 200 puntos para evitar problemas de memoria
        const maxPoints = 200;
        if (updatedData.pressure.length > maxPoints) {
          updatedData.pressure = updatedData.pressure.slice(-maxPoints);
          updatedData.flow = updatedData.flow.slice(-maxPoints);
          updatedData.volume = updatedData.volume.slice(-maxPoints);
          updatedData.time = updatedData.time.slice(-maxPoints);
        }

        return updatedData;
      });
    }, interval);

    return () => clearInterval(intervalId);
  }, [isConnected, interval]);

  // Función para generar datos históricos iniciales
  const generateHistoricalData = (points = 50) => {
    const historicalData = {
      pressure: [],
      flow: [],
      volume: [],
      time: [],
    };

    const now = Date.now();
    const timeStep = 1000; // 1 segundo entre puntos

    for (let i = points; i > 0; i--) {
      const time = now - (i * timeStep);
      const cycleTime = 4000;
      const cycleProgress = (time % cycleTime) / cycleTime;
      
      // Presión
      let pressure;
      if (cycleProgress < 0.3) {
        const inspProgress = cycleProgress / 0.3;
        pressure = 5 + (25 - 5) * Math.sin(inspProgress * Math.PI / 2);
      } else if (cycleProgress < 0.4) {
        pressure = 25;
      } else {
        const expProgress = (cycleProgress - 0.4) / 0.6;
        pressure = 25 - (25 - 5) * Math.sin(expProgress * Math.PI / 2);
      }
      pressure += (Math.random() - 0.5) * 2;
      
      // Flujo
      let flow;
      if (cycleProgress < 0.3) {
        const inspProgress = cycleProgress / 0.3;
        flow = 60 * Math.sin(inspProgress * Math.PI);
      } else if (cycleProgress < 0.4) {
        flow = 0;
      } else {
        const expProgress = (cycleProgress - 0.4) / 0.6;
        flow = -40 * Math.sin(expProgress * Math.PI);
      }
      flow += (Math.random() - 0.5) * 5;
      
      // Volumen
      let volume;
      if (cycleProgress < 0.3) {
        const inspProgress = cycleProgress / 0.3;
        volume = 500 * Math.sin(inspProgress * Math.PI / 2);
      } else if (cycleProgress < 0.4) {
        volume = 500;
      } else {
        const expProgress = (cycleProgress - 0.4) / 0.6;
        volume = 500 * Math.cos(expProgress * Math.PI / 2);
      }
      volume += (Math.random() - 0.5) * 20;
      
      historicalData.pressure.push(Math.max(0, pressure));
      historicalData.flow.push(flow);
      historicalData.volume.push(Math.max(0, volume));
      historicalData.time.push(time);
    }

    return historicalData;
  };

  // Inicializar con datos históricos
  useEffect(() => {
    if (isConnected && mockData.pressure.length === 0) {
      const historicalData = generateHistoricalData(50);
      setMockData(historicalData);
    }
  }, [isConnected]);

  return mockData;
};

export default useMockData; 