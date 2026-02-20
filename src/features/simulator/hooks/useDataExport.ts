import { useState, useCallback } from 'react';
import { PARAMETER_UNITS } from '../constants/ventilator-limits';
import type { VentilatorData, VentilationMode } from '../simulator.types';

interface SentConfigData {
  mode: VentilationMode;
  timestamp: number;
  parameters: VentilatorData;
  configFrame: string;
}

interface DataRecordingHook {
  isRecording: boolean;
  hasData: boolean;
  recordedData: unknown[];
  startRecording: () => void;
  stopRecording: () => void;
  addSentData: (mode: VentilationMode, data: VentilatorData, frame: string) => void;
  downloadAsTxt: () => void;
  downloadAsPdf: () => void;
}

/**
 * Hook for managing data export: download menu, recording controls, config downloads.
 */
export const useDataExport = (dataRecording: DataRecordingHook, notify: (type: 'success' | 'warning' | 'error', msg: string) => void) => {
  const [downloadMenuAnchor, setDownloadMenuAnchor] = useState<HTMLElement | null>(null);
  const [lastSentConfigData, setLastSentConfigData] = useState<SentConfigData | null>(null);

  const handleDownloadMenuOpen = useCallback((event: React.MouseEvent<HTMLElement>) => {
    setDownloadMenuAnchor(event.currentTarget);
  }, []);

  const handleDownloadMenuClose = useCallback(() => {
    setDownloadMenuAnchor(null);
  }, []);

  const handleDownloadTxt = useCallback(() => {
    dataRecording.downloadAsTxt();
    notify('success', 'Configuraciones enviadas descargadas como TXT');
    handleDownloadMenuClose();
  }, [dataRecording, notify, handleDownloadMenuClose]);

  const handleDownloadPdf = useCallback(() => {
    dataRecording.downloadAsPdf();
    notify('success', 'Configuraciones enviadas descargadas como PDF');
    handleDownloadMenuClose();
  }, [dataRecording, notify, handleDownloadMenuClose]);

  const handleToggleRecording = useCallback(() => {
    if (dataRecording.isRecording) {
      dataRecording.stopRecording();
      dataRecording.downloadAsTxt();
      notify('success', 'Grabación detenida y datos guardados automáticamente');
    } else {
      dataRecording.startRecording();
      notify('success', 'Grabación iniciada - Se guardará con cada envío');
    }
  }, [dataRecording, notify]);

  const downloadSentConfigData = useCallback(() => {
    if (!lastSentConfigData) return;

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `configuracion_enviada_${timestamp}.txt`;
    const { mode, parameters } = lastSentConfigData;

    let content = `Configuración enviada al Ventilador - VentyLab\n`;
    content += `Fecha: ${new Date().toLocaleString()}\n`;
    content += `Modo: ${mode}\n`;
    content += `========================================\n\n`;
    content += `Parámetros:\n`;

    Object.entries(parameters).forEach(([key, value]) => {
      const unit = PARAMETER_UNITS[key] || '';
      content += `  ${key}: ${value} ${unit}\n`;
    });

    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  }, [lastSentConfigData]);

  const recordSentConfig = useCallback(
    (mode: VentilationMode, parameters: VentilatorData, configFrame: string) => {
      setLastSentConfigData({ mode, timestamp: Date.now(), parameters: { ...parameters }, configFrame });
      dataRecording.addSentData(mode, parameters, configFrame);
    },
    [dataRecording],
  );

  return {
    downloadMenuAnchor,
    lastSentConfigData,
    handleDownloadMenuOpen,
    handleDownloadMenuClose,
    handleDownloadTxt,
    handleDownloadPdf,
    handleToggleRecording,
    downloadSentConfigData,
    recordSentConfig,
  };
};
