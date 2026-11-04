/*
 * Bloque 5 proposal mockups: draws static waveform polylines into <svg data-ch="pressure|flow|volume">.
 * Colours come from --vl-console-curve-* (July: #ef5350 / #42a5f5 / #66bb6a). Not the app's sweep painter.
 */
(function () {
  const CH = {
    pressure: { min: 0, max: 30, ticks: [0, 10, 20, 30], color: "--vl-console-curve-pressure",
      f: (t) => { const c = t % 4.29; return c < 1.43 ? 5 + 17 * Math.min(1, c / 0.35) - (c > 1.1 ? 4 : 0) : 5 + 3 * Math.exp(-(c - 1.43) * 5); } },
    flow: { min: -60, max: 60, ticks: [-60, -30, 0, 30, 60], color: "--vl-console-curve-flow",
      f: (t) => { const c = t % 4.29; return c < 1.43 ? 48 * Math.sin(Math.PI * Math.min(1, c / 1.43)) : -52 * Math.exp(-(c - 1.43) * 2.2); } },
    volume: { min: 0, max: 600, ticks: [0, 200, 400, 600], color: "--vl-console-curve-volume",
      f: (t) => { const c = t % 4.29; return c < 1.43 ? 448 * (1 - Math.cos(Math.PI * c / 1.43)) / 2 : 448 * Math.exp(-(c - 1.43) * 2.2); } },
  };
  const css = (n) => getComputedStyle(document.documentElement).getPropertyValue(n).trim();

  function draw(svg) {
    const ch = CH[svg.dataset.ch];
    const { width: W, height: H } = svg.getBoundingClientRect();
    if (!W || !H) return;
    const L = 30, B = 14, T = 4, seconds = 10;
    const y = (v) => T + (H - T - B) * (1 - (v - ch.min) / (ch.max - ch.min));
    const x = (s) => L + (W - L - 4) * (s / seconds);
    const grid = ch.ticks.map((v) => `<line x1="${L}" x2="${W - 4}" y1="${y(v)}" y2="${y(v)}" stroke="${css("--vl-console-grid")}"/>
      <text x="${L - 4}" y="${y(v) + 3}" text-anchor="end" font-size="9" fill="${css("--vl-console-tick")}">${v}</text>`).join("");
    const xt = [0, 2, 4, 6, 8, 10].map((s) => `<text x="${x(s)}" y="${H - 2}" text-anchor="middle" font-size="9" fill="${css("--vl-console-tick")}">${s + 16}</text>`).join("");
    const sweep = 7.2; // sweep head (s): erase gap after it
    const pts = (a, b) => { const p = []; for (let s = a; s <= b; s += 0.02) p.push(`${x(s).toFixed(1)},${y(ch.f(s + (s > sweep ? -10 : 0) + 20)).toFixed(1)}`); return p.join(" "); };
    const color = css(ch.color);
    const base = y(Math.max(ch.min, 0));
    const area = (a, b) => `${x(a)},${base} ${pts(a, b)} ${x(b)},${base}`;
    svg.setAttribute("viewBox", `0 0 ${W} ${H}`);
    svg.innerHTML = `${grid}${xt}
      <polygon points="${area(0, sweep)}" fill="${color}" fill-opacity="0.15"/>
      <polygon points="${area(sweep + 0.35, 10)}" fill="${color}" fill-opacity="0.15"/>
      <polyline points="${pts(0, sweep)}" fill="none" stroke="${color}" stroke-width="1.6"/>
      <polyline points="${pts(sweep + 0.35, 10)}" fill="none" stroke="${color}" stroke-width="1.6"/>`;
  }

  window.addEventListener("load", () => document.querySelectorAll("svg[data-ch]").forEach(draw));
})();
