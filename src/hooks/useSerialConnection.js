import { useState, useEffect, useCallback, useRef } from 'react';
import { SerialProtocol, SerialMessageQueue } from '../utils/serialCommunication';

export const useSerialConnection = () => {
  const [port, setPort] = useState(null);
  const [isConnected, setIsConnected] = useState(false);
  const [reader, setReader] = useState(null);
  const [writer, setWriter] = useState(null);
  const [connectionStatus, setConnectionStatus] = useState('disconnected'); // 'connecting', 'connected', 'disconnected', 'error'
  const [availablePorts, setAvailablePorts] = useState([]);
  
  // Cola de mensajes para manejar diferentes tipos de tramas
  const messageQueue = useRef(new SerialMessageQueue());
  const readerActive = useRef(false);

  // Función para detectar puertos seriales disponibles
  const getAvailablePorts = useCallback(async () => {
    try {
      if ('serial' in navigator) {
        // En Web Serial API no podemos listar puertos sin permiso del usuario
        // Pero podemos mostrar los puertos ya autorizados
        const ports = await navigator.serial.getPorts();
        setAvailablePorts(ports);
        return ports;
      } else {
        console.warn('Web Serial API no está disponible en este navegador');
        return [];
      }
    } catch (error) {
      console.error('Error obteniendo puertos:', error);
      return [];
    }
  }, []);

  // Función para solicitar puerto (equivalente a read_ports en Python)
  const requestPort = useCallback(async (filters = []) => {
    try {
      // Filtros comunes para dispositivos de ventilador
      const defaultFilters = [
        { usbVendorId: 0x2341, usbProductId: 0x0043 }, // Arduino Uno
        { usbVendorId: 0x2341, usbProductId: 0x0001 }, // Arduino Uno (older)
        { usbVendorId: 0x2341 }, // Cualquier Arduino
        { usbVendorId: 0x1a86 }, // CH340 (clones Arduino)
        { usbVendorId: 0x0403 }, // FTDI
        // Agregar más según el hardware específico
      ];

      const selectedPort = await navigator.serial.requestPort({
        filters: filters.length > 0 ? filters : defaultFilters
      });
      
      const updatedPorts = await getAvailablePorts();
      return selectedPort;
    } catch (error) {
      console.error('Error solicitando puerto:', error);
      throw error;
    }
  }, [getAvailablePorts]);

  const connect = useCallback(async (portOrFilters = null, baudRate = 9600) => {
    try {
      setConnectionStatus('connecting');
      let selectedPort = null;

      if (portOrFilters && typeof portOrFilters.open === 'function') {
        // Se recibió un objeto SerialPort ya autorizado
        selectedPort = portOrFilters;
      } else {
        // Si se pasó un array de filtros, úsalo; de lo contrario pedir puerto
        const filters = Array.isArray(portOrFilters) ? portOrFilters : [];
        selectedPort = await navigator.serial.requestPort({ filters });
      }

      await selectedPort.open({ baudRate });

      const textDecoder = new TextDecoderStream();
      const readableStreamClosed = selectedPort.readable.pipeTo(textDecoder.writable);
      const reader = textDecoder.readable.getReader();

      const textEncoder = new TextEncoderStream();
      const writableStreamClosed = textEncoder.readable.pipeTo(selectedPort.writable);
      const writer = textEncoder.writable.getWriter();

      setPort(selectedPort);
      setReader(reader);
      setWriter(writer);
      setIsConnected(true);
      setConnectionStatus('connected');

      // Iniciar lectura de datos
      startReading(reader);

      return true;
    } catch (error) {
      console.error('Error conectando:', error);
      setConnectionStatus('error');
      return false;
    }
  }, []);

  const disconnect = useCallback(async () => {
    try {
      // Detener lectura
      readerActive.current = false;
      
      // Enviar trama de desconexión antes de cerrar
      if (writer && isConnected) {
        await sendData(SerialProtocol.createDisconnectFrame());
      }
      
      if (reader) reader.releaseLock();
      if (writer) writer.releaseLock();
      if (port) await port.close();
      
      setPort(null);
      setReader(null);
      setWriter(null);
      setIsConnected(false);
      setConnectionStatus('disconnected');
      
      // Limpiar callbacks
      messageQueue.current.clearCallbacks();
      
    } catch (error) {
      console.error('Error desconectando:', error);
      setConnectionStatus('error');
    }
  }, [port, reader, writer, isConnected]);

  const sendData = useCallback(async (data) => {
    if (!writer || !isConnected) {
      console.warn('No se puede enviar datos: sin conexión');
      return false;
    }

    try {
      // Validar trama antes de enviar
      const validation = SerialProtocol.validateFrame(data);
      if (!validation.valid) {
        console.error('Trama inválida:', validation.error);
        return false;
      }

      const message = data + '\n';
      await writer.write(message);
      console.log('Enviado:', message.trim());
      return true;
    } catch (error) {
      console.error('Error enviando datos:', error);
      return false;
    }
  }, [writer, isConnected]);

  const startReading = useCallback(async (reader) => {
    readerActive.current = true;
    
    try {
      while (readerActive.current && reader) {
        const { value, done } = await reader.read();
        if (done) break;
        
        // Procesar líneas recibidas
        const lines = value.split('\n');
        for (const line of lines) {
          const trimmedLine = line.trim();
          if (trimmedLine) {
            // Procesar trama usando la cola de mensajes
            messageQueue.current.processFrame(trimmedLine);
          }
        }
      }
    } catch (error) {
      console.error('Error leyendo datos:', error);
      if (readerActive.current) {
        setConnectionStatus('error');
      }
    }
  }, []);

  // Funciones para registrar callbacks para diferentes tipos de mensajes
  const onSensorData = useCallback((callback) => {
    messageQueue.current.onMessage('sensor', callback);
  }, []);

  const onStatusMessage = useCallback((callback) => {
    messageQueue.current.onMessage('status', callback);
  }, []);

  const onErrorMessage = useCallback((callback) => {
    messageQueue.current.onMessage('error', callback);
  }, []);

  const onAckMessage = useCallback((callback) => {
    messageQueue.current.onMessage('ack', callback);
  }, []);

  const onConfigConfirm = useCallback((callback) => {
    messageQueue.current.onMessage('config_confirm', callback);
  }, []);

  const onDebugMessage = useCallback((callback) => {
    messageQueue.current.onMessage('debug', callback);
  }, []);

  const onUnknownMessage = useCallback((callback) => {
    messageQueue.current.onMessage('unknown', callback);
  }, []);

  // Función para enviar comandos específicos
  const sendCommand = useCallback(async (command, parameters = []) => {
    const frame = SerialProtocol.createCustomFrame(command, parameters);
    return await sendData(frame);
  }, [sendData]);

  // Función para enviar configuración con validación
  const sendConfiguration = useCallback(async (mode, waveType, parameters) => {
    const configFrame = SerialProtocol.createConfigFrame(mode, waveType, parameters);
    return await sendData(configFrame);
  }, [sendData]);

  // Funciones de conveniencia para comandos comunes
  const startSystem = useCallback(async () => {
    return await sendData(SerialProtocol.createStartFrame());
  }, [sendData]);

  const stopSystem = useCallback(async () => {
    return await sendData(SerialProtocol.createStopFrame());
  }, [sendData]);

  const resetSystem = useCallback(async () => {
    return await sendData(SerialProtocol.createResetFrame());
  }, [sendData]);

  // Limpieza al desmontar
  useEffect(() => {
    return () => {
      if (isConnected) {
        disconnect();
      }
    };
  }, []);

  return {
    // Estado de conexión
    isConnected,
    connectionStatus,
    
    // Funciones de conexión
    connect,
    disconnect,
    
    // Funciones de envío
    sendData,
    sendCommand,
    sendConfiguration,
    startSystem,
    stopSystem,
    resetSystem,
    
    // Funciones para registrar callbacks
    onSensorData,
    onStatusMessage,
    onErrorMessage,
    onAckMessage,
    onConfigConfirm,
    onDebugMessage,
    onUnknownMessage,
    
    // Acceso directo a la cola de mensajes si es necesario
    messageQueue: messageQueue.current,
    
    // Funciones adicionales
    getAvailablePorts,
    requestPort
  };
};
