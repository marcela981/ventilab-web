// Funciones para calcular valores en tiempo real usando datos filtrados
const getMax = arr => arr.length ? Math.max(...arr).toFixed(1) : '--';
const getMin = arr => arr.length ? Math.min(...arr).toFixed(1) : '--';
const getAvg = arr => arr.length ? (arr.reduce((a, b) => a + b, 0) / arr.length).toFixed(1) : '--';
const getLast = arr => arr.length ? arr[arr.length - 1].toFixed(1) : '--';

export const buildCardData = (state, ventilatorData, integratedVolume, resetIntegratedVolume) => {
  const cardDataMap = {
    presionPico: {
      label: 'Presión Pico',
      // En modo presión: mostrar valor configurado (PIP), en modo volumen: mostrar valor medido
      value: state.ventilationMode === 'pressure'
        ? (ventilatorData.presionMax || 20).toFixed(1)
        : (state.filteredData.pressure.max > 0 ? state.filteredData.pressure.max.toFixed(1) : getMax(state.displayData.pressure)),
      unit: 'cmH₂O',
      rawValue: state.ventilationMode === 'pressure'
        ? (ventilatorData.presionMax || 20)
        : (state.filteredData.pressure.max || parseFloat(getMax(state.displayData.pressure)) || 0),
      isConfigured: state.ventilationMode === 'pressure'
    },
    presionMedia: {
      label: 'Presión Media',
      // Siempre mostrar valor medido
      value: state.filteredData.pressure.avg > 0 ? state.filteredData.pressure.avg.toFixed(1) : getAvg(state.displayData.pressure),
      unit: 'cmH₂O',
      rawValue: state.filteredData.pressure.avg || parseFloat(getAvg(state.displayData.pressure)) || 0,
      isConfigured: false
    },
    peep: {
      label: 'PEEP',
      // Siempre mostrar valor configurado
      value: (ventilatorData.peep || 5).toFixed(1),
      unit: 'cmH₂O',
      rawValue: ventilatorData.peep || 5,
      isConfigured: true
    },
    flujoMax: {
      label: 'Flujo Max',
      // Mostrar Q Max calculado si está disponible, sino valor medido
      value: ventilatorData.qMax ? ventilatorData.qMax.toFixed(1) : (state.filteredData.flow.max > 0 ? state.filteredData.flow.max.toFixed(1) : getMax(state.displayData.flow)),
      unit: 'L/min',
      rawValue: ventilatorData.qMax || state.filteredData.flow.max || parseFloat(getMax(state.displayData.flow)) || 0,
      isConfigured: !!ventilatorData.qMax
    },
    flujo: {
      label: 'Flujo',
      // Siempre mostrar valor medido en tiempo real
      value: state.filteredData.flow.filtered > 0 ? state.filteredData.flow.filtered.toFixed(1) : getLast(state.displayData.flow),
      unit: 'L/min',
      rawValue: state.filteredData.flow.filtered || parseFloat(getLast(state.displayData.flow)) || 0,
      isConfigured: false
    },
    flujoMin: {
      label: 'Flujo Min',
      // Siempre mostrar valor medido
      value: state.filteredData.flow.min > 0 ? state.filteredData.flow.min.toFixed(1) : getMin(state.displayData.flow),
      unit: 'L/min',
      rawValue: state.filteredData.flow.min || parseFloat(getMin(state.displayData.flow)) || 0,
      isConfigured: false
    },
    volMax: {
      label: 'Vol Max',
      // Siempre mostrar valor medido
      value: state.filteredData.volume.max > 0 ? state.filteredData.volume.max.toFixed(1) : getMax(state.displayData.volume),
      unit: 'mL',
      rawValue: state.filteredData.volume.max || parseFloat(getMax(state.displayData.volume)) || 0,
      isConfigured: false
    },
    volumen: {
      label: 'Volumen',
      // En modo volumen: mostrar valor configurado, en modo presión: mostrar valor medido/calculado
      value: state.ventilationMode === 'volume'
        ? (ventilatorData.volumen || 500).toFixed(0)
        : (state.filteredData.volume.filtered > 0 ? state.filteredData.volume.filtered.toFixed(1) : getLast(state.displayData.volume)),
      unit: 'mL',
      rawValue: state.ventilationMode === 'volume'
        ? (ventilatorData.volumen || 500)
        : (state.filteredData.volume.filtered || parseFloat(getLast(state.displayData.volume)) || 0),
      isConfigured: state.ventilationMode === 'volume'
    },
    volumenIntegrado: {
      label: 'Vol Integrado',
      // Mostrar volumen integrado calculado
      value: integratedVolume.toFixed(1),
      unit: 'mL',
      rawValue: integratedVolume,
      onReset: resetIntegratedVolume,
      isConfigured: false
    },
    compliance: {
      label: 'Compliance',
      // Mostrar compliance calculada
      value: state.complianceData.compliance.toFixed(5),
      unit: 'L/cmH₂O',
      rawValue: state.complianceData.compliance,
      status: state.complianceData.calculationStatus,
      errors: state.errorDetection.errors,
      isConfigured: false
    },
    presionMeseta: {
      label: 'Presión Meseta',
      // Mostrar presión de plateau calculada o medida
      value: ventilatorData.presionTanque ? ventilatorData.presionTanque.toFixed(1) : '--',
      unit: 'cmH₂O',
      rawValue: ventilatorData.presionTanque || 0,
      isConfigured: !!ventilatorData.presionTanque
    },
    presionPlaton: {
      label: 'Presión Platón',
      // Placeholder para presión plateau cuando esté implementado
      value: '--',
      unit: 'cmH₂O',
      rawValue: 0,
      isConfigured: false
    },
  };

  return state.cardConfig
    .filter(card => {
      if (state.isAdjustMode) return true;
      if (!card.visible) return false;
      if (card.id === 'compliance' && state.ventilationMode !== 'pressure') return false;
      return true;
    })
    .sort((a, b) => a.order - b.order)
    .map(card => ({
      ...cardDataMap[card.id],
      id: card.id,
      config: card,
    }));
};
