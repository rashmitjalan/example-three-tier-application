const express = require('express');
const db = require('./db');

const app = express();
const PORT = process.env.PORT || 3001;

// Largest value a Postgres integer (int4) id column can hold.
const MAX_ID = 2147483647;
const MAX_TITLE_LENGTH = 500;

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
  const { title } = req.body ?? {};
  if (!title || typeof title !== 'string' || !title.trim()) {
    return res.status(400).json({ error: 'title is required' });
  }
  if (title.trim().length > MAX_TITLE_LENGTH) {
    return res.status(422).json({ error: `title must be at most ${MAX_TITLE_LENGTH} characters` });
  }
  const { rows } = await db.query(
    'INSERT INTO tasks (title) VALUES ($1) RETURNING *',
    [title.trim()]
  );
  res.status(201).json(rows[0]);
});

// PATCH /tasks/:id — update a task (complete/uncomplete or rename)
app.patch('/tasks/:id', async (req, res) => {
  const idParam = req.params.id;
  if (!/^\d+$/.test(idParam)) {
    return res.status(400).json({ error: 'id must be a positive integer' });
  }
  const id = Number(idParam);
  if (id < 1 || id > MAX_ID) {
    return res.status(404).json({ error: 'Not found' });
  }

  const { completed, title } = req.body ?? {};

  if (completed !== undefined && typeof completed !== 'boolean') {
    return res.status(400).json({ error: 'completed must be a boolean' });
  }

  if (title !== undefined) {
    if (typeof title !== 'string' || !title.trim()) {
      return res.status(400).json({ error: 'title must be a non-empty string' });
    }
    if (title.trim().length > MAX_TITLE_LENGTH) {
      return res.status(422).json({ error: `title must be at most ${MAX_TITLE_LENGTH} characters` });
    }
  }

  const { rows } = await db.query(
    `UPDATE tasks
        SET completed = COALESCE($1, completed),
            title = COALESCE($2, title)
      WHERE id = $3
      RETURNING *`,
    [
      completed ?? null,
      title !== undefined ? title.trim() : null,
      id,
    ]
  );
  if (rows.length === 0) return res.status(404).json({ error: 'Not found' });
  res.json(rows[0]);
});

// Final error handler: any unhandled error (including async rejections
// forwarded by Express 5) returns a JSON 500 instead of an HTML page.
// Client-side parse errors from express.json() keep their 4xx status.
// eslint-disable-next-line no-unused-vars
app.use((err, _req, res, next) => {
  if (res.headersSent) return next(err);
  const status = err.status >= 400 && err.status < 500 ? err.status : 500;
  if (status === 500) console.error(err);
  res.status(status).json({ error: status === 500 ? 'Internal server error' : err.message });
});

app.listen(PORT, () => {
  console.log(`API listening on port ${PORT}`);
});
