/* ============================================================
   VAXA Fumigaciones — Interacciones
   ============================================================ */
(function () {
  "use strict";

  var WA_NUMBER = "5492494621182";

  /* ---------- WhatsApp links ---------- */
  function waUrl(message) {
    return "https://wa.me/" + WA_NUMBER + "?text=" + encodeURIComponent(message);
  }
  function buildMessage(servicio, cliente, zona) {
    if (!servicio || servicio === "general") {
      return "Hola, quiero pedir un presupuesto a VAXA Fumigaciones.";
    }
    var msg = "Hola, quiero consultar por " + servicio;
    if (cliente) msg += " para " + cliente;
    if (zona) msg += " en " + zona;
    msg += ".";
    return msg;
  }
  // Wire every [data-wa] element
  function wireWa() {
    document.querySelectorAll("[data-wa]").forEach(function (el) {
      var serv = el.getAttribute("data-wa");
      var cli = el.getAttribute("data-cliente") || "";
      el.setAttribute("href", waUrl(buildMessage(serv, cli, "")));
      el.setAttribute("target", "_blank");
      el.setAttribute("rel", "noopener");
    });
  }
  wireWa();

  /* ---------- Nav scroll state ---------- */
  var nav = document.getElementById("nav");
  var hero = document.getElementById("top");
  function onScroll() {
    var y = window.scrollY || window.pageYOffset;
    nav.classList.toggle("scrolled", y > 40);
    // on-hero only while hero is in view
    var heroBottom = hero ? hero.offsetHeight - 90 : 0;
    nav.classList.toggle("on-hero", y < heroBottom);
  }
  window.addEventListener("scroll", onScroll, { passive: true });
  onScroll();

  /* ---------- Mobile menu (burger) — full-screen ---------- */
  var burger = document.getElementById("burger");
  if (burger) {
    var ITEMS = [
      ["Problemas", "#diagnostico"], ["Servicios", "#servicios"],
      ["Clientes", "#clientes"], ["Consorcios", "#consorcios"],
      ["Cobertura", "#cobertura"], ["FAQ", "#faq"], ["Contacto", "#presupuesto"]
    ];
    var menu = document.createElement("div");
    menu.id = "m-menu";
    menu.className = "mnav";
    menu.setAttribute("role", "dialog");
    menu.setAttribute("aria-modal", "true");
    menu.setAttribute("aria-label", "Menú de navegación");
    var linksHtml = ITEMS.map(function (it) {
      return '<a href="' + it[1] + '">' + it[0] + '</a>';
    }).join("");
    menu.innerHTML =
      '<div class="mnav-top">' +
        '<span class="mnav-brand">VA<b>XA</b> · Fumigaciones</span>' +
        '<button class="mnav-close" id="mnav-close" aria-label="Cerrar menú"><svg><use href="#i-x"></use></svg></button>' +
      '</div>' +
      '<nav class="mnav-links">' + linksHtml + '</nav>' +
      '<div class="mnav-cta"><a class="btn btn-wa" data-wa="general" href="#"><svg><use href="#i-wa"></use></svg> Pedir presupuesto</a></div>';
    document.body.appendChild(menu);

    function openMenu() { menu.classList.add("open"); document.body.classList.add("mnav-open"); burger.setAttribute("aria-expanded", "true"); }
    function closeMenu() { menu.classList.remove("open"); document.body.classList.remove("mnav-open"); burger.setAttribute("aria-expanded", "false"); }

    burger.addEventListener("click", function () {
      menu.classList.contains("open") ? closeMenu() : openMenu();
    });
    menu.querySelector("#mnav-close").addEventListener("click", closeMenu);
    menu.querySelectorAll(".mnav-links a").forEach(function (a) {
      a.addEventListener("click", closeMenu);
    });
    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape" && menu.classList.contains("open")) closeMenu();
    });
    // re-cablear el botón de WhatsApp que acabamos de inyectar
    wireWa();
  }

  /* ---------- Reveal on scroll ---------- */
  var io = new IntersectionObserver(function (entries) {
    entries.forEach(function (e) {
      if (e.isIntersecting) { e.target.classList.add("in"); io.unobserve(e.target); }
    });
  }, { threshold: 0.12, rootMargin: "0px 0px -8% 0px" });
  document.querySelectorAll(".reveal:not(.in)").forEach(function (el) { io.observe(el); });

  /* ============================================================
     HERO CANVAS — ciudad + escaneo + alertas
     ============================================================ */
  (function heroCanvas() {
    var canvas = document.getElementById("hero-canvas");
    if (!canvas) return;
    var ctx = canvas.getContext("2d");
    var W, H, DPR, buildings = [], particles = [], pings = [], t = 0;
    var reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    function rgba(l, c, h, a) { return "oklch(" + l + " " + c + " " + h + " / " + a + ")"; }

    function resize() {
      DPR = Math.min(window.devicePixelRatio || 1, 2);
      W = canvas.clientWidth; H = canvas.clientHeight;
      canvas.width = W * DPR; canvas.height = H * DPR;
      ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
      buildBuildings();
    }

    function buildBuildings() {
      buildings = [];
      var x = -20;
      var baseY = H;
      while (x < W + 40) {
        var bw = 28 + Math.random() * 60;
        var bh = 70 + Math.random() * (H * 0.42);
        buildings.push({ x: x, w: bw, h: bh, y: baseY - bh, win: Math.random() });
        x += bw + 6 + Math.random() * 14;
      }
      // alert pings anchored to some rooftops
      pings = [];
      var picks = buildings.filter(function (_, i) { return i % 3 === 1; }).slice(0, 6);
      var icons = ["bug", "rat", "mos", "bat", "tank", "drop"];
      picks.forEach(function (b, i) {
        pings.push({ x: b.x + b.w / 2, y: b.y - 6, type: icons[i % icons.length], phase: Math.random() * Math.PI * 2, lit: false });
      });
    }

    function spawnParticle() {
      particles.push({ x: Math.random() * W, y: H, vy: 0.2 + Math.random() * 0.5, r: 0.6 + Math.random() * 1.6, a: 0.1 + Math.random() * 0.4 });
    }

    function drawPingIcon(p, alpha) {
      ctx.save();
      ctx.translate(p.x, p.y);
      // pin
      ctx.strokeStyle = rgba(0.66, 0.24, 26, alpha);
      ctx.fillStyle = rgba(0.66, 0.24, 26, alpha * 0.9);
      ctx.lineWidth = 1.4;
      ctx.beginPath();
      ctx.arc(0, -10, 6, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.moveTo(0, -4); ctx.lineTo(-3, -8); ctx.lineTo(3, -8); ctx.closePath();
      ctx.fill();
      // little dot
      ctx.fillStyle = rgba(0.985, 0, 0, alpha);
      ctx.beginPath(); ctx.arc(0, -10, 2, 0, Math.PI * 2); ctx.fill();
      ctx.restore();
    }

    var scanX = -200;
    function frame() {
      ctx.clearRect(0, 0, W, H);

      // horizon glow
      var hg = ctx.createLinearGradient(0, H * 0.45, 0, H);
      hg.addColorStop(0, rgba(0.38, 0.08, 156, 0));
      hg.addColorStop(1, rgba(0.46, 0.10, 156, 0.28));
      ctx.fillStyle = hg;
      ctx.fillRect(0, H * 0.45, W, H * 0.55);

      // skyline
      buildings.forEach(function (b) {
        var bg = ctx.createLinearGradient(0, b.y, 0, H);
        bg.addColorStop(0, rgba(0.30, 0.05, 158, 0.85));
        bg.addColorStop(1, rgba(0.22, 0.045, 158, 0.92));
        ctx.fillStyle = bg;
        ctx.fillRect(b.x, b.y, b.w, b.h);
        ctx.strokeStyle = rgba(0.80, 0.19, 150, 0.22);
        ctx.lineWidth = 1;
        ctx.strokeRect(b.x + 0.5, b.y + 0.5, b.w - 1, b.h - 1);
        // roof accent line
        ctx.strokeStyle = rgba(0.86, 0.20, 148, 0.30);
        ctx.beginPath(); ctx.moveTo(b.x, b.y + 0.5); ctx.lineTo(b.x + b.w, b.y + 0.5); ctx.stroke();
        // windows
        var cols = Math.max(2, Math.floor(b.w / 14));
        var rows = Math.max(3, Math.floor(b.h / 18));
        for (var r = 0; r < rows; r++) {
          for (var c = 0; c < cols; c++) {
            var wx = b.x + 6 + c * ((b.w - 12) / cols);
            var wy = b.y + 8 + r * ((b.h - 14) / rows);
            var lit = (Math.sin(b.win * 50 + r * 3 + c * 7) > 0.5);
            ctx.fillStyle = lit ? rgba(0.86, 0.18, 150, 0.40) : rgba(0.80, 0.05, 150, 0.10);
            ctx.fillRect(wx, wy, 4, 5);
          }
        }
      });

      // scan beam
      if (!reduce) { scanX += 1.4; if (scanX > W + 220) scanX = -220; }
      var grad = ctx.createLinearGradient(scanX - 140, 0, scanX + 140, 0);
      grad.addColorStop(0, rgba(0.80, 0.19, 150, 0));
      grad.addColorStop(0.5, rgba(0.80, 0.19, 150, 0.22));
      grad.addColorStop(1, rgba(0.80, 0.19, 150, 0));
      ctx.fillStyle = grad;
      ctx.fillRect(scanX - 140, 0, 280, H);
      // bright leading line
      ctx.strokeStyle = rgba(0.88, 0.20, 148, 0.65);
      ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(scanX, 0); ctx.lineTo(scanX, H); ctx.stroke();

      // pings light up when beam passes
      pings.forEach(function (p) {
        var near = Math.abs(p.x - scanX) < 60;
        if (near) p.lit = true;
        var pulse = 0.55 + 0.45 * Math.sin(t * 0.06 + p.phase);
        var alpha = p.lit ? (0.5 + 0.5 * pulse) : 0.18;
        // ring
        if (p.lit) {
          var rr = 8 + (1 - (pulse)) * 14;
          ctx.strokeStyle = rgba(0.66, 0.24, 26, 0.25 * pulse);
          ctx.lineWidth = 1.4;
          ctx.beginPath(); ctx.arc(p.x, p.y - 10, rr, 0, Math.PI * 2); ctx.stroke();
        }
        drawPingIcon(p, alpha);
      });

      // floating particles (mist)
      if (!reduce) {
        if (particles.length < 60 && Math.random() < 0.4) spawnParticle();
        particles.forEach(function (pt) {
          pt.y -= pt.vy; pt.x += Math.sin(pt.y * 0.02) * 0.2;
        });
        particles = particles.filter(function (pt) { return pt.y > -10; });
        particles.forEach(function (pt) {
          ctx.fillStyle = rgba(0.86, 0.20, 148, pt.a * 0.5);
          ctx.beginPath(); ctx.arc(pt.x, pt.y, pt.r, 0, Math.PI * 2); ctx.fill();
        });
      }

      // subtle grid floor
      ctx.strokeStyle = rgba(0.80, 0.19, 150, 0.05);
      ctx.lineWidth = 1;
      for (var gx = 0; gx < W; gx += 60) {
        ctx.beginPath(); ctx.moveTo(gx, H); ctx.lineTo(gx + 30, H - 60); ctx.stroke();
      }

      t++;
      requestAnimationFrame(frame);
    }

    window.addEventListener("resize", resize);
    resize();
    requestAnimationFrame(frame);
  })();

  /* ============================================================
     HERO — rotador "Controlamos: [servicio]"
     ============================================================ */
  (function heroRotator() {
    var el = document.getElementById("hr-word");
    if (!el) return;
    var words = ["Cucarachas", "Roedores", "Murciélagos", "Mosquitos", "Tanques de agua", "Análisis de agua", "Plagas urbanas"];
    var i = 0;
    el.style.opacity = "1";
    setInterval(function () {
      el.style.opacity = "0";
      el.style.transform = "translateY(8px)";
      setTimeout(function () {
        i = (i + 1) % words.length;
        el.textContent = words[i];
        el.style.opacity = "1";
        el.style.transform = "none";
      }, 350);
    }, 2400);
  })();

  /* ============================================================
     CAMPAÑAS — carrusel
     ============================================================ */
  (function campaigns() {
    var track = document.getElementById("camp-track");
    var prev = document.getElementById("camp-prev");
    var next = document.getElementById("camp-next");
    var dotsWrap = document.getElementById("camp-dots");
    if (!track) return;
    var cards = track.children;
    var index = 0;

    function perView() {
      var w = window.innerWidth;
      if (w <= 760) return 1;
      if (w <= 1080) return 2;
      return 3;
    }
    function maxIndex() { return Math.max(0, cards.length - perView()); }

    function renderDots() {
      dotsWrap.innerHTML = "";
      for (var i = 0; i <= maxIndex(); i++) {
        var d = document.createElement("span");
        d.className = "camp-dot" + (i === index ? " active" : "");
        (function (i) { d.addEventListener("click", function () { index = i; update(); }); })(i);
        dotsWrap.appendChild(d);
      }
    }
    function update() {
      if (index > maxIndex()) index = maxIndex();
      var card = cards[0];
      var gap = 22;
      var step = card.getBoundingClientRect().width + gap;
      track.style.transform = "translateX(" + (-index * step) + "px)";
      Array.prototype.forEach.call(dotsWrap.children, function (d, i) {
        d.classList.toggle("active", i === index);
      });
    }
    prev.addEventListener("click", function () { index = index <= 0 ? maxIndex() : index - 1; update(); });
    next.addEventListener("click", function () { index = index >= maxIndex() ? 0 : index + 1; update(); });
    window.addEventListener("resize", function () { renderDots(); update(); });

    // autoplay
    var timer = setInterval(function () { index = index >= maxIndex() ? 0 : index + 1; update(); }, 5000);
    track.addEventListener("mouseenter", function () { clearInterval(timer); });

    renderDots();
    update();
  })();

  /* ============================================================
     SELECTOR DE CLIENTE
     ============================================================ */
  (function clientSelector() {
    var tabsWrap = document.getElementById("cli-tabs");
    var panel = document.getElementById("cli-panel");
    if (!tabsWrap) return;

    var DATA = [
      { key: "Hogar", label: "Hogar", icon: "i-home", title: "Servicios para tu hogar",
        text: "Control de plagas, limpieza de tanques y análisis de agua para que tu casa esté siempre protegida, limpia y segura.",
        serv: ["Fumigación y control de plagas", "Control de cucarachas", "Control de roedores", "Control de mosquitos", "Limpieza de tanques", "Análisis de agua potable"],
        cliente: "un hogar" },
      { key: "Comercio", label: "Comercio", icon: "i-store", title: "Servicios para comercios",
        text: "Mantené tu local habilitado y seguro con control profesional de plagas y agua, sin interrumpir tu actividad.",
        serv: ["Control de plagas", "Fumigación de cucarachas", "Control de roedores", "Control de mosquitos", "Limpieza de tanques", "Análisis de agua potable"],
        cliente: "un comercio" },
      { key: "Empresa", label: "Empresa", icon: "i-building", title: "Servicios para empresas",
        text: "Soluciones sanitarias integrales para oficinas, depósitos y plantas, con planes preventivos a medida.",
        serv: ["Control de plagas urbano", "Control de roedores", "Fumigación de cucarachas", "Limpieza de tanques", "Análisis de agua potable", "Mantenimiento preventivo"],
        cliente: "una empresa" },
      { key: "Consorcio", label: "Consorcio", icon: "i-building", title: "Servicios para consorcios y administraciones",
        text: "Fumigación, control de plagas, limpieza de tanques, reparación, impermeabilización y análisis de agua potable para edificios y espacios comunes.",
        serv: ["Fumigación de edificios", "Control de cucarachas", "Control de roedores", "Limpieza de tanques", "Reparación e impermeabilización", "Análisis de agua potable", "Mantenimiento sanitario preventivo"],
        cliente: "un consorcio / administración" },
      { key: "Administración", label: "Administración", icon: "i-folder", title: "Servicios para administraciones",
        text: "Gestioná el mantenimiento sanitario de toda tu cartera de edificios con un único proveedor profesional.",
        serv: ["Fumigación de edificios", "Control de plagas", "Limpieza de tanques", "Reparación e impermeabilización", "Análisis de agua potable", "Mantenimiento sanitario preventivo"],
        cliente: "una administración" },
      { key: "Escuela", label: "Escuela", icon: "i-school", title: "Servicios para escuelas e instituciones",
        text: "Ambientes seguros para alumnos y personal: control de plagas, tanques desinfectados y agua analizada.",
        serv: ["Fumigación y control de plagas", "Control de cucarachas", "Control de roedores", "Limpieza de tanques", "Análisis bacteriológico de agua", "Mantenimiento preventivo"],
        cliente: "una escuela / institución" },
      { key: "Gobierno", label: "Gobierno", icon: "i-gov", title: "Servicios para gobierno e instituciones públicas",
        text: "Respuesta profesional para organismos públicos: control sanitario, tanques y análisis de agua a escala.",
        serv: ["Control de plagas urbano", "Control de roedores", "Control de mosquitos", "Limpieza de tanques", "Análisis físico-químico y arsénico", "Mantenimiento preventivo"],
        cliente: "un organismo de gobierno" },
      { key: "Pileta", label: "Pileta / club", icon: "i-pool", title: "Servicios para piletas y clubes",
        text: "Agua segura y espacios controlados para clubes y áreas recreativas durante toda la temporada.",
        serv: ["Análisis y control de agua de pileta", "Control de mosquitos e insectos", "Control de plagas", "Limpieza de tanques", "Análisis de agua potable", "Mantenimiento preventivo"],
        cliente: "una pileta / club" }
    ];

    DATA.forEach(function (d, i) {
      var b = document.createElement("button");
      b.className = "cli-tab" + (i === 3 ? " active" : "");
      b.innerHTML = '<svg><use href="#' + d.icon + '"/></svg>' + d.label;
      b.addEventListener("click", function () {
        tabsWrap.querySelectorAll(".cli-tab").forEach(function (t) { t.classList.remove("active"); });
        b.classList.add("active");
        render(d);
      });
      tabsWrap.appendChild(b);
    });

    function render(d) {
      var items = d.serv.map(function (s) {
        return '<div class="cli-serv-item"><span class="chk"><svg><use href="#i-check"/></svg></span>' + s + '</div>';
      }).join("");
      panel.innerHTML =
        '<div class="cli-info cli-fade">' +
          '<h3>' + d.title + '</h3>' +
          '<p>' + d.text + '</p>' +
          '<a class="btn btn-wa btn-lg" data-wa="un presupuesto" data-cliente="' + d.cliente + '" href="#"><svg><use href="#i-wa"/></svg> Pedir presupuesto para ' + d.label.toLowerCase() + '</a>' +
        '</div>' +
        '<div class="cli-serv cli-fade">' + items + '</div>';
      wireWa();
    }
    render(DATA[3]); // Consorcio por defecto (foco comercial)
  })();

  /* ============================================================
     QUIZ 3 PASOS
     ============================================================ */
  (function quiz() {
    var card = document.querySelector(".quiz-card");
    if (!card) return;
    var steps = card.querySelectorAll(".quiz-step");
    var bar = document.getElementById("qbar");
    var count = document.getElementById("qcount");
    var backBtn = document.getElementById("quiz-back");
    var nextBtn = document.getElementById("quiz-next");
    var sendBtn = document.getElementById("quiz-send");
    var zonaInput = document.getElementById("quiz-zona");
    var sumServ = document.getElementById("sum-serv");
    var sumCli = document.getElementById("sum-cli");
    var state = { servicio: "", cliente: "", zona: "" };
    var cur = 1;

    card.querySelectorAll(".quiz-opts").forEach(function (group) {
      var key = group.getAttribute("data-group");
      group.querySelectorAll(".quiz-opt").forEach(function (opt) {
        opt.addEventListener("click", function () {
          group.querySelectorAll(".quiz-opt").forEach(function (o) { o.classList.remove("sel"); });
          opt.classList.add("sel");
          if (key === "servicio") state.servicio = opt.getAttribute("data-val");
          else state.cliente = opt.getAttribute("data-val");
          updateSummary();
          // auto-advance for steps 1 & 2
          setTimeout(function () { if (cur < 3) go(cur + 1); }, 240);
        });
      });
    });

    if (zonaInput) zonaInput.addEventListener("input", function () { state.zona = zonaInput.value.trim(); updateSend(); });

    function updateSummary() {
      sumServ.textContent = state.servicio || "—";
      sumCli.textContent = state.cliente || "—";
    }
    function go(n) {
      cur = Math.max(1, Math.min(3, n));
      steps.forEach(function (s) { s.classList.toggle("active", +s.getAttribute("data-step") === cur); });
      bar.style.width = (cur / 3 * 100) + "%";
      count.textContent = "Paso " + cur + " / 3";
      backBtn.classList.toggle("hidden", cur === 1);
      nextBtn.style.display = cur < 3 ? "inline-flex" : "none";
      sendBtn.style.display = cur === 3 ? "inline-flex" : "none";
      if (cur === 3) { updateSend(); if (zonaInput) zonaInput.focus(); }
    }
    function updateSend() {
      var serv = state.servicio || "un servicio";
      var cli = state.cliente || "mi espacio";
      var zona = state.zona || "mi zona";
      var msg = "Hola, quiero consultar por " + serv + " para " + cli + " en " + zona + ".";
      sendBtn.setAttribute("href", "https://wa.me/" + WA_NUMBER + "?text=" + encodeURIComponent(msg));
      sendBtn.setAttribute("target", "_blank");
      sendBtn.setAttribute("rel", "noopener");
    }

    nextBtn.addEventListener("click", function () { go(cur + 1); });
    backBtn.addEventListener("click", function () { go(cur - 1); });
    go(1);
  })();

  /* ============================================================
     FAQ
     ============================================================ */
  (function faq() {
    var wrap = document.getElementById("faq-wrap");
    if (!wrap) return;
    var items = [
      ["¿Trabajan en Capital Federal?", "Sí. VAXA trabaja en toda la Ciudad Autónoma de Buenos Aires (CABA), atendiendo hogares, comercios, empresas, consorcios e instituciones."],
      ["¿Trabajan en Gran Buenos Aires?", "Sí. Cubrimos Gran Buenos Aires con cobertura operativa hasta Quilmes y hasta Pilar según disponibilidad."],
      ["¿Hacen fumigación para consorcios?", "Sí. Brindamos fumigación, control de plagas, limpieza de tanques, reparación, impermeabilización y análisis de agua potable para edificios, administraciones y espacios comunes."],
      ["¿Realizan limpieza de tanques?", "Sí. Hacemos limpieza, desinfección, reparación e impermeabilización de tanques de agua para hogares, edificios e instituciones."],
      ["¿Hacen análisis de agua potable?", "Sí. Realizamos análisis bacteriológico, físico-químico y de arsénico para agua potable, además de control de agua para piletas."],
      ["¿Trabajan con escuelas, empresas y gobierno?", "Sí. Atendemos hogares, comercios, empresas, consorcios, administraciones, escuelas, clubes, gobierno e instituciones públicas y privadas."],
      ["¿Hasta qué zonas llegan?", "Atendemos CABA y Gran Buenos Aires, con cobertura operativa hasta Quilmes y hasta Pilar según disponibilidad. Consultanos por tu zona puntual."],
      ["¿La fumigación sirve para cucarachas todo el año?", "Sí. Las cucarachas no son solo un problema de verano. Ofrecemos control profesional preventivo y correctivo durante todo el año."],
      ["¿También trabajan con piletas?", "Sí. Realizamos análisis y control de agua para piletas de hogares, clubes y espacios recreativos."],
      ["¿Puedo pedir presupuesto por WhatsApp?", "Sí. Podés escribirnos directo por WhatsApp y recibir asesoramiento y presupuesto rápido para tu caso."]
    ];
    items.forEach(function (it, i) {
      var div = document.createElement("div");
      div.className = "faq-item";
      div.innerHTML =
        '<button class="faq-q"><h3>' + it[0] + '</h3><span class="faq-icon"><svg><use href="#i-plus"/></svg></span></button>' +
        '<div class="faq-a"><div class="faq-a-inner"><p>' + it[1] + '</p></div></div>';
      var btn = div.querySelector(".faq-q");
      var ans = div.querySelector(".faq-a");
      btn.addEventListener("click", function () {
        var isOpen = div.classList.contains("open");
        wrap.querySelectorAll(".faq-item.open").forEach(function (o) { o.classList.remove("open"); });
        if (!isOpen) { div.classList.add("open"); }
      });
      wrap.appendChild(div);
    });
  })();

  /* ============================================================
     POPUP DE TEMPORADA
     ============================================================ */
  (function popup() {
    var overlay = document.getElementById("popup");
    if (!overlay) return;
    var closeBtn = document.getElementById("popup-close");
    var later = document.getElementById("popup-later");

    // Línea de escaneo del hero: se dispara al cerrar el popup
    // (para que se aprecie) y baja hasta el fondo del hero.
    var scan = document.querySelector(".hero-scan");
    var hero = document.getElementById("top");
    function setScanEnd() {
      if (scan && hero) scan.style.setProperty("--scan-end", (hero.clientHeight + 24) + "px");
    }
    setScanEnd();
    window.addEventListener("resize", setScanEnd);
    var scanned = false;
    function runScan() {
      if (scanned || !scan) return;
      scanned = true;
      setScanEnd();
      scan.classList.remove("scan-run");
      void scan.offsetWidth; // fuerza reinicio de la animación
      scan.classList.add("scan-run");
    }

    function close() { overlay.classList.remove("show"); runScan(); }
    closeBtn.addEventListener("click", close);
    later.addEventListener("click", close);
    overlay.addEventListener("click", function (e) { if (e.target === overlay) close(); });
    overlay.querySelectorAll("[data-wa]").forEach(function (a) { a.addEventListener("click", close); });

    // Se muestra en cada carga / recarga de la página.
    setTimeout(function () { overlay.classList.add("show"); }, 1200);
  })();

  /* ============================================================
     FORMULARIO DE CONTACTO POR MAIL (mailto)
     ============================================================ */
  (function mailForm() {
    var form = document.getElementById("mail-form");
    if (!form) return;
    var err = document.getElementById("mf-error");
    var TO = "felipelentini66@gmail.com";
    function val(id) { var el = document.getElementById(id); return el ? el.value.trim() : ""; }
    function validEmail(e) { return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e); }

    form.addEventListener("submit", function (e) {
      e.preventDefault();
      var nombre = val("mf-nombre"), email = val("mf-email"), tel = val("mf-tel"),
          serv = val("mf-serv"), zona = val("mf-zona"), msg = val("mf-msg");
      if (!nombre || !validEmail(email) || !msg) {
        if (err) err.classList.add("show");
        return;
      }
      if (err) err.classList.remove("show");
      var subject = "Consulta web VAXA — " + (serv || "Consulta general");
      var body = [
        "Nombre: " + nombre,
        "Email: " + email,
        tel ? "Teléfono: " + tel : "",
        "Servicio: " + (serv || "—"),
        zona ? "Zona: " + zona : "",
        "",
        "Mensaje:",
        msg
      ].filter(function (l) { return l !== ""; }).join("\n");
      window.location.href = "mailto:" + TO +
        "?subject=" + encodeURIComponent(subject) +
        "&body=" + encodeURIComponent(body);
    });

    ["mf-nombre", "mf-email", "mf-msg"].forEach(function (id) {
      var el = document.getElementById(id);
      if (el && err) el.addEventListener("input", function () { err.classList.remove("show"); });
    });
  })();

  /* ============================================================
     BICHOS CAMINANDO — dos capas: global (toda la web) + hero
     ============================================================ */
  (function bugs() {
    var reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduce) return;

    // SVG de un bicho mirando hacia arriba (eje -Y)
    function bugSVG() {
      return '' +
      '<svg width="34" height="46" viewBox="-17 -23 34 46">' +
        '<g class="ants">' +
          '<path class="bug-ant" d="M-2.5 -13 C -6 -17 -8 -19 -10 -22"/>' +
          '<path class="bug-ant" d="M2.5 -13 C 6 -17 8 -19 10 -22"/>' +
        '</g>' +
        '<g class="legs-l">' +
          '<path class="bug-leg" d="M-4 -6 L -13 -11"/>' +
          '<path class="bug-leg" d="M-5 0 L -15 0"/>' +
          '<path class="bug-leg" d="M-4 6 L -13 12"/>' +
        '</g>' +
        '<g class="legs-r">' +
          '<path class="bug-leg" d="M4 -6 L 13 -11"/>' +
          '<path class="bug-leg" d="M5 0 L 15 0"/>' +
          '<path class="bug-leg" d="M4 6 L 13 12"/>' +
        '</g>' +
        '<ellipse class="bug-body" cx="0" cy="5" rx="6.6" ry="10.5"/>' +
        '<ellipse class="bug-body" cx="0" cy="-4" rx="5" ry="6"/>' +
        '<ellipse class="bug-body" cx="0" cy="-11" rx="3.4" ry="3"/>' +
      '</svg>';
    }

    var tints = [
      "oklch(0.52 0.10 152)",  // verde medio
      "oklch(0.48 0.07 60)",   // marrón cucaracha claro
      "oklch(0.46 0.05 280)",  // gris azulado
      "oklch(0.56 0.11 150)"   // verde brillante
    ];

    function rand(a, b) { return a + Math.random() * (b - a); }

    // Crea una capa de bichos en un host con sus propios límites (dims).
    function spawnSystem(host, extraClass, dims, count) {
      var layer = document.createElement("div");
      layer.className = "bug-layer" + (extraClass ? " " + extraClass : "");
      layer.setAttribute("aria-hidden", "true");
      host.appendChild(layer);

      function spawnEdge(b) {
        var d = dims(), W = d.W, H = d.H;
        var side = (Math.random() * 4) | 0;
        if (side === 0) { b.x = rand(0, W); b.y = -40; b.ang = rand(Math.PI * 0.25, Math.PI * 0.75); }
        else if (side === 1) { b.x = W + 40; b.y = rand(0, H); b.ang = rand(Math.PI * 0.75, Math.PI * 1.25); }
        else if (side === 2) { b.x = rand(0, W); b.y = H + 40; b.ang = rand(Math.PI * 1.25, Math.PI * 1.75); }
        else { b.x = -40; b.y = rand(0, H); b.ang = rand(-Math.PI * 0.25, Math.PI * 0.25); }
      }

      function makeBug() {
        var el = document.createElement("div");
        el.className = "bug";
        el.innerHTML = bugSVG();
        el.style.color = tints[(Math.random() * tints.length) | 0];
        el.style.opacity = rand(0.72, 1).toFixed(2);
        layer.appendChild(el);
        var b = { el: el, s: rand(0.45, 0.95), x: 0, y: 0, ang: rand(0, Math.PI * 2),
                  speed: rand(0.45, 1.25), steer: rand(-0.01, 0.01), next: 0 };
        spawnEdge(b);
        return b;
      }

      var list = [];
      for (var i = 0; i < count; i++) list.push(makeBug());

      var t = 0, running = true;
      function loop() {
        if (!running) { requestAnimationFrame(loop); return; }
        var d = dims(), W = d.W, H = d.H, m = 70;
        t++;
        for (var i = 0; i < list.length; i++) {
          var b = list[i];
          if (t > b.next) { b.steer = rand(-0.025, 0.025); b.next = t + (rand(40, 140) | 0); }
          b.ang += b.steer + Math.sin(t * 0.05 + i) * 0.004;
          b.x += Math.cos(b.ang) * b.speed;
          b.y += Math.sin(b.ang) * b.speed;
          if (b.x < -m || b.x > W + m || b.y < -m || b.y > H + m) spawnEdge(b);
          var deg = b.ang * 180 / Math.PI + 90;
          b.el.style.transform = "translate3d(" + b.x.toFixed(1) + "px," + b.y.toFixed(1) + "px,0) rotate(" + deg.toFixed(1) + "deg) scale(" + b.s + ")";
        }
        requestAnimationFrame(loop);
      }
      document.addEventListener("visibilitychange", function () { running = !document.hidden; });
      requestAnimationFrame(loop);
    }

    var mobile = window.innerWidth <= 760;

    // 1) Capa GLOBAL fija: bichos por toda la web, detrás del contenido.
    spawnSystem(document.body, null,
      function () { return { W: window.innerWidth, H: window.innerHeight }; },
      mobile ? 5 : 11);

    // 2) Capa del HERO: bichos también en el header, detrás del contenido.
    var hero = document.getElementById("top");
    if (hero) {
      spawnSystem(hero, "bug-hero",
        function () { return { W: hero.clientWidth || window.innerWidth, H: hero.clientHeight || window.innerHeight }; },
        mobile ? 4 : 7);
    }
  })();

})();
