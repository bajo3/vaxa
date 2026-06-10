/* ============================================================
   VAXA — Loader / precarga de imágenes con temática de fumigación
   Muestra el cargando hasta que cargan las imágenes (o timeout),
   luego entra a la página con un fundido.
   ============================================================ */
(function () {
  "use strict";
  var loader = document.getElementById("vaxa-loader");
  if (!loader) return;

  var fill = document.getElementById("vl-fill");
  var text = document.getElementById("vl-text");
  var reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  // bloquea el scroll mientras carga
  document.documentElement.classList.add("loading");

  var phrases = ["Preparando el control…", "Revisando cada rincón…", "Cargando…", "Casi listo…"];
  var pi = 0;
  var phraseTimer = setInterval(function () {
    pi = (pi + 1) % phrases.length;
    if (text) text.textContent = phrases[pi];
  }, 900);

  // progreso por imágenes cargadas
  var imgs = Array.prototype.slice.call(document.images || []);
  var total = imgs.length || 1, loaded = 0, fakeShown = 0;

  function paint() {
    var real = Math.round(loaded / total * 100);
    // suaviza para que nunca retroceda
    fakeShown = Math.max(fakeShown, real);
    if (fill) fill.style.width = Math.min(100, fakeShown) + "%";
  }
  function inc() { loaded++; paint(); }

  imgs.forEach(function (img) {
    if (img.complete) inc();
    else { img.addEventListener("load", inc); img.addEventListener("error", inc); }
  });
  paint();

  // avance "fantasma" para que la barra se sienta viva aunque el load tarde
  var creep = setInterval(function () {
    if (fakeShown < 90) { fakeShown += 1; if (fill) fill.style.width = fakeShown + "%"; }
  }, 60);

  var done = false;
  function finish() {
    if (done) return;
    done = true;
    clearInterval(phraseTimer); clearInterval(creep);
    if (fill) fill.style.width = "100%";
    if (text) text.textContent = "¡Listo!";
    setTimeout(function () {
      loader.classList.add("done");
      document.documentElement.classList.remove("loading");
      setTimeout(function () { if (loader && loader.parentNode) loader.parentNode.removeChild(loader); }, 650);
    }, reduce ? 60 : 280);
  }

  // cierra cuando todo cargó…
  if (document.readyState === "complete") setTimeout(finish, reduce ? 0 : 350);
  else window.addEventListener("load", function () { setTimeout(finish, reduce ? 0 : 350); });

  // …o por timeout máximo, para no quedar trabado nunca
  setTimeout(finish, reduce ? 800 : 5000);
})();
