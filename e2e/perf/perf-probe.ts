/*
* Funcionalidad: In-page performance probe
* Descripción: Instrumentation injected with page.addInitScript before any app script runs, so it also works on a production build. It installs (1) a buffered PerformanceObserver for `longtask`, (2) a requestAnimationFrame counter that records every frame interval, (3) a paint counter per <canvas> that wraps the CanvasRenderingContext2D drawing methods and counts the distinct animation frames in which each canvas was drawn (the curve redraw rate), and (4) a React commit counter through a stub of window.__REACT_DEVTOOLS_GLOBAL_HOOK__ (React calls onCommitFiberRoot once per commit in development and production builds). `reset()` opens a measurement window and `snapshot()` returns the metrics of that window. The function must stay self-contained: Playwright serializes it. Depends on browser APIs only.
* Versión: 0.1
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

export type CanvasPaintStats = {
  label: string
  width: number
  height: number
  connected: boolean
  paintFrames: number
  paintFps: number
  drawCalls: number
};

export type PerfProbeSnapshot = {
  windowMs: number
  raf: { frames: number, fps: number, p50FrameMs: number, p95FrameMs: number, maxFrameMs: number, framesOver50Ms: number }
  longTasks: { count: number, totalMs: number, maxMs: number, supported: boolean }
  react: { hookAttached: boolean, bundleType: number | null, commits: number, commitsPerSecond: number, maxCommitsInOneSecond: number }
  canvases: CanvasPaintStats[]
  heapUsedMb: number | null
};

export type PerfProbe = {
  reset: () => void
  snapshot: () => PerfProbeSnapshot
};

export type PerfProbeWindow = Window & { __perfProbe?: PerfProbe };

/** Runs inside the page (serialized by Playwright): no imports, no closures over module scope. */
export function installPerfProbe(): void {
  type CanvasEntry = { canvas: HTMLCanvasElement, lastFrame: number, paintFrames: number, drawCalls: number };
  type HookRenderer = { bundleType?: number };
  type DevtoolsHook = {
    renderers: Map<number, HookRenderer>
    supportsFiber: boolean
    isDisabled?: boolean
    inject: (renderer: HookRenderer) => number
    onCommitFiberRoot: (...args: unknown[]) => void
    [key: string]: unknown
  };

  const target = window as Window & { __perfProbe?: PerfProbe, __REACT_DEVTOOLS_GLOBAL_HOOK__?: DevtoolsHook };

  if (target.__perfProbe) {
    return;
  }

  let windowStart = performance.now();
  let frameId = 0;
  let frameIntervals: number[] = [];
  let lastFrameAt = -1;
  let commitTimes: number[] = [];
  const longTasks: { start: number, duration: number }[] = [];
  const canvases = new Map<HTMLCanvasElement, CanvasEntry>();
  let longTaskSupported = false;

  // (1) Long tasks (buffered: also the ones before the observer was attached).
  try {
    const observer = new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        longTasks.push({ start: entry.startTime, duration: entry.duration });
      }
    });

    observer.observe({ type: "longtask", buffered: true });
    longTaskSupported = true;
  } catch {
    longTaskSupported = false;
  }

  // (2) rAF counter.
  const onFrame = (now: number): void => {
    frameId += 1;

    if (lastFrameAt >= 0) {
      frameIntervals.push(now - lastFrameAt);
    }

    lastFrameAt = now;
    requestAnimationFrame(onFrame);
  };

  requestAnimationFrame(onFrame);

  // (3) Canvas paint counter.
  const proto = CanvasRenderingContext2D.prototype as unknown as Record<string, unknown>;
  const drawMethods = ["clearRect", "fillRect", "strokeRect", "stroke", "fill", "drawImage", "putImageData", "fillText", "strokeText"];

  for (const name of drawMethods) {
    const original = proto[name];

    if (typeof original !== "function") {
      continue;
    }

    proto[name] = function patched(this: CanvasRenderingContext2D, ...args: unknown[]): unknown {
      const canvas = this.canvas;
      let entry = canvases.get(canvas);

      if (!entry) {
        entry = { canvas, lastFrame: -1, paintFrames: 0, drawCalls: 0 };
        canvases.set(canvas, entry);
      }

      entry.drawCalls += 1;

      if (entry.lastFrame !== frameId) {
        entry.lastFrame = frameId;
        entry.paintFrames += 1;
      }

      return (original as (...a: unknown[]) => unknown).apply(this, args);
    };
  }

  // (4) React commit counter through the DevTools hook (stub when DevTools is not installed).
  let hookAttached = false;
  let bundleType: number | null = null;
  const existing = target.__REACT_DEVTOOLS_GLOBAL_HOOK__;
  const hook: DevtoolsHook = existing ?? {
    renderers: new Map<number, HookRenderer>(),
    supportsFiber: true,
    inject(renderer: HookRenderer): number {
      const id = this.renderers.size + 1;

      this.renderers.set(id, renderer);

      return id;
    },
    checkDCE(): void {},
    onScheduleFiberRoot(): void {},
    onCommitFiberRoot(): void {},
    onCommitFiberUnmount(): void {},
    onPostCommitFiberRoot(): void {},
    setStrictMode(): void {},
  };
  const originalInject = hook.inject.bind(hook);
  const originalCommit = hook.onCommitFiberRoot.bind(hook);

  hook.inject = (renderer: HookRenderer): number => {
    hookAttached = true;
    bundleType = typeof renderer.bundleType === "number" ? renderer.bundleType : null;

    return originalInject(renderer);
  };
  hook.onCommitFiberRoot = (...args: unknown[]): void => {
    commitTimes.push(performance.now());
    originalCommit(...args);
  };
  target.__REACT_DEVTOOLS_GLOBAL_HOOK__ = hook;

  const percentile = (values: number[], p: number): number => {
    if (values.length === 0) {
      return 0;
    }

    const sorted = [...values].sort((a, b) => a - b);
    const index = Math.min(sorted.length - 1, Math.max(0, Math.ceil((p / 100) * sorted.length) - 1));

    return sorted[index] ?? 0;
  };
  const round = (value: number, digits = 2): number => Number(value.toFixed(digits));

  target.__perfProbe = {
    reset(): void {
      windowStart = performance.now();
      frameIntervals = [];
      lastFrameAt = -1;
      commitTimes = [];

      for (const entry of canvases.values()) {
        entry.paintFrames = 0;
        entry.drawCalls = 0;
        entry.lastFrame = -1;
      }
    },
    snapshot(): PerfProbeSnapshot {
      const now = performance.now();
      const windowMs = now - windowStart;
      const seconds = windowMs / 1000;
      const tasks = longTasks.filter((task) => task.start >= windowStart);
      const buckets = new Map<number, number>();

      for (const time of commitTimes) {
        const bucket = Math.floor((time - windowStart) / 1000);

        buckets.set(bucket, (buckets.get(bucket) ?? 0) + 1);
      }

      const memory = (performance as Performance & { memory?: { usedJSHeapSize: number } }).memory;

      return {
        windowMs: round(windowMs, 0),
        raf: {
          frames: frameIntervals.length,
          fps: round(frameIntervals.length / seconds),
          p50FrameMs: round(percentile(frameIntervals, 50)),
          p95FrameMs: round(percentile(frameIntervals, 95)),
          maxFrameMs: round(Math.max(0, ...frameIntervals)),
          framesOver50Ms: frameIntervals.filter((interval) => interval > 50).length,
        },
        longTasks: {
          count: tasks.length,
          totalMs: round(tasks.reduce((sum, task) => sum + task.duration, 0), 0),
          maxMs: round(Math.max(0, ...tasks.map((task) => task.duration)), 0),
          supported: longTaskSupported,
        },
        react: {
          hookAttached,
          bundleType,
          commits: commitTimes.length,
          commitsPerSecond: round(commitTimes.length / seconds),
          maxCommitsInOneSecond: Math.max(0, ...buckets.values()),
        },
        canvases: [...canvases.values()]
          .filter((entry) => entry.drawCalls > 0)
          .map((entry) => ({
            label: entry.canvas.getAttribute("aria-label")
              ?? entry.canvas.closest("[aria-label]")?.getAttribute("aria-label")
              ?? "(sin etiqueta)",
            width: entry.canvas.width,
            height: entry.canvas.height,
            connected: entry.canvas.isConnected,
            paintFrames: entry.paintFrames,
            paintFps: round(entry.paintFrames / seconds),
            drawCalls: entry.drawCalls,
          })),
        heapUsedMb: memory ? round(memory.usedJSHeapSize / 1048576, 1) : null,
      };
    },
  };
}
