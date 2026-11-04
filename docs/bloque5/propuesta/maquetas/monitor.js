/*
 * Bloque 5 proposal mockups: Monitoreo content (digital or Real) with the July layout.
 * <body data-source="digital|real">, rendered into #monitor.
 * Control order and accessible names follow DISENO_BLOQUE5.md §5.3 (inventory of 66 controls).
 */
(function () {
  const ic = (n, c = "") => window.vlIcon(n, c);
  const LOGO = "../../../../public/images/logo.png";
  const UNIVALLE = "../../../../public/images/logo-univalle.svg";

  const TILES = [
    ["22", "cmH₂O", "Pico (Ppico)"], ["9,4", "cmH₂O", "Media (Pmedia)"], ["5,0", "cmH₂O", "PEEP"],
    ["48", "L/min", "Flujo máx"], ["−52", "L/min", "Flujo mín"], ["448", "mL", "Vol (Vte)"],
    ["18", "cmH₂O", "Pplat"], ["13", "cmH₂O", "ΔP"], ["0,4", "cmH₂O", "Auto-PEEP"], ["6,9", "mL/kg", "Vt/kg PBW"],
    ["6,3", "L/min", "VE"], ["14", "rpm", "FR total"], ["1:2,0", "", "I:E"], ["40", "%", "FiO₂"], ["9,8", "J/min", "Potencia mecánica"],
    ["95", "%", "SpO₂", 1], ["88", "mmHg", "PaO₂", 1], ["41", "mmHg", "PaCO₂", 1], ["7,38", "", "pH", 1], ["82", "mmHg", "PAM", 1],
  ];

  const strip = (real) => real
    ? `<div class="strip" aria-label="Estado del ventilador físico">
        <strong>Ventilador físico</strong>
        <span class="strip-group">Equipo <span class="status-chip"><span class="dot" style="background:var(--vl-color-success)"></span>En línea</span></span>
        <span class="strip-group" data-testid="real-monitor-latency">Latencia <span class="dot" style="background:var(--vl-color-success)"></span><b>42 ms</b> <span class="muted">p95 55 ms</span></span>
        <span class="strip-sep"></span>
        <span class="strip-group" style="color:var(--vl-color-success);font-weight:600">Controlas el equipo</span>
        <button class="sbtn sbtn--cyan">Liberar control</button>
        <span class="strip-sep"></span>
        <button class="sbtn sbtn--primary">${ic("FiberManualRecord")}Grabar sesión</button>
        <span class="strip-end muted wide-only" style="font-size:.75rem">Reserva hasta las 4:00 p. m.</span>
      </div>`
    : `<div class="strip">
        <div class="strip-group" role="group" aria-label="Control del tiempo">${ic("Timer", "ic-sm")}<span>Tiempo simulado <b>03:41</b></span>
          <span class="seg" role="group" aria-label="Velocidad"><button aria-pressed="true">×1</button><button aria-pressed="false">×2</button><button aria-pressed="false">×4</button></span>
          <button class="sbtn">${ic("Pause")}Pausar</button></div>
        <span class="strip-sep"></span>
        <span role="status" class="muted">2 eventos pendientes</span>
        <span class="strip-end"></span>
        <button class="sbtn" aria-expanded="false">${ic("MenuBook")}Mostrar caso clínico</button>
        <button class="sbtn sbtn--danger">${ic("Stop")}Finalizar sesión</button>
      </div>`;

  const left = (real) => `
    <section class="col col-left" aria-label="Valores">
      <div class="logos"><img class="logo-venty" src="${LOGO}" alt="VentyLab"><img class="logo-univalle" src="${UNIVALLE}" alt="Univalle"></div>
      <div><div class="left-label">Modo del monitor</div>
        <span class="seg" role="group" aria-label="Modo del monitor"><button aria-pressed="${!real}">Digital</button><button aria-pressed="${real}">Real</button></span></div>
      <div class="patient" role="status" aria-label="${real ? "Reserva activa" : "Paciente activo"}">${ic("CheckCircle")}${real ? "Reserva activa · Grupo A" : "Paciente: Juan Pérez"}</div>
      <div class="actions">
        <button class="sbtn sbtn--primary" title="Enviar los cambios pendientes al ventilador">${ic("Send")}Confirmar</button>
        <button class="sbtn" title="Descartar los cambios pendientes">${ic("Undo")}Cancelar</button>
      </div>
      <div class="pending-note" role="status">1 cambio pendiente</div>
      <button class="sbtn" aria-pressed="false" style="align-self:flex-start">${ic("Settings")}Ajustar</button>
      <ul class="tiles" aria-label="Valores del monitor">
        ${TILES.map(([v, u, l, vital]) => `<li class="tile ${vital ? "tile--vital" : ""}"><span class="tile-value">${v} <small>${u}</small></span><span class="tile-label">${l}</span>${real && !vital ? '<span class="tile-mark">derivada</span>' : ""}</li>`).join("")}
      </ul>
    </section>`;

  const spin = (label, value, unit, range, pending, short) => `
    <div class="spin ${pending ? "spin--pending" : ""}" role="spinbutton" aria-label="${label}">
      <div class="spin-label">${short || label}</div>
      <div class="spin-row"><span class="spin-value">${value} <small>${unit}</small></span>
        <span class="mini" aria-hidden="true">${ic("Remove")}</span><span class="mini" aria-hidden="true">${ic("Add")}</span></div>
      <div class="spin-range">${range}${pending ? " · Pendiente" : ""}</div>
    </div>`;

  const centre = (real) => `
    <section class="col col-centre" aria-label="Curvas">
      <div class="inputs">
        ${spin("Fracción inspirada de oxígeno", "40", "%", "21–100", false, "FiO₂")}
        ${spin("Volumen corriente", "450", "mL", "200–800", false, "Volumen (VCV)")}
        ${spin("Presión positiva al final de la espiración", "5", "cmH₂O", "0–20", false, "PEEP")}
      </div>
      <div class="alarms" role="region" aria-label="Alarmas"><span class="alarms-title">ALARMAS</span>
        ${real ? `<span class="alarm-chip">${ic("WarningAmber")}Prioridad media · FR alta</span>` : '<span class="muted" style="font-size:.8125rem">Sin alarmas activas</span>'}
        <button class="sbtn sbtn--compact" aria-label="Silenciar 2 min">${ic("NotificationsOff")}<span class="lbl">Silenciar 2 min</span></button>
        <button class="sbtn sbtn--compact" aria-label="Sonido activado" aria-pressed="true">${ic("VolumeUp")}<span class="lbl">Sonido activado</span></button>
        <button class="sbtn sbtn--compact" aria-label="Historial de alarmas" aria-expanded="false">${ic("History")}<span class="lbl">Historial de alarmas</span></button>
        ${real ? `<button class="sbtn" aria-expanded="false">Límites</button>` : ""}
      </div>
      <div class="toolbar">
        <span class="status-chip" role="status" aria-label="Estado de la señal"><span class="dot" style="background:var(--vl-color-success)"></span>${real ? "Conectado (Físico)" : "Simulando"}</span>
        <span class="zoom" role="group" aria-label="Zoom de las curvas"><span aria-label="Acercar">${ic("ZoomIn")}</span><span aria-label="Alejar">${ic("ZoomOut")}</span><span aria-label="Restablecer zoom">${ic("Restore")}</span></span>
        <span class="muted win-label" style="font-size:.75rem">Ventana 10 s</span>
        <span class="seg" role="group" aria-label="Bucles"><button aria-pressed="true">Sin bucle</button><button aria-pressed="false">P-V</button><button aria-pressed="false">F-V</button></span>
        <button class="sbtn sbtn--compact" aria-label="Congelar" aria-pressed="false">${ic("AcUnit")}<span class="lbl">Congelar</span></button>
        <button class="sbtn" aria-label="Opciones de trazado" style="margin-left:auto">${ic("MoreHoriz")}</button>
      </div>
      <div class="curves" role="img" aria-label="Curvas de presión, flujo y volumen">
        <div class="channel"><div class="channel-title">Presión (cmH₂O)</div><svg data-ch="pressure"></svg></div>
        <div class="channel"><div class="channel-title">Flujo (L/min)</div><svg data-ch="flow"></svg></div>
        <div class="channel"><div class="channel-title">Volumen (mL)</div><svg data-ch="volume"></svg></div>
      </div>
      ${real ? `<div class="cmds" data-testid="lab-command-panel">${ic("ChevronRight", "ic-sm")}<button class="sbtn" style="border:0;background:none;padding:0" aria-expanded="false">Comandos recientes (3)</button><span class="muted" style="font-weight:400;margin-left:auto">Último: FR 14 → 16 rpm · aplicado</span></div>` : ""}
    </section>`;

  const right = (real) => `
    <aside class="col col-right" aria-label="Controles">
      <div class="right-head">Modo <strong>VCV — Volumen control</strong>${real ? '<span class="muted">(informado)</span>' : ""}</div>
      <div class="modes" role="group" aria-label="Modo ventilatorio">
        <button class="mode-btn" aria-pressed="true" aria-label="Volumen control">VOL<small>CTRL</small></button>
        <button class="mode-btn" aria-pressed="false" aria-label="Presión control">PRES<small>CTRL</small></button>
        <button class="ai-btn" aria-label="Asesoría IA" aria-expanded="false">${ic("Psychology")}</button>
      </div>
      <button class="sbtn more-modes" aria-haspopup="menu">Más modos (${real ? "SIMV, PSV" : "PSV, CPAP, SIMV"}) ${ic("ArrowDropDown")}</button>
      <div class="field-block"><div class="field-label"><span>Insp</span><span>Esp</span></div>
        <div class="slider" role="slider" aria-label="Relación inspiración/espiración"><i style="width:33%"></i><b style="left:33%"></b></div></div>
      <div class="ro" role="status" aria-label="Relación I:E"><span>Relación I:E</span><b>1 : 2,0</b></div>
      ${spin("Tiempo inspiratorio", "1,00", "s", "0,3–3,0 · Te 2,00 s (calculado)")}
      ${spin("Pausa inspiratoria", "0,0", "s", "0–2,0")}
      <div class="spin spin--disabled" aria-disabled="true"><div class="spin-label">Pausa espiratoria</div><div class="spin-range" style="font-size:.75rem;padding:4px 0">No disponible en este simulador</div></div>
      ${spin("Frecuencia respiratoria", "16", "rpm", "5–40 · antes 14", true)}
      <div class="slider" role="slider" aria-label="Frecuencia respiratoria"><i style="width:31%"></i><b style="left:31%"></b></div>
      <div class="collapser"><span>Más parámetros</span>${ic("ExpandMore", "ic-sm")}</div>
      <section class="mech" role="region" aria-label="Estado de la mecánica"><strong>Estado de la mecánica</strong>
        <div class="mech-row"><span>Cst</span><span><b>34</b> mL/cmH₂O <span class="tile-mark">derivada</span></span></div>
        <div class="mech-row"><span>Cdin</span><span><b>26</b> mL/cmH₂O <span class="tile-mark">derivada</span></span></div></section>
      <div class="ro"><span>Alertas (2)</span></div>
      <button class="sbtn" aria-expanded="false">${ic("Visibility")}Ver alertas detalladas</button>
      <div class="kbd-hint">Esc: cancelar · Enter: confirmar</div>
    </aside>`;

  const tabs = () => `
    <div class="simtabs" role="tablist" aria-label="Secciones del simulador">
      <span class="simtab" role="tab" aria-selected="false">${ic("Person")}Simular Paciente</span>
      <span class="simtab" role="tab" aria-selected="true">${ic("MonitorHeart")}Monitoreo</span>
      <span class="simtab" role="tab" aria-selected="false">${ic("Wifi")}Conexión</span>
      <span class="simtab" role="tab" aria-selected="false">${ic("History")}Mis sesiones</span>
    </div>`;

  document.addEventListener("DOMContentLoaded", () => {
    const host = document.getElementById("monitor");
    if (!host) return;
    const real = document.body.dataset.source === "real";
    host.outerHTML = `<div class="mon">${strip(real)}<div class="cols3">${left(real)}${centre(real)}${right(real)}</div></div>${tabs()}`;
  });
})();
