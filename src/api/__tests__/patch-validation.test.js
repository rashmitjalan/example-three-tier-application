const { test, before, after, beforeEach } = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');

// Replace ./db with an in-memory stub so no real database is needed.
const calls = [];
const dbPath = path.join(__dirname, '..', 'db.js');
require.cache[dbPath] = {
  id: dbPath,
  filename: dbPath,
  loaded: true,
  exports: {
    query: async (sql, params) => {
      calls.push({ sql, params });
      if (sql.startsWith('SELECT')) {
        return params[0] === 1
          ? { rows: [{ id: 1, title: 'Old', completed: false }] }
          : { rows: [] };
      }
      if (sql.startsWith('UPDATE')) {
        const [completed, title, id] = params;
        return { rows: [{ id, title, completed }] };
      }
      throw new Error(`unexpected query: ${sql}`);
    },
  },
};

const app = require('../index.js');

let server;
let base;

before(async () => {
  await new Promise((resolve) => {
    server = app.listen(0, resolve);
  });
  base = `http://127.0.0.1:${server.address().port}`;
});

after(() => new Promise((resolve) => server.close(resolve)));

beforeEach(() => {
  calls.length = 0;
});

function patch(id, body) {
  return fetch(`${base}/tasks/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: typeof body === 'string' ? body : JSON.stringify(body),
  });
}

const badRequests = [
  ['non-numeric id', 'abc', { completed: true }],
  ['partly numeric id', '1abc', { completed: true }],
  ['zero id', '0', { completed: true }],
  ['negative id', '-1', { completed: true }],
  ['unsafe integer id', '99999999999999999999', { completed: true }],
  ['empty patch', '1', {}],
  ['array body', '1', [1]],
  ['non-string title', '1', { title: 42 }],
  ['null title', '1', { title: null }],
  ['blank title', '1', { title: '   ' }],
  ['title over 500 chars', '1', { title: 'a'.repeat(501) }],
  ['string completed', '1', { completed: 'true' }],
  ['numeric completed', '1', { completed: 1 }],
];

for (const [name, id, body] of badRequests) {
  test(`400 for ${name}`, async () => {
    const res = await patch(id, body);
    assert.equal(res.status, 400);
    const json = await res.json();
    assert.equal(typeof json.error, 'string');
    assert.equal(calls.length, 0, 'validation must happen before any DB query');
  });
}

test('valid patch updates title and completed', async () => {
  const res = await patch('1', { title: '  New  ', completed: true });
  assert.equal(res.status, 200);
  assert.deepEqual(await res.json(), { id: 1, title: 'New', completed: true });
});

test('500-character title is accepted', async () => {
  const res = await patch('1', { title: 'b'.repeat(500) });
  assert.equal(res.status, 200);
  assert.equal((await res.json()).title.length, 500);
});

test('valid patch for missing task returns 404', async () => {
  const res = await patch('2', { completed: false });
  assert.equal(res.status, 404);
});
