/*
* Funcionalidad: BarChart tests
* Descripción: Covers the shared BarChart with a mocked lazy loader: the visually hidden fallback table carries the title, the category and dataset headers and the formatted values ("—" when missing); one chart is created with the bar config (horizontal index axis, colors from the palette) and destroyed on unmount; a failed load shows the error state. Depends on Vitest and Testing Library.
* Versión: 1.0
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

import { render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { BAR_CHART_COPY, BarChart } from "./bar-chart";

type MockConfig = {
  data: { labels: string[], datasets: { label: string, data: (number | null)[] }[] }
  options: { indexAxis: string }
};

type MockChart = { config: MockConfig, destroy: ReturnType<typeof vi.fn> };

const chartMock = vi.hoisted(() => ({ instances: [] as MockChart[], fail: false }));

vi.mock("./load-bar-chart", () => ({
  loadBarChart: () => {
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

const LABELS = ["0,0–0,5", "0,5–1,0"];
const DATASETS = [{ label: "Intentos", values: [2, null] }];
const percent = (value: number) => `${Math.round(value * 100)} %`;

afterEach(() => {
  chartMock.instances.length = 0;
  chartMock.fail = false;
});

describe("BarChart", () => {
  it("renders an accessible fallback table with the formatted values", () => {
    render(
      <BarChart
        title="Distribución de notas"
        description="Intentos calificados por rango"
        labels={LABELS}
        datasets={DATASETS}
        categoryAxisLabel="Nota"
        formatValue={percent}
      />,
    );

    expect(screen.getByRole("figure", { name: "Distribución de notas" })).toBeInTheDocument();

    const table = screen.getByRole("table", { name: "Distribución de notas. Intentos calificados por rango" });

    expect(within(table).getByRole("columnheader", { name: "Nota" })).toBeInTheDocument();
    expect(within(table).getByRole("columnheader", { name: "Intentos" })).toBeInTheDocument();
    expect(within(table).getByRole("rowheader", { name: "0,0–0,5" })).toBeInTheDocument();
    expect(within(table).getByRole("cell", { name: "200 %" })).toBeInTheDocument();
    expect(within(table).getByRole("cell", { name: "—" })).toBeInTheDocument();
  });

  it("creates one bar chart and destroys it on unmount", async() => {
    const { unmount } = render(<BarChart title="Dificultad" labels={LABELS} datasets={DATASETS} horizontal />);

    await waitFor(() => expect(chartMock.instances).toHaveLength(1));
    expect(screen.queryByText(BAR_CHART_COPY.loading)).not.toBeInTheDocument();

    const [chart] = chartMock.instances;

    expect(chart?.config.data.labels).toEqual(LABELS);
    expect(chart?.config.data.datasets[0]?.data).toEqual([2, null]);
    expect(chart?.config.options.indexAxis).toBe("y");

    unmount();

    expect(chart?.destroy).toHaveBeenCalledTimes(1);
  });

  it("shows the error state when Chart.js cannot be loaded", async() => {
    chartMock.fail = true;
    render(<BarChart title="Dificultad" labels={LABELS} datasets={DATASETS} />);

    expect(await screen.findByText(BAR_CHART_COPY.errorTitle)).toBeInTheDocument();
  });
});
