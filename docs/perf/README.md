<!--
* Funcionalidad: Front performance results (index)
* Descripción: Where the manual performance runs of the ventilator lab are stored (latency p95 at 60 msg/s × 5 min, fps, memory, long recording playback) and how each result file is named. The protocol is docs/hardware-test-protocol.md section C. No result exists yet.
* Versión: 1.0
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
-->

# Front performance results (`/lab`)

Status: **empty — every run is pending** (they need a browser, the backend and the real or fake device; none was
available when the feature was built). Do not add estimated or simulated numbers: only measured runs.

Protocol: [`../hardware-test-protocol.md`](../hardware-test-protocol.md), section C (and A7 for the latency with the
real device). The backend's own measurements live in `ventylab-server/docs/perf/`.

## Files

One Markdown file per run, named `<YYYY-MM-DD>-<run>.md` (for example `2026-11-03-c1-latency-fake.md`), using the
results template at the end of the protocol. Raw exports (DevTools Performance traces, heap snapshots, the backend
`metrics.csv` of the same window) go next to it in `raw/` with the same date prefix.

| Run | Target | Result file | Status |
| --- | --- | --- | --- |
| C1 Latency, 60 msg/s × 5 min | session p95 < 100 ms | — | pending |
| C2 Frame rate, 5 min | median ≥ 30 fps | — | pending |
| C3 Memory, 5 min | stable heap | — | pending |
| C4 Long recording playback | responsive page | — | pending |
| A7 Latency with the real device | session p95 < 100 ms | — | pending |
