# VAXA Fumigaciones — Sitio web

Landing page de **VAXA Fumigaciones**: control de plagas, fumigación, limpieza de tanques y análisis de agua potable en **CABA y Gran Buenos Aires**.

Sitio estático (HTML + CSS + JS vanilla), sin framework, sin build obligatorio. Diseño con sistema de tokens en **oklch** y fuentes auto-hospedadas (Space Grotesk + Manrope).

## Estructura

```
.
├── index.html              # Página (markup + SEO + JSON-LD)
├── css/
│   └── styles.css          # Sistema de diseño + @font-face + 4 paletas demo
├── js/
│   ├── interactions.js     # Interactividad: hero canvas, carrusel, quiz, FAQ, popup, bichos…
│   └── palette.js          # Switcher de paletas (demo)
├── assets/
│   ├── img/                # Fotos de servicios/galería (webp)
│   ├── icons/              # Iconos SVG
│   ├── fonts/              # Tipografías woff2 auto-hospedadas
│   └── favicon.svg
├── robots.txt
├── sitemap.xml
└── package.json
```

## Cómo correrlo

**Opción rápida:** abrí `index.html` directamente en el navegador (doble clic). Funciona offline.

**Servidor de desarrollo** (recomendado, evita restricciones de `file://`):

```bash
npm run dev          # levanta http://localhost:5173
```

## Demo: cambiar de paleta

Abajo-centro hay un dock con 4 paletas conmutables en vivo:

| Color | Paleta | |
|-------|--------|--|
| 🟢 | Esmeralda | default (verde marca) |
| 🔵 | Océano | azul agua |
| 🟠 | Cobre | cálido / terracota |
| 🟣 | Violeta | premium |

Cada paleta redefine los tokens vía `:root[data-palette="…"]` cambiando solo el *hue* (se preserva contraste). La elección se recuerda en `localStorage`.

> Para producción, ocultá el dock quitando `#vaxa-palette-dock` del HTML y `js/palette.js` del `index.html`.

## Contacto / negocio

- WhatsApp: `+54 9 2494 62-1182`
- Zona: CABA y Gran Buenos Aires (hasta Quilmes / Pilar según disponibilidad)

## Notas técnicas

- **SEO:** meta description/keywords, Open Graph, Twitter Card y **JSON-LD `PestControlService`** con `areaServed` (CABA + GBA), teléfono y servicios.
- **Performance:** imágenes `webp` con `loading="lazy"`, fuentes locales, CSS único.
- **Accesibilidad:** `alt` en todas las imágenes, `aria-label` en controles, respeto a `prefers-reduced-motion` en las animaciones.

---

Convertido desde un export offline a un proyecto de código mantenible.
