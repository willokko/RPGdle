const http = require('http');
const fs = require('fs');
const path = require('path');
const port = 8000;
const server = http.createServer((req, res) => {
  let requestPath = req.url;
  if (requestPath === '/') requestPath = '/index.html';
  const filePath = path.join(process.cwd(), requestPath);
  if (!fs.existsSync(filePath) || fs.statSync(filePath).isDirectory()) {
    res.statusCode = 404;
    res.end('Not found');
    return;
  }
  const ext = path.extname(filePath).toLowerCase();
  const map = {
    '.html': 'text/html',
    '.js': 'application/javascript',
    '.css': 'text/css',
    '.csv': 'text/csv',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.svg': 'image/svg+xml'
  };
  res.setHeader('Content-Type', map[ext] || 'application/octet-stream');
  fs.createReadStream(filePath).pipe(res);
});
server.listen(port, () => console.log('Server running on http://localhost:' + port));
