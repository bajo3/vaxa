<?php
/* ============================================================
   VAXA — Configuración del endpoint de presupuestos
   ------------------------------------------------------------
   Acá NO van secretos. El token de Meta Conversions API se lee
   de una variable de entorno o de un archivo FUERA de public_html
   (ver docs/MEDICION.md → "Meta Conversions API").
   ============================================================ */
$privateDir = dirname(__DIR__, 2); // en Hostinger: carpeta del dominio, fuera de public_html

return [
    // Destino real de cada solicitud
    'mail_to'       => 'info@vaxasrl.com.ar',
    // Remitente: tiene que ser una casilla del MISMO dominio para no caer en spam
    'mail_from'     => 'no-reply@vaxasrl.com.ar',
    'mail_from_name'=> 'Web VAXA',
    // Pasa -f<mail_from> a sendmail (mejora SPF). Si el hosting lo rechaza, poner false.
    'envelope_sender' => true,

    // Orígenes aceptados (protección básica contra envíos desde otros sitios)
    'allowed_origins' => [
        'https://vaxasrl.com.ar',
        'https://www.vaxasrl.com.ar',
    ],

    // Carpeta para el control de duplicados, límite de envíos y respaldo.
    // Se intenta fuera de public_html; si no se puede escribir, usa api/_data (bloqueada por .htaccess).
    'data_dirs' => [
        $privateDir . '/vaxa-data',
        __DIR__ . '/_data',
    ],
    // Guardar un respaldo de cada solicitud (JSON por línea) además del mail
    'store_backup' => true,

    // Antispam
    'min_fill_ms'     => 2500,  // menos que esto = bot
    'rate_limit_max'  => 5,     // envíos por IP…
    'rate_limit_secs' => 600,   // …cada 10 minutos

    // ---------- Meta Conversions API (opcional, apagado por defecto) ----------
    // Se activa solo si hay pixel_id + token. El evento Lead se envía con el
    // mismo event_id que el navegador (lead_id) para que Meta deduplique.
    'meta_pixel_id'      => '',          // ej: '123456789012345'
    'meta_graph_version' => 'v24.0',     // revisar la versión vigente en developers.facebook.com
    'meta_test_event_code' => '',        // ej: 'TEST12345' mientras se prueba en Events Manager
    'meta_send_phone'    => false,       // enviar teléfono hasheado (SHA-256). Solo si la política lo informa.
    // Archivo PHP fuera de public_html que devuelve ['meta_capi_token' => '...']
    'secrets_file'       => $privateDir . '/vaxa-secrets.php',
];
