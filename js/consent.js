/* ============================================================
   VAXA — Consentimiento (Google Consent Mode v2) + carga de GTM
   ------------------------------------------------------------
   Se carga SINCRÓNICO en el <head>, antes que cualquier etiqueta.
   1. Inicializa dataLayer y deja todo lo no esencial en "denied".
   2. Si la persona ya eligió, aplica su elección guardada.
   3. Carga Google Tag Manager (único punto de carga de GA4,
      Google Ads y Meta Pixel; ver docs/MEDICION.md).
   4. Muestra el banner de cookies y permite cambiar la elección
      desde cualquier elemento con [data-cookie-prefs].
   ============================================================ */
(function () {
  "use strict";

  /* ---------- CONFIGURACIÓN ----------
     gtmId: ID del contenedor de Google Tag Manager (GTM-XXXXXXX).
     Mientras quede el valor de ejemplo, GTM NO se carga (no se
     inventan IDs) y los eventos solo quedan en window.dataLayer. */
  var CONFIG = window.VAXA_TRACKING = window.VAXA_TRACKING || {
    gtmId: "GTM-PVVRNLH3",
    consentVersion: 1,          // subir si cambian las categorías → se vuelve a preguntar
    privacyUrl: "privacidad.html"
  };

  var STORE_KEY = "vaxa_consent";
  window.dataLayer = window.dataLayer || [];
  function gtag() { window.dataLayer.push(arguments); }
  window.gtag = window.gtag || gtag;

  /* ---------- 1. Valores por defecto: todo lo no esencial denegado ---------- */
  gtag("consent", "default", {
    ad_storage: "denied",
    ad_user_data: "denied",
    ad_personalization: "denied",
    analytics_storage: "denied",
    functionality_storage: "granted",
    security_storage: "granted",
    wait_for_update: 500
  });
  gtag("set", "ads_data_redaction", true);

  /* ---------- 2. Elección guardada ---------- */
  function readChoice() {
    try {
      var c = JSON.parse(localStorage.getItem(STORE_KEY));
      if (c && c.v === CONFIG.consentVersion && typeof c.analytics === "boolean" && typeof c.ads === "boolean") return c;
    } catch (e) {}
    return null;
  }
  function toGoogle(c) {
    var a = c.analytics ? "granted" : "denied";
    var m = c.ads ? "granted" : "denied";
    return { analytics_storage: a, ad_storage: m, ad_user_data: m, ad_personalization: m };
  }
  var choice = readChoice();
  if (choice) gtag("consent", "update", toGoogle(choice));

  /* ---------- Contexto de página (antes de que cargue GTM) ---------- */
  var file = (location.pathname.split("/").pop() || "index").replace(/\.html$/, "") || "index";
  var PAGE_TYPES = {
    index: "inicio", "quienes-somos": "quienes_somos", servicios: "servicios",
    cobertura: "cobertura", contacto: "contacto", faq: "faq",
    gracias: "gracias", privacidad: "privacidad"
  };
  window.dataLayer.push({
    page_type: PAGE_TYPES[file] || "otra",
    consent_analytics: choice && choice.analytics ? "granted" : "denied",
    consent_ads: choice && choice.ads ? "granted" : "denied"
  });

  /* ---------- 3. Google Tag Manager ---------- */
  var gtmOk = /^GTM-[A-Z0-9]{4,}$/.test(CONFIG.gtmId) && CONFIG.gtmId !== "GTM-XXXXXXX";
  if (gtmOk) {
    (function (w, d, s, l, i) {
      w[l].push({ "gtm.start": new Date().getTime(), event: "gtm.js" });
      var f = d.getElementsByTagName(s)[0], j = d.createElement(s);
      j.async = true; j.src = "https://www.googletagmanager.com/gtm.js?id=" + i;
      f.parentNode.insertBefore(j, f);
    })(window, document, "script", "dataLayer", CONFIG.gtmId);
  }

  /* ---------- API pública ---------- */
  function save(analytics, ads) {
    var c = { v: CONFIG.consentVersion, analytics: !!analytics, ads: !!ads, ts: Date.now() };
    try { localStorage.setItem(STORE_KEY, JSON.stringify(c)); } catch (e) {}
    var revokedAds = choice && choice.ads && !c.ads;
    choice = c;
    gtag("consent", "update", toGoogle(c));
    window.dataLayer.push({
      event: "consent_update",
      consent_analytics: c.analytics ? "granted" : "denied",
      consent_ads: c.ads ? "granted" : "denied"
    });
    // Si se retira el permiso publicitario, Meta deja de enviar desde ya.
    if (revokedAds && typeof window.fbq === "function") { try { window.fbq("consent", "revoke"); } catch (e) {} }
    document.dispatchEvent(new CustomEvent("vaxa:consent", { detail: c }));
  }
  window.vaxaConsent = {
    get: function () { return choice; },
    analytics: function () { return !!(choice && choice.analytics); },
    ads: function () { return !!(choice && choice.ads); },
    set: save,
    open: function () { showBanner(true); }
  };

  /* ---------- 4. Banner ---------- */
  var banner = null;
  function el(html) { var d = document.createElement("div"); d.innerHTML = html.trim(); return d.firstChild; }
  function build() {
    banner = el(
      '<div class="ck-banner" role="dialog" aria-modal="false" aria-labelledby="ck-title" aria-describedby="ck-text" hidden>' +
        '<div class="ck-card">' +
          '<p class="ck-title" id="ck-title">Cookies y medición</p>' +
          '<p class="ck-text" id="ck-text">Usamos cookies propias y de terceros (Google y Meta) para medir las visitas y saber qué anuncios funcionan. ' +
          'Solo se activan si las aceptás. <a href="' + CONFIG.privacyUrl + '">Política de privacidad</a>.</p>' +
          '<div class="ck-prefs" hidden>' +
            '<label class="ck-opt"><input type="checkbox" checked disabled> <span><b>Necesarias</b> Guardan esta elección. Siempre activas.</span></label>' +
            '<label class="ck-opt"><input type="checkbox" id="ck-analytics"> <span><b>Analítica</b> Google Analytics: visitas, páginas y clics, de forma agregada.</span></label>' +
            '<label class="ck-opt"><input type="checkbox" id="ck-ads"> <span><b>Publicidad</b> Google Ads y Meta (Facebook / Instagram): medir resultados de anuncios.</span></label>' +
          '</div>' +
          '<div class="ck-actions">' +
            '<button type="button" class="ck-btn" data-ck="reject">Rechazar</button>' +
            '<button type="button" class="ck-btn" data-ck="config">Configurar</button>' +
            '<button type="button" class="ck-btn" data-ck="save" hidden>Guardar elección</button>' +
            '<button type="button" class="ck-btn ck-primary" data-ck="accept">Aceptar</button>' +
          '</div>' +
        '</div>' +
      '</div>'
    );
    document.body.appendChild(banner);
    banner.addEventListener("click", function (e) {
      var b = e.target.closest("[data-ck]");
      if (!b) return;
      var act = b.getAttribute("data-ck");
      if (act === "accept") { save(true, true); hide(); }
      else if (act === "reject") { save(false, false); hide(); }
      else if (act === "save") {
        save(banner.querySelector("#ck-analytics").checked, banner.querySelector("#ck-ads").checked); hide();
      } else if (act === "config") { openPrefs(); }
    });
  }
  function openPrefs() {
    banner.querySelector(".ck-prefs").hidden = false;
    banner.querySelector('[data-ck="config"]').hidden = true;
    banner.querySelector('[data-ck="save"]').hidden = false;
  }
  function showBanner(withPrefs) {
    if (!banner) build();
    banner.querySelector("#ck-analytics").checked = !!(choice && choice.analytics);
    banner.querySelector("#ck-ads").checked = !!(choice && choice.ads);
    banner.hidden = false;
    if (withPrefs) openPrefs();
  }
  function hide() { if (banner) banner.hidden = true; }

  function init() {
    if (!choice) showBanner(false);
    document.addEventListener("click", function (e) {
      var t = e.target.closest && e.target.closest("[data-cookie-prefs]");
      if (t) { e.preventDefault(); showBanner(true); }
    });
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
  else init();
})();
