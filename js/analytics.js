/* ============================================================
   VAXA — Analítica demo (100% en el navegador, sin backend)
   Registra eventos en localStorage para el panel /admin.
   Nota: los datos son por navegador, no agregados entre visitantes.
   ============================================================ */
(function () {
  "use strict";

  var KEY = "vaxa_analytics_events";
  var SKEY = "vaxa_analytics_session";

  function now() { return Date.now(); }

  function load() {
    try { return JSON.parse(localStorage.getItem(KEY)) || []; }
    catch (e) { return []; }
  }
  function save(list) {
    try {
      // límite defensivo para no llenar localStorage
      if (list.length > 2000) list = list.slice(list.length - 2000);
      localStorage.setItem(KEY, JSON.stringify(list));
    } catch (e) {}
  }

  // sesión simple (30 min de inactividad = nueva sesión)
  function sessionId() {
    var s = null;
    try { s = JSON.parse(sessionStorage.getItem(SKEY)); } catch (e) {}
    var t = now();
    if (!s || (t - s.last) > 30 * 60 * 1000) {
      s = { id: "s_" + t + "_" + Math.random().toString(36).slice(2, 7), start: t, last: t };
    } else {
      s.last = t;
    }
    try { sessionStorage.setItem(SKEY, JSON.stringify(s)); } catch (e) {}
    return s.id;
  }

  function track(type, data) {
    var list = load();
    list.push({
      t: type,
      ts: now(),
      s: sessionId(),
      d: data || {},
      path: location.pathname,
      w: window.innerWidth
    });
    save(list);
  }

  // expone API mínima
  window.vaxaTrack = track;

  /* ---------- pageview ---------- */
  track("pageview", { ref: document.referrer || "directo", title: document.title });

  /* ---------- helpers ---------- */
  function closest(el, sel) { return el && el.closest ? el.closest(sel) : null; }

  /* ---------- clicks globales ---------- */
  document.addEventListener("click", function (e) {
    var t = e.target;

    var wa = closest(t, "[data-wa]");
    if (wa) { track("whatsapp_click", { serv: wa.getAttribute("data-wa") || "", cli: wa.getAttribute("data-cliente") || "" }); return; }

    var tel = closest(t, 'a[href^="tel:"]');
    if (tel) { track("call_click", { num: tel.getAttribute("href").replace("tel:", "") }); return; }

    var acc = closest(t, "#vaxa-palette-dock [data-acc]");
    if (acc) { track("palette_change", { axis: "color", val: acc.getAttribute("data-acc") }); return; }
    var bg = closest(t, "#vaxa-palette-dock [data-bg]");
    if (bg) { track("palette_change", { axis: "fondo", val: bg.getAttribute("data-bg") }); return; }

    var navLink = closest(t, '.nav-links a, .mnav-links a');
    if (navLink) { track("nav_click", { to: navLink.getAttribute("href") || "" }); return; }
  });

  /* ---------- popup ---------- */
  // observa cuando el popup se muestra
  var popup = document.getElementById("popup");
  if (popup) {
    var seen = false;
    var mo = new MutationObserver(function () {
      var shown = popup.classList.contains("show");
      if (shown && !seen) { seen = true; track("popup_shown", {}); }
    });
    mo.observe(popup, { attributes: true, attributeFilter: ["class"] });
    var pclose = document.getElementById("popup-close");
    var plater = document.getElementById("popup-later");
    if (pclose) pclose.addEventListener("click", function () { track("popup_close", { via: "x" }); });
    if (plater) plater.addEventListener("click", function () { track("popup_close", { via: "ahora_no" }); });
  }

  /* ---------- formulario de mail ---------- */
  var mform = document.getElementById("mail-form");
  if (mform) {
    mform.addEventListener("submit", function () {
      // se registra el intento de envío (la validación la maneja interactions.js)
      var serv = (document.getElementById("mf-serv") || {}).value || "";
      track("form_submit", { tipo: "mail", serv: serv });
    });
  }

  /* ---------- quiz (envío final por WhatsApp) ---------- */
  var qsend = document.getElementById("quiz-send");
  if (qsend) qsend.addEventListener("click", function () { track("quiz_complete", {}); });

  /* ---------- profundidad de scroll ---------- */
  var marks = { 25: false, 50: false, 75: false, 100: false };
  function onScroll() {
    var h = document.documentElement;
    var max = h.scrollHeight - h.clientHeight;
    if (max <= 0) return;
    var pct = Math.round((h.scrollTop || window.pageYOffset) / max * 100);
    [25, 50, 75, 100].forEach(function (m) {
      if (!marks[m] && pct >= m) { marks[m] = true; track("scroll_depth", { pct: m }); }
    });
  }
  window.addEventListener("scroll", onScroll, { passive: true });

  /* ---------- tiempo en página (al salir) ---------- */
  var t0 = now();
  window.addEventListener("beforeunload", function () {
    track("time_on_page", { sec: Math.round((now() - t0) / 1000) });
  });
})();
