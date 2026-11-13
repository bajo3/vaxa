// Servidor estático mínimo para desarrollo (sin dependencias).
const http = require('http'), fs = require('fs'), path = require('path');
const ROOT = path.join(__dirname, '..');
const PORT = process.env.PORT || 5173;
const MIME = { '.html':'text/html; charset=utf-8', '.css':'text/css; charset=utf-8',
  '.js':'text/javascript; charset=utf-8', '.json':'application/json', '.webp':'image/webp',
  '.svg':'image/svg+xml', '.png':'image/png', '.jpg':'image/jpeg', '.woff2':'font/woff2',
  '.xml':'application/xml', '.txt':'text/plain; charset=utf-8', '.ico':'image/x-icon' };
function sendFile(file, res) {
  fs.readFile(file, (err, data) => {
    if (err) { res.writeHead(404); return res.end('not found'); }
    res.writeHead(200, { 'Content-Type': MIME[path.extname(file).toLowerCase()] || 'application/octet-stream' });
    res.end(data);
  });
}
// SOLO DESARROLLO: imita la respuesta de api/presupuesto.php (que necesita PHP + mail
// del hosting). No envía ningún mail. Para probar el caso de error: DEV_FORM_FAIL=1.
function devQuoteEndpoint(req, res) {
  let body = '';
  req.on('data', c => { body += c; if (body.length > 20000) req.destroy(); });
  req.on('end', () => {
    let d = {};
    try { d = JSON.parse(body); } catch (e) {}
    const json = (code, o) => { res.writeHead(code, { 'Content-Type': 'application/json; charset=utf-8' }); res.end(JSON.stringify(o)); };
    if (process.env.DEV_FORM_FAIL) return json(502, { ok: false, error: 'delivery' });
    if (d.website || (d.elapsed_ms || 0) < 2500) return json(400, { ok: false, error: 'spam' });
    if (!/^[A-Za-z0-9-]{8,64}$/.test(d.lead_id || '')) return json(400, { ok: false, error: 'lead_id' });
    console.log('[DEV] presupuesto recibido (no se envía mail):', d.lead_id, d.servicio, d.service_type);
    json(200, { ok: true, lead_id: d.lead_id, dev: true });
  });
}

http.createServer((req, res) => {
  let p = decodeURIComponent(req.url.split('?')[0]);
  if (p === '/api/presupuesto.php' && req.method === 'POST') return devQuoteEndpoint(req, res);
  if (p.startsWith('/api/')) { res.writeHead(404); return res.end('not found'); }
  if (p === '/' ) p = '/index.html';
  const file = path.join(ROOT, p);
  if (!file.startsWith(ROOT)) { res.writeHead(403); return res.end('forbidden'); }
  // Resolución de rutas tipo Vercel: exacto → +.html → /index.html
  const candidates = path.extname(p)
    ? [file]
    : [file, file + '.html', path.join(file, 'index.html')];
  (function tryNext(i) {
    if (i >= candidates.length) { res.writeHead(404); return res.end('not found'); }
    fs.stat(candidates[i], (err, st) => {
      if (!err && st.isFile()) return sendFile(candidates[i], res);
      tryNext(i + 1);
    });
  })(0);
}).listen(PORT, () => console.log('VAXA dev → http://localhost:' + PORT));
