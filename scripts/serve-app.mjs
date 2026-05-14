import { createReadStream } from 'node:fs';
import { stat } from 'node:fs/promises';
import { createServer } from 'node:http';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const port = Number(process.env.PORT ?? 4173);
const contentTypes = new Map([
  ['.html', 'text/html; charset=utf-8'],
  ['.css', 'text/css; charset=utf-8'],
  ['.js', 'text/javascript; charset=utf-8'],
  ['.json', 'application/json; charset=utf-8']
]);

function safePath(urlPath) {
  const normalized = path.normalize(decodeURIComponent(urlPath.split('?')[0]));
  let relativePath = normalized === '/' ? 'public/index.html' : normalized.replace(/^\/+/, '');
  if (!relativePath.includes('/')) relativePath = `public/${relativePath}`;
  const absolutePath = path.resolve(root, relativePath);
  if (!absolutePath.startsWith(root)) return undefined;
  return absolutePath;
}

createServer(async (request, response) => {
  const absolutePath = safePath(request.url ?? '/');
  if (!absolutePath) {
    response.writeHead(403);
    response.end('Forbidden');
    return;
  }

  try {
    const fileStats = await stat(absolutePath);
    if (!fileStats.isFile()) throw new Error('Not a file');
    response.writeHead(200, { 'Content-Type': contentTypes.get(path.extname(absolutePath)) ?? 'application/octet-stream' });
    createReadStream(absolutePath).pipe(response);
  } catch {
    response.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
    response.end('Not found');
  }
}).listen(port, () => {
  console.log(`Luggage Check app running at http://localhost:${port}`);
});
