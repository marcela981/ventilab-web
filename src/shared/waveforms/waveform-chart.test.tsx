/*
* Funcionalidad: WaveformChart tests
* Descripción: Covers the pure series-to-dataset mapping (time window, colors, labels, y-range) and the chart lifecycle of WaveformChart with a mocked Chart.js: one chart per mount, live appends update the same instance, destroy on unmount. Depends on Vitest and Testing Library.
* Versión: 1.0
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

import { render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { resolveTimeRange, sliceToWindow, toChartDatasets } from "./waveform-data";
import type { WaveformSeries } from "./waveform.entity";
import { WaveformChart } from "./waveform-chart";

type MockChart = {
  config: { data: { datasets: { data: unknown[] }[] }, options: { scales: Record<string, { min?: number, max?: number }> } }
  data: { datasets: { data: unknown[] }[] }
  options: { scales: Record<string, { min?: number, max?: number }> }
  update: ReturnType<typeof vi.fn>
  destroy: ReturnType<typeof vi.fn>
};

const chartMock = vi.hoisted(() => ({ instances: [] as MockChart[], register: vi.fn() }));

vi.mock("chart.js", () => {
  class Chart {
    public static register = chartMock.register;

    public data: MockChart["data"];
    public options: MockChart["options"];
    public update = vi.fn();
    public destroy = vi.fn();

    public constructor(_canvas: unknown, config: MockChart["config"]) {
      this.data = config.data;
      this.options = config.options;
      chartMock.instances.push(this as unknown as MockChart);
    }
  }

  return {
    Chart,
    Decimation: { id: "decimation" },
    Legend: { id: "legend" },
    LinearScale: { id: "linear" },
    LineController: { id: "line" },
    LineElement: { id: "lineElement" },
    PointElement: { id: "point" },
    Tooltip: { id: "tooltip" },
  };
});

const COLORS = { primary: "c-primary", secondary: "c-secondary", error: "c-error", info: "c-info", success: "c-success", warning: "c-warning" };

function pressure(points: [number, number][]): WaveformSeries {
  return { key: "pressure", label: "Presión", unit: "cmH2O", points: points.map(([t, v]) => ({ t, v })) };
}

afterEach(() => {
  chartMock.instances.length = 0;
  chartMock.register.mockClear();
});

describe("waveform data mapping", () => {
  it("keeps only the points inside the time window ending at the last sample", () => {
    const points = [0, 1, 2, 3, 4, 5].map((t) => ({ t, v: t * 10 }));

    expect(sliceToWindow(points, 2)).toEqual([{ t: 3, v: 30 }, { t: 4, v: 40 }, { t: 5, v: 50 }]);
    expect(sliceToWindow([], 2)).toEqual([]);
  });

  it("maps series to labeled, colored {x,y} datasets", () => {
    const flow: WaveformSeries = { key: "flow", label: "Flujo", unit: "L/min", points: [{ t: 0, v: 1 }] };
    const custom: WaveformSeries = { key: "x", label: "Otra", unit: "u", tone: "warning", points: [] };
    const datasets = toChartDatasets([pressure([[0, 5], [1, 7]]), flow, custom], 10, COLORS);

    expect(datasets).toEqual([
      expect.objectContaining({ label: "Presión (cmH2O)", data: [{ x: 0, y: 5 }, { x: 1, y: 7 }], borderColor: "c-error" }),
      expect.objectContaining({ label: "Flujo (L/min)", data: [{ x: 0, y: 1 }], borderColor: "c-info" }),
      expect.objectContaining({ label: "Otra (u)", data: [], borderColor: "c-warning" }),
    ]);
  });

  it("resolves the visible time range from the latest sample", () => {
    expect(resolveTimeRange([pressure([[0, 1], [12, 1]])], 10)).toEqual({ min: 2, max: 12 });
    expect(resolveTimeRange([pressure([[1, 1]])], 10)).toEqual({ min: 0, max: 10 });
    expect(resolveTimeRange([], 10)).toEqual({ min: 0, max: 10 });
  });
});

describe("WaveformChart", () => {
  it("creates one chart lazily and updates it in place on appends", async() => {
    const { rerender, unmount } = render(
      <WaveformChart series={[pressure([[0, 5]])]} windowSeconds={10} yRange={{ min: 0, max: 40 }} />,
    );

    expect(screen.getByRole("img", { name: "Curva de Presión (cmH2O)" })).toBeInTheDocument();
    await waitFor(() => {
      expect(chartMock.instances).toHaveLength(1);
    });

    const chart = chartMock.instances[0];

    expect(chartMock.register).toHaveBeenCalled();
    expect(chart?.options.scales["y"]).toMatchObject({ min: 0, max: 40 });

    rerender(<WaveformChart series={[pressure([[0, 5], [1, 6]])]} windowSeconds={10} yRange={{ min: 0, max: 40 }} />);
    rerender(<WaveformChart series={[pressure([[0, 5], [1, 6], [11, 8]])]} windowSeconds={10} yRange={{ min: 0, max: 40 }} />);

    expect(chartMock.instances).toHaveLength(1);
    expect(chart?.data.datasets[0]?.data).toEqual([{ x: 1, y: 6 }, { x: 11, y: 8 }]);
    expect(chart?.options.scales["x"]).toMatchObject({ min: 1, max: 11 });
    expect(chart?.update).toHaveBeenLastCalledWith("none");

    unmount();

    expect(chart?.destroy).toHaveBeenCalledTimes(1);
  });
});
