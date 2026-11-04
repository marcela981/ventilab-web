/*
 * Bloque 5 proposal mockups: /learn content (learn-workspace, home-tab, curriculum-tab) re-skinned.
 * Renders into #learn with <body data-learn="home|curriculum|curriculum-open" data-staff="true">.
 * Copy comes from the current app (learn-workspace.tsx:30-33, curriculum-tab.tsx:50-67, Bloque 2 captures).
 */
(function () {
  const ic = (n, c = "") => window.vlIcon(n, c);

  const MODULES = [
    { t: "La Inversión Fisiológica: De la Presión Negativa a la Positiva", d: "Fundamentos del paso de la respiración espontánea a la ventilación mecánica con presión positiva.", n: 6, open: true },
    { t: "El Santo Grial – La Ecuación del Movimiento Respiratorio", d: "La ecuación fundamental que gobierna la interacción ventilador-pulmón.", n: 0 },
    { t: "Variables de Fase y el Ciclo Respiratorio", d: "La lógica del ventilador: cómo las variables de fase determinan el ciclo respiratorio.", n: 0 },
    { t: "Taxonomía de los Modos Ventilatorios", d: "Clasificación y selección de modos ventilatorios: volumen vs. presión, control vs. asistencia.", n: 0 },
    { t: "Monitorización Gráfica I: Escalares y Bucles", d: "Interpretación de curvas gráficas del ventilador e identificación de asincronías básicas.", n: 0 },
    { t: "Efectos Sistémicos y VILI", d: "Efectos sistémicos de la presión positiva y estrategias para prevenir la lesión pulmonar.", n: 0 },
  ];

  const header = (tab, staff) => `
    <h1 class="page-title">Aprender</h1>
    <p class="page-subtitle">Recorre el curso de ventilación mecánica a tu ritmo.</p>
    <div class="tabs" role="tablist" aria-label="Secciones de aprendizaje">
      ${staff ? "" : `<span class="tab" role="tab" aria-selected="${tab === "home"}">${ic("Dashboard", "ic-sm")}Inicio</span>`}
      <span class="tab" role="tab" aria-selected="${tab !== "home"}">${ic("School", "ic-sm")}Currículo</span>
      ${staff ? "" : `<span class="tab" role="tab" aria-selected="false">${ic("TrendingUp", "ic-sm")}Mi Progreso</span>`}
      ${staff ? `<span class="chip chip--outlined" style="margin:auto 0 auto auto">Modo edición</span>` : ""}
    </div>`;

  const home = () => `
    <section class="glass learn-resume">
      <div class="overline">Continuar donde quedaste</div>
      <p style="margin:6px 0 20px"><strong>La Inversión Fisiológica</strong> · Lección 3 de 6</p>
      <div class="bar" style="max-width:520px"><span style="width:45%;background:var(--vl-color-primary)"></span></div>
      <div class="learn-resume-row">
        <div><div class="overline muted">XP hoy</div><div class="learn-big">40 ${ic("TrendingUp", "ic-sm learn-up")}</div></div>
        <div><div class="overline muted">Racha</div><div class="learn-big">3 días ${ic("LocalFireDepartment", "ic-sm learn-fire")}</div></div>
        <div><div class="overline muted">Nivel</div><div class="learn-big">${ic("EmojiEvents", "ic-sm learn-trophy")} Nivel 1</div></div>
        <button class="btn btn--contained" style="margin-left:auto">${ic("PlayArrow", "ic-sm")}Continuar</button>
      </div>
    </section>
    <div class="learn-grid">
      <section class="glass learn-tile"><div class="overline muted">Lecciones completadas</div><div class="learn-big">${ic("CheckCircle", "ic-sm learn-ok")} 8</div></section>
      <section class="glass learn-tile"><div class="overline muted">Módulos en curso</div><div class="learn-big">${ic("MenuBook", "ic-sm")} 2</div></section>
      <section class="glass learn-tile"><div class="overline muted">Promedio de quizzes</div><div class="learn-big">${ic("Star", "ic-sm learn-trophy")} 86 %</div></section>
    </div>
    <section class="glass learn-activity">
      <div class="overline muted">Actividad de las últimas semanas</div>
      <div class="learn-cal">${Array.from({ length: 84 }, (_, i) => `<span style="opacity:${[0.08, 0.25, 0.5, 0.85][(i * 7 + (i % 5)) % 4]}"></span>`).join("")}</div>
    </section>`;

  const card = (m, i) => `
    <article class="mod ${m.open ? "mod--open" : ""}">
      <h4 class="mod-title">${m.t}</h4>
      ${m.open ? `<span class="chip chip--info">En progreso</span>` : `<span class="chip chip--warning-outlined">${ic("Construction", "ic-xs")}Próximamente</span>`}
      <p class="mod-desc">${m.d}</p>
      <p class="mod-count">${m.n} lecciones</p>
      ${m.open ? `<button class="btn mod-go">${ic("PlayArrow", "ic-sm")}Continuar</button>` : `<button class="btn btn--ghost mod-go" disabled>${ic("Construction", "ic-sm")}Próximamente</button>`}
    </article>`;

  const section = (id, icon, title, extra, open, body) => `
    <section class="acc" data-section="${id}" data-expanded="${open}">
      <div class="acc-head"><span class="acc-icon acc-icon--${id}">${ic(icon)}</span>${title}${extra}
        <span class="acc-caret">${ic(open ? "ExpandLess" : "ExpandMore")}</span></div>
      ${open ? `<div class="acc-body">${body}</div>` : ""}
    </section>`;

  const curriculum = (open) => `
    <h2 class="section-title">Niveles de Aprendizaje</h2>
    ${section("ventylab", "Devices", "Aprendizaje VentyLab", "", false, "")}
    ${section("prereq", "School", "Prerequisitos", ' <span class="chip chip--outlined">Opcional</span>', false, "")}
    ${section("mechanics", "MenuBook", "Aprendizaje Mecánica respiratoria", "", open, `
      <div class="level">
        <span class="level-dot">1</span>
        <div style="flex:1">
          <div style="display:flex;align-items:center;gap:12px"><h3 class="level-title">Nivel Principiante</h3><span class="chip chip--info" style="margin-left:auto">En progreso</span></div>
          <p class="muted" style="font-size:.9375rem">Fundamentos fisiológicos y conceptos básicos de ventilación mecánica</p>
          <div class="bar" style="margin:10px 0 4px"><span style="width:12%;background:var(--vl-level-beginner)"></span></div>
          <p class="muted" style="font-size:.75rem">12 % · 0/6 módulos</p>
          <div class="mods">${MODULES.map(card).join("")}</div>
        </div>
      </div>`)}`;

  document.addEventListener("DOMContentLoaded", () => {
    const host = document.getElementById("learn");
    if (!host) return;
    const d = document.body.dataset;
    const staff = d.staff === "true";
    const tab = d.learn || "home";
    host.innerHTML = header(tab, staff) + (tab === "home" ? home() : curriculum(tab === "curriculum-open"));
  });
})();
