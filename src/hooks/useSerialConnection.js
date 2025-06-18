import { useState, useEffect, useCallback } from 'react';

export const useSerialConnection = () => {
  const [port, setPort] = useState(null);
  const [isConnected, setIsConnected] = useState(false);
  const [reader, setReader] = useState(null);
  const [writer, setWriter] = useState(null);

  const connect = useCallback(async (portName, baudRate = 9600) => {
    try {
      // Solicitar puerto serial usando Web Serial API
      const selectedPort = await navigator.serial.requestPort();
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

      return true;
    } catch (error) {
      console.error('Error conectando:', error);
      return false;
    }
  }, []);

  const disconnect = useCallback(async () => {
    if (reader) reader.releaseLock();
    if (writer) writer.releaseLock();
    if (port) await port.close();
    
    setPort(null);
    setReader(null);
    setWriter(null);
    setIsConnected(false);
  }, [port, reader, writer]);

  const sendData = useCallback(async (data) => {
    if (writer && isConnected) {
      const message = data + '\n';
      await writer.write(message);
      console.log('Enviado:', message);
    }
  }, [writer, isConnected]);

  const readData = useCallback(async (onDataReceived) => {
    if (!reader || !isConnected) return;

    try {
      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        
        const lines = value.split('\n');
        for (const line of lines) {
          if (line.trim()) {
            onDataReceived(line.trim());
          }
        }
      }
    } catch (error) {
      console.error('Error leyendo datos:', error);
    }
  }, [reader, isConnected]);

  return {
    isConnected,
    connect,
    disconnect,
    sendData,
    readData
  };
};
