/* ============================================================
   VAXA — Configuración de contacto (datos de demo)
   Reemplazar por los números y mails reales del cliente.
   ============================================================ */
window.VAXA_CONFIG = {
  whatsapp: {
    fumigacion: "5491130236101",
    tanques: "5491130236101"
  },
  phone: {
    fumigacion: "+54 11 4582-3379",
    tanques: "+54 11 4582-3379"
  },
  email: {
    fumigacion: "fumigaciones@vaxafumigaciones.com",
    tanques: "tanques@vaxafumigaciones.com"
  },

  /* ============================================================
     TEMPORADA DE PLAGAS (cartel "EN TEMPORADA" del inicio)
     ------------------------------------------------------------
     Editá ESTO para marcar qué plaga está en temporada ahora.

     modo:
       "manual" → mostrás exactamente las plagas de la lista 'activas'.
       "auto"   → se eligen solas según el mes actual (campo 'meses').

     activas: (solo modo manual) qué plaga(s) están en temporada hoy.
              Ej: ["roedores"]  o  ["cucarachas","mosquitos"]
              Si ponés más de una y rotar:true, el cartel va alternando.

     rotar:     true/false — alterna cuando hay más de una activa.
     intervalo: segundos entre cambios al rotar.
     etiqueta:  texto del cartel superior (ej "EN TEMPORADA", "ALERTA").

     Plagas válidas: cucarachas · roedores · murcielagos · mosquitos
     En cada plaga podés ajustar nivel, actividad (0-100) e imagen.
     ============================================================ */
  temporada: {
    modo: "manual",
    activas: ["roedores"],
    rotar: true,
    intervalo: 4,
    etiqueta: "EN TEMPORADA",
    plagas: {
      cucarachas:  { nombre: "Cucarachas",  img: "assets/img/cucas.webp",     nivel: "Alta",  actividad: 88, color: "oklch(0.82 0.18 152)", meses: [10, 11, 12, 1, 2, 3] },
      roedores:    { nombre: "Roedores",    img: "assets/img/roedores.webp",  nivel: "Alta",  actividad: 80, color: "oklch(0.80 0.16 70)",  meses: [4, 5, 6, 7, 8, 9] },
      murcielagos: { nombre: "Murciélagos", img: "assets/img/bat.webp",        nivel: "Media", actividad: 62, color: "oklch(0.74 0.16 300)", meses: [10, 11, 12, 1, 2] },
      mosquitos:   { nombre: "Mosquitos",   img: "assets/img/mosquitos.webp", nivel: "Alta",  actividad: 90, color: "oklch(0.80 0.14 215)", meses: [10, 11, 12, 1, 2, 3, 4] }
    }
  }
};
