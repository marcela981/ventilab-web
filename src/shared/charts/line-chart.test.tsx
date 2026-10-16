/*
* Funcionalidad: LineChart tests
* Descripción: Covers the shared LineChart with a mocked lazy loader: the visually hidden fallback table carries the
*   title, the category and dataset headers and the formatted values ("—" when missing); one line chart is created
*   (type line, points kept, gaps not spanned) and destroyed on unmount; a failed load shows the error state with retry.
*   Depends on Vitest and Testing Library. v1.1 (review of 180a0a1): repeated labels render without key warnings, and
*   a new inline `formatValue` does not rebuild the chart while the tooltip uses the latest one.
* Versión: 1.1
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

import { render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { LINE_CHART_COPY, LineChart } from "./line-chart";

type MockConfig = {
  type: string
  data: { labels: string[], datasets: { label: string, data: (number | null)[], spanGaps: boolean }[] }
};

type MockChart = { config: MockConfig, destroy: ReturnType<typeof vi.fn> };

const chartMock = vi.hoisted(() => ({ instances: [] as MockChart[], fail: false }));

vi.mock("./load-line-chart", () => ({
  loadLineChart: () => {
    if (chartMock.fail) {
      return Promise.reject(new Error("offline"));
    }

    class Chart {
      public destroy = vi.fn();
      public config: MockConfig;

      public constructor(_canvas: unknown, config: MockConfig) {
        this.config = config;
        chartMock.instances.push(this as unknown as MockChart);
      }
    }

    return Promise.resolve(Chart);
  },
}));

const LABELS = ["0:00", "0:30", "1:00"];
const DATASETS = [{ label: "SpO2", values: [91, null, 94.5] }];

afterEach(() => {
  chartMock.instances.length = 0;
  chartMock.fail = false;
});

describe("LineChart", () => {
  it("renders an accessible fallback table with the formatted values", () => {
    render(<LineChart title="SpO2 (%)" description="Repetición local" labels={LABELS} datasets={DATASETS} categoryAxisLabel="Tiempo simulado" />);

    expect(screen.getByRole("figure", { name: "SpO2 (%)" })).toBeInTheDocument();

    const table = screen.getByRole("table", { name: "SpO2 (%). Repetición local" });

    expect(within(table).getByRole("columnheader", { name: "Tiempo simulado" })).toBeInTheDocument();
    expect(within(table).getByRole("columnheader", { name: "SpO2" })).toBeInTheDocument();
    expect(within(table).getByRole("rowheader", { name: "1:00" })).toBeInTheDocument();
    expect(within(table).getByRole("cell", { name: "94,5" })).toBeInTheDocument();
    expect(within(table).getByRole("cell", { name: "—" })).toBeInTheDocument();
  });

  it("creates one line chart and destroys it on unmount", async() => {
    const { unmount } = render(<LineChart title="SpO2 (%)" labels={LABELS} datasets={DATASETS} />);

    await waitFor(() => expect(chartMock.instances).toHaveLength(1));

    const [chart] = chartMock.instances;

    expect(chart?.config.type).toBe("line");
    expect(chart?.config.data.labels).toEqual(LABELS);
    expect(chart?.config.data.datasets[0]).toMatchObject({ label: "SpO2", data: [91, null, 94.5], spanGaps: false });

    unmount();

    expect(chart?.destroy).toHaveBeenCalledTimes(1);
  });

  it("shows the error state when Chart.js cannot be loaded", async() => {
    chartMock.fail = true;
    render(<LineChart title="SpO2 (%)" labels={LABELS} datasets={DATASETS} />);

    expect(await screen.findByText(LINE_CHART_COPY.errorTitle)).toBeInTheDocument();
  });

  it("renders repeated labels and dataset names without React key warnings", () => {
    const errors = vi.spyOn(console, "error").mockImplementation(() => undefined);

    try {
      render(<LineChart title="Vt" labels={["0:00", "0:00"]} datasets={[{ label: "Vt", values: [1, 2] }, { label: "Vt", values: [3, 4] }]} />);

      expect(screen.getAllByRole("rowheader", { name: "0:00" })).toHaveLength(2);
      expect(errors.mock.calls.some((call) => String(call[0]).includes("same key"))).toBe(false);
    } finally {
      errors.mockRestore();
    }
  });

  it("does not rebuild the chart for a new formatValue function and uses the latest one", async() => {
    const { rerender } = render(<LineChart title="SpO2 (%)" labels={LABELS} datasets={DATASETS} formatValue={(value) => `${value} a`} />);

    await waitFor(() => expect(chartMock.instances).toHaveLength(1));
    rerender(<LineChart title="SpO2 (%)" labels={LABELS} datasets={DATASETS} formatValue={(value) => `${value} b`} />);

    const config = chartMock.instances[0]?.config as unknown as {
      options: { scales: { y: { ticks: { callback: (value: number) => string } } } }
    };

    expect(chartMock.instances).toHaveLength(1);
    expect(config.options.scales.y.ticks.callback(5)).toBe("5 b");
  });
});
