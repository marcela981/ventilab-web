/*
 * Bloque 5 proposal mockups: renders the shell (global sidebar or staff panel sidebar) into #shell.
 * Options come from <body data-*>:
 *   data-shell="global|panel"  data-role="student|teacher"  data-active="<item id>"
 *   data-collapsed="true"      data-tooltip="<item id>"  (collapsed tooltip preview)
 * Labels and icons follow DISENO_BLOQUE5.md §4 (decisions D7, D8, D10, D11, D12).
 */
(function () {
  const ic = (name, cls = "") => `<svg class="ic ${cls}" aria-hidden="true"><use href="#i-${name}"/></svg>`;
  window.vlIcon = ic;

  const USERS = {
    student: { name: "Laura Gómez", initials: "LG", role: "Estudiante", cls: "student" },
    teacher: { name: "Marcela Mazo", initials: "MM", role: "Docente", cls: "teacher" },
  };

  const GLOBAL_ITEMS = [
    { id: "simulador", label: "Simulador Virtual", icon: "Dashboard" },
    { id: "learn", label: "Módulo de Enseñanza", icon: "School" },
    { id: "evaluations", label: "Evaluación", icon: "Assessment", staffBadge: 2 },
  ];

  const PANEL_ITEMS = [
    { id: "teacher", label: "Dashboard", icon: "Dashboard" },
    { id: "students", label: "Estudiantes", icon: "People" },
    { id: "groups", label: "Grupos", icon: "GroupWork" },
    { id: "content", label: "Contenido", icon: "LibraryBooks" },
    { id: "cases", label: "Casos clínicos", icon: "Biotech" },
    { id: "evaluations", label: "Evaluaciones", icon: "Assignment", badge: 10 },
    { id: "lab", label: "Laboratorio", icon: "Event" },
    { section: "Administración" },
    { id: "status", label: "Estado del sistema", icon: "Dns" },
  ];

  function tools(cls) {
    return `<div class="${cls}" role="group" aria-label="Herramientas">
      <button class="icon-btn" aria-label="Abrir asistente IA">${ic("SmartToyOutlined")}</button>
      <button class="icon-btn" aria-label="Notificaciones, 3 sin leer">${ic("NotificationsNone")}<span class="badge">3</span></button>
    </div>`;
  }

  function globalSidebar(d) {
    const user = USERS[d.role || "student"];
    const collapsed = d.collapsed === "true";
    const staff = d.role === "teacher";
    const item = (it) => {
      const badge = staff && it.staffBadge ? `<span class="badge">${it.staffBadge}</span>` : "";
      const label = collapsed ? `<span class="visually-hidden">${it.label}</span>` : `<span>${it.label}</span>`;
      const tip = collapsed && d.tooltip === it.id ? `<span class="tooltip" role="tooltip">${it.label}</span>` : "";
      return `<li><a class="sb-item" href="#" ${d.active === it.id ? 'aria-current="page"' : ""}>${ic(it.icon)}${badge}${label}${tip}</a></li>`;
    };
    const staffItems = staff
      ? `<li class="sb-divider" aria-hidden="true"></li>${item({ id: "teacher", label: "Panel docente", icon: "AdminPanelSettings" })}`
      : "";
    const header = collapsed
      ? `<button class="icon-btn icon-btn--ring" aria-label="Expandir menú" aria-expanded="false">${ic("Menu")}</button>`
      : `<a class="sb-brand" href="#">VentyLab</a><button class="icon-btn" aria-label="Contraer menú" aria-expanded="true">${ic("ChevronLeft")}</button>`;
    const card = collapsed
      ? `<div class="user-card"><button class="icon-btn" style="width:44px;height:44px" aria-label="Opciones de ${user.name}" aria-haspopup="menu"><span class="avatar avatar--sm avatar--${user.cls}">${user.initials}</span></button></div>`
      : `<div class="user-card">
          <span class="avatar avatar--${user.cls}">${user.initials}</span>
          <a class="user-card-id" href="#"><span class="user-card-name">${user.name}</span><span class="role-chip role-chip--${user.cls}">${user.role}</span></a>
          <button class="icon-btn" aria-label="Opciones" aria-haspopup="menu">${ic("MoreVert")}</button>
        </div>`;
    return `<aside class="sb ${collapsed ? "sb--collapsed" : ""}" aria-label="Barra lateral">
      <div class="sb-header">${header}</div>
      <nav aria-label="Navegación principal"><ul class="sb-nav">${GLOBAL_ITEMS.map(item).join("")}${staffItems}</ul></nav>
      <div class="sb-spacer"></div>
      ${tools("sb-tools")}
      ${card}
      ${collapsed ? "" : '<div class="sb-version">VentyLab v0.1.0</div>'}
    </aside>`;
  }

  function panelSidebar(d) {
    const user = USERS.teacher;
    const items = PANEL_ITEMS.map((it) =>
      it.section
        ? `<li class="psb-section">${it.section}</li>`
        : `<li><a class="psb-item" href="#" ${d.active === it.id ? 'aria-current="page"' : ""}>${ic(it.icon)}<span>${it.label}</span>${it.badge ? `<span class="badge">${it.badge}</span>` : ""}</a></li>`,
    ).join("");
    return `<aside class="psb" aria-label="Barra lateral del panel">
      <div class="psb-header">${ic("AdminPanelSettings")}<span class="psb-title">Panel docente</span>
        <button class="icon-btn" aria-label="Contraer menú" aria-expanded="true">${ic("ChevronLeft")}</button></div>
      <div class="psb-identity">
        <div style="flex:1;min-width:0"><div class="psb-identity-name">${user.name}</div><span class="role-chip role-chip--teacher">${user.role}</span></div>
        <button class="icon-btn" aria-label="Opciones" aria-haspopup="menu">${ic("MoreVert")}</button>
      </div>
      <nav aria-label="Navegación del panel"><ul class="psb-nav">${items}</ul></nav>
      <div class="sb-spacer"></div>
      ${tools("psb-tools")}
      <a class="psb-back" href="#">${ic("Dashboard")}<span>Volver a la plataforma</span></a>
      <div class="psb-version">VentyLab Admin v0.1.0</div>
    </aside>`;
  }

  document.addEventListener("DOMContentLoaded", () => {
    const host = document.getElementById("shell");
    const d = document.body.dataset;
    if (host) host.outerHTML = d.shell === "panel" ? panelSidebar(d) : globalSidebar(d);
    document.querySelectorAll("[data-ic]").forEach((el) => {
      el.outerHTML = ic(el.dataset.ic, el.className || "");
    });
  });
})();
