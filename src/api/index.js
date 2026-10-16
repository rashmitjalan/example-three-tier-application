const express = require('express');
const db = require('./db');

const app = express();
const PORT = process.env.PORT || 3001;

app.use(express.json());

app.get('/health', (_req, res) => {
  res.json({ status: 'ok' });
});

// GET /tasks — list all tasks
app.get('/tasks', async (_req, res) => {
  const { rows } = await db.query('SELECT * FROM tasks ORDER BY created_at ASC');
  res.json(rows);
});

// POST /tasks — create a task
app.post('/tasks', async (req, res) => {
  // REVIEW (suggestion): with no body, req.body is undefined and this destructuring throws -> 500 HTML page.
  // Suggested change:
  //   - const { title } = req.body;
  //   + const { title } = req.body ?? {};
  const { title } = req.body;
  if (!title || typeof title !== 'string' || !title.trim()) {
    return res.status(400).json({ error: 'title is required' });
  }
  const { rows } = await db.query(
    'INSERT INTO tasks (title) VALUES ($1) RETURNING *',
    [title.trim()]
  );
  res.status(201).json(rows[0]);
});

// PATCH /tasks/:id — update a task (complete/uncomplete or rename)
app.patch('/tasks/:id', async (req, res) => {
  // id is a Postgres serial (int4): reject anything that is not a positive 32-bit integer
  // REVIEW (suggestion, nit): Number(req.params.id) is computed three times. Convert once and reuse:
  //   + const id = Number(req.params.id);
  //   + if (!/^\d+$/.test(req.params.id) || id < 1 || id > 2147483647) { ... }
  if (!/^\d+$/.test(req.params.id) || Number(req.params.id) < 1 || Number(req.params.id) > 2147483647) {
    return res.status(400).json({ error: 'id must be a positive integer' });
  }
  const id = Number(req.params.id);

  const body = req.body;
  // REVIEW (suggestion, nit): a body of null or "x" is rejected earlier by the JSON parser with
  // "request body must be valid JSON", which is misleading for null. Consider a wording such as
  // "request body must be a JSON object" in the parse-error handler below.
  if (body === null || typeof body !== 'object' || Array.isArray(body)) {
    return res.status(400).json({ error: 'request body must be a JSON object' });
  }
  const { completed, title } = body;

  if (completed !== undefined && typeof completed !== 'boolean') {
    return res.status(400).json({ error: 'completed must be a boolean' });
  }
  if (title !== undefined) {
    if (typeof title !== 'string' || !title.trim()) {
      return res.status(400).json({ error: 'title must be a non-empty string' });
    }
    if (title.trim().length > 500) {
      return res.status(400).json({ error: 'title must be at most 500 characters' });
    }
  }

  // REVIEW (suggestion): this SELECT and the UPDATE below are separate queries with no transaction.
  // Two concurrent PATCHes can each read the old row and overwrite each other's changes.
  // Suggested change: replace both queries with one atomic statement, and return 404 if rows is empty:
  //   + const { rows } = await db.query(
  //   +   'UPDATE tasks SET completed = COALESCE($1, completed), title = COALESCE($2, title) WHERE id = $3 RETURNING *',
  //   +   [completed ?? null, title !== undefined ? title.trim() : null, id]
  //   + );
  //   + if (rows.length === 0) return res.status(404).json({ error: 'Not found' });
  //   + res.json(rows[0]);
  const { rows } = await db.query('SELECT * FROM tasks WHERE id = $1', [id]);
  if (rows.length === 0) return res.status(404).json({ error: 'Not found' });

  const current = rows[0];
  const newCompleted = completed !== undefined ? completed : current.completed;
  const newTitle = title !== undefined ? title.trim() : current.title;

  const { rows: updated } = await db.query(
    'UPDATE tasks SET completed = $1, title = $2 WHERE id = $3 RETURNING *',
    [newCompleted, newTitle, id]
  );
  res.json(updated[0]);
});

// Malformed JSON bodies are client errors: answer with JSON instead of the default HTML page
app.use((err, _req, res, next) => {
  if (err.type === 'entity.parse.failed') {
    return res.status(400).json({ error: 'request body must be valid JSON' });
  }
  next(err);
});

app.listen(PORT, () => {
  console.log(`API listening on port ${PORT}`);
});
