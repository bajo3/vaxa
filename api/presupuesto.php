<?php
/* ============================================================
   VAXA — Recepción de solicitudes de presupuesto
   POST /api/presupuesto.php  (JSON)
   Responde {ok:true, lead_id} SOLO si el mail salió del servidor.
   ============================================================ */
declare(strict_types=1);

header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store');
header('X-Content-Type-Options: nosniff');
header('X-Robots-Tag: noindex');

$cfg = require __DIR__ . '/config.php';

function respond(int $code, array $data): void
{
    http_response_code($code);
    echo json_encode($data, JSON_UNESCAPED_UNICODE);
    exit;
}

function clean(string $s, int $max, bool $multiline = false): string
{
    $s = trim($s);
    // fuera caracteres de control (y saltos de línea si es una sola línea → evita inyección de cabeceras)
    $s = $multiline
        ? preg_replace('/[^\P{C}\n\t]/u', '', str_replace("\r", '', $s))
        : preg_replace('/\p{C}/u', ' ', $s);
    $s = (string) $s;
    return mb_substr($s, 0, $max, 'UTF-8');
}

function dataDir(array $cfg): ?string
{
    foreach ($cfg['data_dirs'] as $d) {
        if (!is_dir($d)) @mkdir($d, 0750, true);
        if (is_dir($d) && is_writable($d)) return $d;
    }
    return null;
}

/* ---------- Método y origen ---------- */
if (($_SERVER['REQUEST_METHOD'] ?? '') !== 'POST') {
    header('Allow: POST');
    respond(405, ['ok' => false, 'error' => 'method']);
}
$origin = $_SERVER['HTTP_ORIGIN'] ?? '';
if ($origin !== '' && !in_array($origin, $cfg['allowed_origins'], true)) {
    respond(403, ['ok' => false, 'error' => 'origin']);
}

/* ---------- Entrada ---------- */
$raw = file_get_contents('php://input', false, null, 0, 20000);
$in = json_decode((string) $raw, true);
if (!is_array($in)) respond(400, ['ok' => false, 'error' => 'json']);

// Honeypot y tiempo de llenado (bots)
if (!empty($in['website'])) respond(400, ['ok' => false, 'error' => 'spam']);
$elapsed = (int) ($in['elapsed_ms'] ?? 0);
if ($elapsed < $cfg['min_fill_ms']) respond(400, ['ok' => false, 'error' => 'spam']);

$leadId = (string) ($in['lead_id'] ?? '');
if (!preg_match('/^[A-Za-z0-9-]{8,64}$/', $leadId)) respond(400, ['ok' => false, 'error' => 'lead_id']);

$nombre    = clean((string) ($in['nombre'] ?? ''), 80);
$telefono  = clean((string) ($in['telefono'] ?? ''), 30);
$servicio  = clean((string) ($in['servicio'] ?? ''), 80);
$localidad = clean((string) ($in['localidad'] ?? ''), 80);
$email     = clean((string) ($in['email'] ?? ''), 120);
$mensaje   = clean((string) ($in['mensaje'] ?? ''), 2000, true);
$page      = clean((string) ($in['page'] ?? ''), 120);

$SERVICIOS = [
    'Fumigación / control de plagas' => 'plagas', 'Cucarachas' => 'plagas', 'Roedores' => 'plagas',
    'Mosquitos' => 'plagas', 'Murciélagos' => 'plagas', 'Desinfección de espacios' => 'plagas',
    'Limpieza de tanques' => 'tanques', 'Reparación de tanques' => 'tanques',
    'Impermeabilización de tanques' => 'tanques', 'Análisis de agua' => 'tanques',
    'Consulta general' => 'general',
];
$digits = preg_replace('/\D/', '', $telefono);
$errors = [];
if (mb_strlen($nombre) < 2) $errors[] = 'nombre';
if (strlen((string) $digits) < 8) $errors[] = 'telefono';
if (!isset($SERVICIOS[$servicio])) $errors[] = 'servicio';
if (mb_strlen($localidad) < 2) $errors[] = 'localidad';
if (mb_strlen($mensaje) < 5) $errors[] = 'mensaje';
if ($email !== '' && !filter_var($email, FILTER_VALIDATE_EMAIL)) $errors[] = 'email';
if ($errors) respond(422, ['ok' => false, 'error' => 'validation', 'fields' => $errors]);
$serviceType = $SERVICIOS[$servicio];

/* ---------- Duplicados y límite por IP ---------- */
$dir = dataDir($cfg);
$ip = $_SERVER['REMOTE_ADDR'] ?? '0.0.0.0';
if ($dir) {
    if (is_file("$dir/ids/$leadId")) {
        respond(200, ['ok' => true, 'lead_id' => $leadId, 'duplicate' => true]); // ya recibido: no se reenvía
    }
    $rlFile = "$dir/rl-" . hash('sha256', $ip . '|vaxa') . '.json';
    $now = time();
    $hits = is_file($rlFile) ? (json_decode((string) @file_get_contents($rlFile), true) ?: []) : [];
    $hits = array_values(array_filter($hits, fn($t) => is_int($t) && $t > $now - $cfg['rate_limit_secs']));
    if (count($hits) >= $cfg['rate_limit_max']) respond(429, ['ok' => false, 'error' => 'rate']);
    $hits[] = $now;
    @file_put_contents($rlFile, json_encode($hits), LOCK_EX);
}

/* ---------- Atribución (solo lo que mandó el navegador con consentimiento) ---------- */
$attr = is_array($in['attribution'] ?? null) ? $in['attribution'] : [];
$attrLines = [];
foreach (['utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'utm_term', 'referrer', 'landing_page'] as $k) {
    if (!empty($attr[$k]) && is_string($attr[$k])) $attrLines[] = "$k: " . clean($attr[$k], 150);
}
foreach (['gclid', 'gbraid', 'wbraid', 'fbclid'] as $k) {
    if (!empty($attr[$k])) $attrLines[] = "$k: sí";
}

/* ---------- Mail ---------- */
$tipo = ['plagas' => 'Control de plagas', 'tanques' => 'Tanques de agua', 'general' => 'General'][$serviceType];
$subject = "Pedido de presupuesto web — $servicio — $localidad";
$body = implode("\n", array_filter([
    "Nuevo pedido de presupuesto desde la web",
    "",
    "Nombre:    $nombre",
    "Teléfono:  $telefono",
    $email !== '' ? "Email:     $email" : null,
    "Servicio:  $servicio ($tipo)",
    "Localidad: $localidad",
    "",
    "Consulta:",
    $mensaje,
    "",
    "----",
    "ID de solicitud: $leadId",
    "Página: $page",
    "Fecha: " . date('d/m/Y H:i'),
    $attrLines ? "Origen:\n  " . implode("\n  ", $attrLines) : "Origen: sin datos (sin consentimiento o acceso directo)",
], fn($l) => $l !== null));

$fromName = mb_encode_mimeheader($cfg['mail_from_name'], 'UTF-8');
$headers = [
    'From: ' . $fromName . ' <' . $cfg['mail_from'] . '>',
    'MIME-Version: 1.0',
    'Content-Type: text/plain; charset=UTF-8',
    'Content-Transfer-Encoding: 8bit',
    'X-Mailer: VAXA-web',
];
if ($email !== '') $headers[] = 'Reply-To: ' . $email;

$sent = $cfg['envelope_sender']
    ? @mail($cfg['mail_to'], mb_encode_mimeheader($subject, 'UTF-8'), $body, implode("\r\n", $headers), '-f' . $cfg['mail_from'])
    : @mail($cfg['mail_to'], mb_encode_mimeheader($subject, 'UTF-8'), $body, implode("\r\n", $headers));

/* ---------- Respaldo ---------- */
if ($dir && $cfg['store_backup']) {
    $row = [
        'lead_id' => $leadId, 'ts' => date('c'), 'mail_ok' => $sent, 'nombre' => $nombre,
        'telefono' => $telefono, 'email' => $email, 'servicio' => $servicio, 'service_type' => $serviceType,
        'localidad' => $localidad, 'mensaje' => $mensaje, 'page' => $page, 'origen' => $attrLines,
    ];
    @file_put_contents("$dir/leads-" . date('Y-m') . '.jsonl', json_encode($row, JSON_UNESCAPED_UNICODE) . "\n", FILE_APPEND | LOCK_EX);
}

if (!$sent) {
    error_log("[VAXA] mail() falló para lead $leadId");
    respond(502, ['ok' => false, 'error' => 'delivery']);
}

if ($dir) {
    if (!is_dir("$dir/ids")) @mkdir("$dir/ids", 0750, true);
    @touch("$dir/ids/$leadId");
}

/* ---------- Meta Conversions API (opcional) ---------- */
$token = getenv('META_CAPI_TOKEN') ?: '';
if ($token === '' && is_file($cfg['secrets_file'])) {
    $sec = include $cfg['secrets_file'];
    $token = is_array($sec) ? (string) ($sec['meta_capi_token'] ?? '') : '';
}
if ($cfg['meta_pixel_id'] !== '' && $token !== '' && !empty($in['consent_ads']) && function_exists('curl_init')) {
    $userData = [
        'client_ip_address' => $ip,
        'client_user_agent' => substr((string) ($_SERVER['HTTP_USER_AGENT'] ?? ''), 0, 400),
    ];
    if (!empty($_COOKIE['_fbp'])) $userData['fbp'] = (string) $_COOKIE['_fbp'];
    if (!empty($_COOKIE['_fbc'])) $userData['fbc'] = (string) $_COOKIE['_fbc'];
    if ($cfg['meta_send_phone']) {
        $ph = ltrim((string) $digits, '0');
        if (strpos($ph, '54') !== 0) $ph = '54' . $ph;
        $userData['ph'] = [hash('sha256', $ph)];
    }
    $payload = ['data' => [[
        'event_name' => 'Lead',
        'event_time' => time(),
        'event_id' => $leadId,
        'action_source' => 'website',
        'event_source_url' => 'https://vaxasrl.com.ar' . ($page !== '' ? $page : '/contacto.html'),
        'user_data' => $userData,
        'custom_data' => ['content_category' => $serviceType, 'content_name' => $servicio],
    ]]];
    if ($cfg['meta_test_event_code'] !== '') $payload['test_event_code'] = $cfg['meta_test_event_code'];
    $url = 'https://graph.facebook.com/' . $cfg['meta_graph_version'] . '/' . rawurlencode($cfg['meta_pixel_id'])
         . '/events?access_token=' . rawurlencode($token);
    $ch = curl_init($url);
    curl_setopt_array($ch, [
        CURLOPT_POST => true,
        CURLOPT_POSTFIELDS => json_encode($payload),
        CURLOPT_HTTPHEADER => ['Content-Type: application/json'],
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_TIMEOUT => 4,
    ]);
    $res = curl_exec($ch);
    $code = (int) curl_getinfo($ch, CURLINFO_HTTP_CODE);
    curl_close($ch);
    if ($code !== 200) error_log("[VAXA] Meta CAPI respondió $code para lead $leadId: " . substr((string) $res, 0, 300));
}

respond(200, ['ok' => true, 'lead_id' => $leadId]);
