// A separate Durable Object keeps this site's counts apart from the workshop.
const ROUTES = new Set(['/v1/counts', '/v1/visit', '/v1/like']);
const TOKEN = /^[A-Za-z0-9_-]{16,128}$/;

function isAllowedOrigin(origin) {
  if (!origin) return true; // Allows command-line checks; CORS is a browser policy.
  try {
    const url = new URL(origin);
    if (url.origin !== origin) return false;
    return (url.protocol === 'https:' && url.hostname === 'xinzelee.github.io') ||
      ((url.protocol === 'http:' || url.protocol === 'https:') &&
        (url.hostname === 'localhost' || url.hostname === '127.0.0.1'));
  } catch { return false; }
}

function reply(data, status = 200) {
  return Response.json(data, { status, headers: { 'Cache-Control': 'no-store' } });
}

export default {
  async fetch(request, env) {
    const origin = request.headers.get('Origin');
    if (!isAllowedOrigin(origin)) return reply({ error: 'Origin not allowed' }, 403);
    const cors = new Headers({
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
      'Vary': 'Origin',
    });
    if (origin) cors.set('Access-Control-Allow-Origin', origin);
    const pathname = new URL(request.url).pathname;
    let response;
    if (!ROUTES.has(pathname)) response = reply({ error: 'Not found' }, 404);
    else if (request.method === 'OPTIONS') response = new Response(null, { status: 204 });
    else if ((pathname === '/v1/counts' && request.method !== 'GET') ||
             (pathname !== '/v1/counts' && request.method !== 'POST')) {
      response = reply({ error: 'Method not allowed' }, 405);
    } else {
      const stub = env.COUNTER.getByName('traction-inverter');
      response = await stub.fetch(request);
    }
    const headers = new Headers(response.headers);
    cors.forEach((value, key) => headers.set(key, value));
    return new Response(response.body, { status: response.status, headers });
  },
};

export class CommunityCounter {
  constructor(state) {
    this.storage = state.storage;
    this.sql = state.storage.sql;
    this.sql.exec('CREATE TABLE IF NOT EXISTS events (kind TEXT NOT NULL, token TEXT NOT NULL, PRIMARY KEY (kind, token))');
    this.sql.exec('CREATE TABLE IF NOT EXISTS totals (id INTEGER PRIMARY KEY CHECK (id = 1), visits INTEGER NOT NULL, likes INTEGER NOT NULL)');
    this.sql.exec('INSERT OR IGNORE INTO totals (id, visits, likes) VALUES (1, 0, 0)');
  }

  async fetch(request) {
    const path = new URL(request.url).pathname;
    if (path !== '/v1/counts') {
      if (Number(request.headers.get('Content-Length') || 0) > 1024) return reply({ error: 'Body too large' }, 413);
      let data;
      try {
        const body = await request.text();
        if (body.length > 1024) return reply({ error: 'Body too large' }, 413);
        data = JSON.parse(body);
      } catch { return reply({ error: 'Invalid JSON' }, 400); }
      if (!data || typeof data.token !== 'string' || !TOKEN.test(data.token)) return reply({ error: 'Invalid token' }, 400);
      const kind = path === '/v1/visit' ? 'visit' : 'like';
      this.storage.transactionSync(() => {
        const inserted = this.sql.exec('INSERT OR IGNORE INTO events (kind, token) VALUES (?, ?) RETURNING token', kind, data.token).toArray();
        if (inserted.length) this.sql.exec(kind === 'visit' ? 'UPDATE totals SET visits = visits + 1 WHERE id = 1' : 'UPDATE totals SET likes = likes + 1 WHERE id = 1');
      });
    }
    const counts = this.sql.exec('SELECT visits, likes FROM totals WHERE id = 1').one();
    return reply({ visits: counts.visits, likes: counts.likes });
  }
}
