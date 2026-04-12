import { useMemo, useState, useCallback, useRef, useEffect } from 'react';

import type { VentilatorReading } from '@/contracts/simulator.contracts';

// =============================================================================
// Types
// =============================================================================

export interface ChartDataPoint {
  x: number; // seconds elapsed since session start
  y: number;
}

export interface ChartTimeRange {
  start: number;
  end: number;
  duration: number;
}

interface UseChartCalculationsProps {
  data: VentilatorReading[];
  defaultTimeWindow?: number; // seconds visible in chart
}

interface UseChartCalculationsReturn {
  pressurePoints: ChartDataPoint[];
  flowPoints: ChartDataPoint[];
  volumePoints: ChartDataPoint[];
  pco2Points: ChartDataPoint[];
  timeRange: ChartTimeRange;
  isCalculating: boolean;
  actions: {
    setTimeWindow: (seconds: number) => void;
    zoomIn: () => void;
    zoomOut: () => void;
    resetZoom: () => void;
  };
}

// =============================================================================
// Constants
// =============================================================================

const MIN_WINDOW_S = 2;
const MAX_WINDOW_S = 60;

// =============================================================================
// Hook
// =============================================================================

/**
 * Transforms raw VentilatorReading[] into Chart.js-ready data points.
 * All math lives here; components only render.
 *
 * - Sliding time window: only the last `timeWindow` seconds are visible.
 * - Timestamps are normalized to seconds from session start (t=0).
 * - useMemo ensures recalculation only when data or window changes.
 */
export function useChartCalculations({
  data,
  defaultTimeWindow = 10,
}: UseChartCalculationsProps): UseChartCalculationsReturn {
  const [timeWindow, setTimeWindowState] = useState(defaultTimeWindow);

  // Session start: fixed at the timestamp of the first reading ever received.
  // Stored in a ref so it never triggers re-renders or memo re-evaluations.
  const sessionStartRef = useRef<number | null>(null);

  useEffect(() => {
    if (sessionStartRef.current === null && data.length > 0) {
      sessionStartRef.current = data[0].timestamp;
    }
  }, [data]);

  // Derive a stable start time for memos (null while buffer is empty)
  const startTime: number = sessionStartRef.current ?? Date.now();

  // ---------------------------------------------------------------------------
  // Sliding window filter
  // ---------------------------------------------------------------------------

  const windowedData = useMemo(() => {
    if (data.length === 0) return [];
    const windowStart = data[data.length - 1].timestamp - timeWindow * 1000;
    return data.filter((d) => d.timestamp >= windowStart);
  }, [data, timeWindow]);

  // ---------------------------------------------------------------------------
  // Chart point arrays (one memo per series to avoid unnecessary work)
  // ---------------------------------------------------------------------------

  const pressurePoints = useMemo(
    () =>
      windowedData.map((d) => ({
        x: (d.timestamp - startTime) / 1000,
        y: d.pressure,
      })),
    [windowedData, startTime]
  );

  const flowPoints = useMemo(
    () =>
      windowedData.map((d) => ({
        x: (d.timestamp - startTime) / 1000,
        y: d.flow,
      })),
    [windowedData, startTime]
  );

  const volumePoints = useMemo(
    () =>
      windowedData.map((d) => ({
        x: (d.timestamp - startTime) / 1000,
        y: d.volume,
      })),
    [windowedData, startTime]
  );

  const pco2Points = useMemo(
    () =>
      windowedData
        .filter((d): d is VentilatorReading & { pco2: number } =>
          d.pco2 !== undefined
        )
        .map((d) => ({
          x: (d.timestamp - startTime) / 1000,
          y: d.pco2,
        })),
    [windowedData, startTime]
  );

  // ---------------------------------------------------------------------------
  // Time range (for x-axis domain)
  // ---------------------------------------------------------------------------

  const timeRange = useMemo<ChartTimeRange>(() => {
    if (windowedData.length === 0) {
      return { start: 0, end: timeWindow, duration: timeWindow };
    }
    const start = (windowedData[0].timestamp - startTime) / 1000;
    const end = (windowedData[windowedData.length - 1].timestamp - startTime) / 1000;
    return { start, end, duration: end - start };
  }, [windowedData, startTime, timeWindow]);

  // ---------------------------------------------------------------------------
  // Actions
  // ---------------------------------------------------------------------------

  const setTimeWindow = useCallback((seconds: number) => {
    setTimeWindowState(Math.min(MAX_WINDOW_S, Math.max(MIN_WINDOW_S, seconds)));
  }, []);

  const zoomIn = useCallback(() => {
    setTimeWindowState((prev) => Math.max(MIN_WINDOW_S, prev / 2));
  }, []);

  const zoomOut = useCallback(() => {
    setTimeWindowState((prev) => Math.min(MAX_WINDOW_S, prev * 2));
  }, []);

  const resetZoom = useCallback(() => {
    setTimeWindowState(defaultTimeWindow);
  }, [defaultTimeWindow]);

  // ---------------------------------------------------------------------------
  // Return
  // ---------------------------------------------------------------------------

  return {
    pressurePoints,
    flowPoints,
    volumePoints,
    pco2Points,
    timeRange,
    isCalculating: false, // reserved for future async transforms
    actions: { setTimeWindow, zoomIn, zoomOut, resetZoom },
  };
}
