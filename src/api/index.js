const express = require('express');
const db = require('./db');

const app = express();
const PORT = process.env.PORT || 3001;
// Matches tasks.title varchar(500) in src/db/migrations.
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
  if (!/^[1-9]\d*$/.test(req.params.id) || !Number.isSafeInteger(Number(req.params.id))) {
    return res.status(400).json({ error: 'id must be a positive integer' });
  }
  const id = Number(req.params.id);

  const body = req.body;
  if (body === null || typeof body !== 'object' || Array.isArray(body)) {
    return res.status(400).json({ error: 'body must be a JSON object' });
  }
  const { completed, title } = body;

  if (completed === undefined && title === undefined) {
    return res.status(400).json({ error: 'at least one of title or completed is required' });
  }
  if (completed !== undefined && typeof completed !== 'boolean') {
    return res.status(400).json({ error: 'completed must be a boolean' });
  }
  if (title !== undefined) {
    if (typeof title !== 'string') {
      return res.status(400).json({ error: 'title must be a string' });
    }
    if (!title.trim()) {
      return res.status(400).json({ error: 'title must not be blank' });
    }
    if (title.trim().length > MAX_TITLE_LENGTH) {
      return res.status(400).json({ error: `title must be at most ${MAX_TITLE_LENGTH} characters` });
    }
  }

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

if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`API listening on port ${PORT}`);
  });
}

module.exports = app;
