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
http.createServer((req, res) => {
  let p = decodeURIComponent(req.url.split('?')[0]);
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
