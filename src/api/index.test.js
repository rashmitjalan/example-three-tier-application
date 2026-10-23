const { test, before, after, beforeEach } = require('node:test');
const assert = require('node:assert');
const path = require('node:path');

// Stub the db module so tests run without PostgreSQL.
const tasks = new Map();
let nextId = 1;
const queries = [];
const fakeDb = {
  async query(sql, params = []) {
    queries.push(sql);
    if (sql.startsWith('SELECT * FROM tasks WHERE id')) {
      const t = tasks.get(params[0]);
      return { rows: t ? [t] : [] };
    }
    if (sql.startsWith('SELECT')) return { rows: [...tasks.values()] };
    if (sql.startsWith('INSERT')) {
      const t = { id: nextId++, title: params[0], completed: false, created_at: new Date().toISOString() };
      tasks.set(t.id, t);
      return { rows: [t] };
    }
    if (sql.startsWith('UPDATE')) {
      const t = { ...tasks.get(params[2]), completed: params[0], title: params[1] };
      tasks.set(t.id, t);
      return { rows: [t] };
    }
    throw new Error(`unexpected query: ${sql}`);
  },
};
const dbPath = require.resolve(path.join(__dirname, 'db.js'));
require.cache[dbPath] = { id: dbPath, filename: dbPath, loaded: true, exports: fakeDb };

const app = require('./index');
let server;
let base;

before(async () => {
  server = app.listen(0);
  await new Promise((r) => server.once('listening', r));
  base = `http://127.0.0.1:${server.address().port}`;
});
after(() => server.close());
beforeEach(() => {
  tasks.clear();
  nextId = 1;
  queries.length = 0;
  tasks.set(1, { id: 1, title: 'existing', completed: false, created_at: '' });
  nextId = 2;
});

const send = (method, url, body) =>
  fetch(base + url, {
    method,
    headers: { 'Content-Type': 'application/json' },
    body: body === undefined ? undefined : JSON.stringify(body),
  });

test('POST /tasks creates a task', async () => {
  const res = await send('POST', '/tasks', { title: '  hello ' });
  assert.strictEqual(res.status, 201);
  assert.strictEqual((await res.json()).title, 'hello');
});

test('POST /tasks rejects missing title with 400', async () => {
  assert.strictEqual((await send('POST', '/tasks', {})).status, 400);
});

test('POST /tasks rejects titles over 500 chars with 400', async () => {
  const res = await send('POST', '/tasks', { title: 'a'.repeat(501) });
  assert.strictEqual(res.status, 400);
});

test('POST /tasks with no JSON body returns 400, not 500', async () => {
  const res = await fetch(base + '/tasks', { method: 'POST' });
  assert.strictEqual(res.status, 400);
});

test('PATCH /tasks/:id updates completed and title', async () => {
  const res = await send('PATCH', '/tasks/1', { completed: true, title: ' renamed ' });
  assert.strictEqual(res.status, 200);
  const body = await res.json();
  assert.strictEqual(body.completed, true);
  assert.strictEqual(body.title, 'renamed');
});

test('PATCH /tasks/:id returns 404 for unknown id', async () => {
  assert.strictEqual((await send('PATCH', '/tasks/99', { completed: true })).status, 404);
});

test('PATCH /tasks/:id returns 400 for non-numeric id without querying db', async () => {
  const res = await send('PATCH', '/tasks/abc', { completed: true });
  assert.strictEqual(res.status, 400);
  assert.strictEqual(queries.length, 0);
});

test('PATCH /tasks/:id returns 400 for non-string title', async () => {
  assert.strictEqual((await send('PATCH', '/tasks/1', { title: 5 })).status, 400);
});

test('PATCH /tasks/:id returns 400 for blank title', async () => {
  assert.strictEqual((await send('PATCH', '/tasks/1', { title: '   ' })).status, 400);
});

test('PATCH /tasks/:id returns 400 for titles over 500 chars', async () => {
  assert.strictEqual((await send('PATCH', '/tasks/1', { title: 'a'.repeat(501) })).status, 400);
});

test('PATCH /tasks/:id returns 400 for non-boolean completed', async () => {
  assert.strictEqual((await send('PATCH', '/tasks/1', { completed: 'false' })).status, 400);
});
