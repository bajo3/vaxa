/* ============================================================
   VAXA — Tracking de interacciones (dataLayer → GTM)
   ------------------------------------------------------------
   Este archivo NO envía nada directo a Google ni a Meta: solo
   publica eventos en window.dataLayer. GTM decide qué etiqueta
   dispara cada evento y respeta el consentimiento. Así cada
   acción se mide una sola vez.

   Eventos:
     whatsapp_click    clic en un enlace real de WhatsApp
     phone_click       clic en un enlace tel: (no implica llamada hecha)
     cta_click         otros botones comerciales (mail, "Ver servicios", mapas…)
     service_view      la persona ve la sección de un servicio (plagas / tanques)
     quote_form_start  primer dato cargado en el formulario de presupuesto
     generate_lead     solo en /gracias, tras un envío confirmado por el servidor

   Parámetros comunes: service_type (plagas | tanques | general),
   cta_location, cta_type, cta_text, page_type, event_id.
   ============================================================ */
(function () {
  "use strict";

  var dl = window.dataLayer = window.dataLayer || [];

  /* Todas las claves que usan los eventos. Se envían siempre (en
     undefined si no aplican) para que GTM no arrastre valores del
     evento anterior en su modelo de datos. */
  var KEYS = ["service_type", "cta_location", "cta_type", "cta_text", "link_url",
              "whatsapp_topic", "form_id", "lead_id", "event_id"];

  function uid() {
    if (window.crypto && crypto.randomUUID) return crypto.randomUUID();
    return "id-" + Date.now().toString(36) + "-" + Math.random().toString(36).slice(2, 10);
  }

  function push(name, params) {
    var o = { event: name };
    KEYS.forEach(function (k) { o[k] = undefined; });
    for (var k in params) if (Object.prototype.hasOwnProperty.call(params, k)) o[k] = params[k];
    if (!o.event_id) o.event_id = uid();
    dl.push(o);
  }
  window.vaxaPush = push;

  /* ---------- Clasificación ---------- */
  var SERVICE_TYPES = { plagas: 1, tanques: 1, general: 1 };

  function serviceOf(el) {
    // 1) Atributo explícito en el HTML (data-area="plagas|tanques")
    var holder = el.closest("[data-area]");
    var a = holder && holder.getAttribute("data-area");
    if (a && SERVICE_TYPES[a]) return a;
    // 2) Enlace interno a una sección de servicio
    var href = el.getAttribute("href") || "";
    if (/#tanques|#laboratorio/.test(href)) return "tanques";
    if (/#fumigacion|#diagnostico/.test(href)) return "plagas";
    return "general";
  }

  function locationOf(el) {
    if (el.closest(".wa-float")) return "flotante";
    if (el.closest(".mobile-cta")) return "barra_mobile";
    if (el.closest("#popup")) return "popup";
    if (el.closest(".mnav")) return "menu_mobile";
    if (el.closest("nav.nav")) return "header";
    if (el.closest("footer")) return "footer";
    if (el.closest("header.hero, #top")) return "hero";
    if (el.closest("form")) return "formulario";
    var sec = el.closest("section, header");
    if (sec) {
      if (sec.id) return sec.id.replace(/-/g, "_");
      var cls = (sec.className || "").split(/\s+/).filter(function (c) {
        return c && c !== "section" && c !== "reveal" && c !== "in";
      })[0];
      if (cls) return cls.replace(/-/g, "_");
      return sec.tagName === "HEADER" ? "encabezado" : "seccion";
    }
    return "otro";
  }

  function typeOf(el) {
    if (el.closest(".wa-float")) return "boton_flotante";
    if (el.closest(".mobile-cta")) return "barra_fija";
    if (el.classList.contains("btn")) return "boton";
    return "enlace";
  }

  function textOf(el) {
    var t = (el.getAttribute("aria-label") || el.textContent || "").replace(/\s+/g, " ").trim();
    return t.slice(0, 80);
  }

  var WA_RE = /^(https?:\/\/)?(wa\.me|api\.whatsapp\.com|web\.whatsapp\.com|chat\.whatsapp\.com)\/|^whatsapp:/i;

  /* ---------- Antirrebote: un clic = un evento ---------- */
  var lastEl = null, lastTs = 0;
  function isRepeat(el) {
    var t = Date.now();
    var rep = el === lastEl && t - lastTs < 1200;
    lastEl = el; lastTs = t;
    return rep;
  }

  function onClick(e) {
    if (e.type === "auxclick" && e.button !== 1) return; // solo clic medio (abrir en pestaña)
    var link = e.target.closest && e.target.closest("a[href], [data-cta]");
    if (!link) return;
    var href = link.getAttribute("href") || "";

    var isWa = link.hasAttribute("data-wa") || WA_RE.test(href);
    var isTel = /^tel:/i.test(href);
    var isMail = /^mailto:/i.test(href);
    var isCta = link.classList.contains("btn") || link.hasAttribute("data-cta") ||
                /google\.[a-z.]+\/maps/i.test(href);
    if (!isWa && !isTel && !isMail && !isCta) return;
    if (isRepeat(link)) return;

    var base = {
      service_type: serviceOf(link),
      cta_location: locationOf(link),
      cta_type: typeOf(link),
      cta_text: textOf(link)
    };

    if (isWa) {
      base.whatsapp_topic = link.getAttribute("data-wa") || "directo";
      push("whatsapp_click", base);
    } else if (isTel) {
      push("phone_click", base);
    } else {
      base.cta_type = isMail ? "email" : base.cta_type;
      // URL sin querystring: nunca mandar datos de formulario o personales
      base.link_url = isMail ? "mailto" : href.split("?")[0].slice(0, 120);
      push("cta_click", base);
    }
  }
  document.addEventListener("click", onClick, true);
  document.addEventListener("auxclick", onClick, true);

  /* ---------- Vista de secciones de servicio ---------- */
  var SECTIONS = [
    ["#fumigacion", "plagas"], ["#diagnostico", "plagas"],
    ["#tanques", "tanques"], ["#laboratorio", "tanques"], [".aa-section", "tanques"]
  ];
  if ("IntersectionObserver" in window) {
    var seen = {};
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (!en.isIntersecting) return;
        var st = en.target.getAttribute("data-track-service");
        io.unobserve(en.target);
        if (seen[st]) return;           // una vez por servicio y por página
        seen[st] = true;
        push("service_view", { service_type: st, cta_location: en.target.getAttribute("data-track-section") });
      });
    }, { rootMargin: "0px 0px -45% 0px", threshold: 0 });
    SECTIONS.forEach(function (s) {
      var node = document.querySelector(s[0]);
      if (!node) return;
      node.setAttribute("data-track-service", s[1]);
      node.setAttribute("data-track-section", s[0].replace(/^[#.]/, "").replace(/-/g, "_"));
      io.observe(node);
    });
  }

  /* ---------- Atribución (UTM / gclid / fbclid) ----------
     GA4 y Google Ads atribuyen solos con sus propias cookies. Esto
     solo guarda la fuente de la sesión para adjuntarla a cada
     presupuesto que llega por mail. Respeta el consentimiento:
       - UTM: requiere analítica · gclid/fbclid: requiere publicidad
     Se guarda la PRIMERA fuente de la sesión (no se pisa). */
  var ATTR_KEY = "vaxa_attr";
  var landing = (function () {
    var q = new URLSearchParams(location.search), o = {};
    ["utm_source", "utm_medium", "utm_campaign", "utm_content", "utm_term",
     "gclid", "gbraid", "wbraid", "fbclid"].forEach(function (k) {
      var v = q.get(k); if (v) o[k] = v.slice(0, 150);
    });
    return o;
  })();
  function persistAttribution() {
    var c = window.vaxaConsent;
    if (!c || (!c.analytics() && !c.ads())) return;
    try {
      if (sessionStorage.getItem(ATTR_KEY)) return;
      var o = {}, any = false;
      for (var k in landing) {
        var isAd = /clid|braid/.test(k);
        if ((isAd && c.ads()) || (!isAd && c.analytics())) { o[k] = landing[k]; any = true; }
      }
      var ref = document.referrer || "";
      try { if (ref && new URL(ref).host === location.host) ref = "interno"; } catch (e1) {}
      o.referrer = ref ? ref.split("?")[0].slice(0, 150) : "directo";
      o.landing_page = location.pathname;
      if (any || o.referrer) sessionStorage.setItem(ATTR_KEY, JSON.stringify(o));
    } catch (e) {}
  }
  persistAttribution();
  document.addEventListener("vaxa:consent", persistAttribution);
  window.vaxaAttribution = function () {
    try { return JSON.parse(sessionStorage.getItem(ATTR_KEY)) || {}; } catch (e) { return {}; }
  };

  /* ---------- generate_lead (solo en /gracias) ----------
     El formulario guarda la solicitud confirmada por el servidor en
     sessionStorage. Acá se consume UNA vez: recargar /gracias o
     entrar directo no genera ningún lead. */
  var isThanks = /\/gracias(\.html)?$/.test(location.pathname);
  if (isThanks) {
    var PENDING = "vaxa_lead_pending", SENT = "vaxa_leads_sent";
    try {
      var p = JSON.parse(sessionStorage.getItem(PENDING) || "null");
      sessionStorage.removeItem(PENDING);
      var sent = [];
      try { sent = JSON.parse(localStorage.getItem(SENT) || "[]"); } catch (e2) {}
      var fresh = p && p.lead_id && (Date.now() - p.ts) < 30 * 60 * 1000;
      if (fresh && sent.indexOf(p.lead_id) === -1) {
        push("generate_lead", {
          lead_id: p.lead_id,
          event_id: p.lead_id,                 // dedupe navegador ↔ servidor (Meta CAPI)
          service_type: SERVICE_TYPES[p.service_type] ? p.service_type : "general",
          form_id: p.form_id || "quote_form"
        });
        sent.push(p.lead_id);
        try { localStorage.setItem(SENT, JSON.stringify(sent.slice(-20))); } catch (e3) {}
      }
    } catch (e) {}
  }
})();
