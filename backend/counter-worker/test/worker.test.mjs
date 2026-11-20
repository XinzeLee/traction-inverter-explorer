import test from 'node:test';
import assert from 'node:assert/strict';
import { DatabaseSync } from 'node:sqlite';
import worker, { CommunityCounter } from '../src/index.js';

function setup() {
  const db = new DatabaseSync(':memory:');
  const sql = {
    exec(query, ...args) {
      const stmt = db.prepare(query);
      if (/^SELECT\b/i.test(query) || /\bRETURNING\b/i.test(query)) {
        const rows = stmt.all(...args);
        return { toArray: () => rows, one: () => { assert.equal(rows.length, 1); return rows[0]; } };
      }
      stmt.run(...args);
      return { toArray: () => [] };
    },
  };
  const storage = {
    sql,
    transactionSync(callback) {
      db.exec('BEGIN');
      try { const result = callback(); db.exec('COMMIT'); return result; }
      catch (error) { db.exec('ROLLBACK'); throw error; }
    },
  };
  const object = new CommunityCounter({ storage });
  return { COUNTER: { getByName: () => ({ fetch: request => object.fetch(request) }) } };
}

function call(env, path, { method = 'GET', body, origin = 'https://xinzelee.github.io' } = {}) {
  const headers = { Origin: origin };
  if (body !== undefined) headers['Content-Type'] = 'application/json';
  const request = new Request(`https://example.workers.dev/v1/${path}`, { method, headers, body: body === undefined ? undefined : JSON.stringify(body) });
  return worker.fetch(request, env);
}

test('independent, durable totals with idempotent retries for visits and likes', async () => {
  const env = setup();
  const token = '28e5b60e-b9fc-4fa8-a514-d749d8bc562a';
  assert.deepEqual(await (await call(env, 'counts')).json(), { visits: 0, likes: 0 });
  for (let i = 0; i < 2; i++) assert.equal((await call(env, 'visit', { method: 'POST', body: { token } })).status, 200);
  assert.deepEqual(await (await call(env, 'like', { method: 'POST', body: { token } })).json(), { visits: 1, likes: 1 });
  assert.deepEqual(await (await call(env, 'like', { method: 'POST', body: { token } })).json(), { visits: 1, likes: 1 });
  assert.deepEqual(await (await call(env, 'visit', { method: 'POST', body: { token: 'another-valid-token-0002' } })).json(), { visits: 2, likes: 1 });
});

test('validates methods, tokens and cross-origin requests', async () => {
  const env = setup();
  assert.equal((await call(env, 'visit', { method: 'POST', body: { token: 'short' } })).status, 400);
  assert.equal((await call(env, 'visit')).status, 405);
  assert.equal((await call(env, 'missing')).status, 404);
  assert.equal((await call(env, 'counts', { origin: 'https://unrelated.example' })).status, 403);
  const preflight = await call(env, 'like', { method: 'OPTIONS', origin: 'http://localhost:4174' });
  assert.equal(preflight.status, 204);
  assert.equal(preflight.headers.get('access-control-allow-origin'), 'http://localhost:4174');
  assert.deepEqual(await (await call(env, 'counts')).json(), { visits: 0, likes: 0 });
});
