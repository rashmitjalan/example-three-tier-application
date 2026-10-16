const express = require('express');
const db = require('./db');

const app = express();
const PORT = process.env.PORT || 3001;
const MAX_TITLE_LENGTH = 500; // matches tasks.title varchar(500)

app.use(express.json());

// Returns an error message for an invalid title, or null when it is valid.
function validateTitle(title) {
  if (typeof title !== 'string' || !title.trim()) return 'title is required';
  if (title.trim().length > MAX_TITLE_LENGTH) {
    return `title must be at most ${MAX_TITLE_LENGTH} characters`;
  }
  return null;
}

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
  const titleError = validateTitle(title);
  if (titleError) return res.status(400).json({ error: titleError });

  const { rows } = await db.query(
    'INSERT INTO tasks (title) VALUES ($1) RETURNING *',
    [title.trim()]
  );
  res.status(201).json(rows[0]);
});

// PATCH /tasks/:id — update a task (complete/uncomplete or rename)
app.patch('/tasks/:id', async (req, res) => {
  if (!/^\d+$/.test(req.params.id)) {
    return res.status(400).json({ error: 'id must be a positive integer' });
  }
  const id = parseInt(req.params.id, 10);
  const { completed, title } = req.body ?? {};

  if (completed !== undefined && typeof completed !== 'boolean') {
    return res.status(400).json({ error: 'completed must be a boolean' });
  }
  if (title !== undefined) {
    const titleError = validateTitle(title);
    if (titleError) return res.status(400).json({ error: titleError });
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

// Error handler — Express 5 forwards rejected async handlers here.
// Always respond with JSON instead of the default HTML error page.
app.use((err, _req, res, next) => {
  if (res.headersSent) return next(err);
  if (err.type === 'entity.parse.failed') {
    return res.status(400).json({ error: 'Malformed JSON body' });
  }
  const status = err.status >= 400 && err.status < 500 ? err.status : 500;
  if (status === 500) console.error(err);
  res.status(status).json({ error: status === 500 ? 'Internal server error' : err.message });
});

app.listen(PORT, () => {
  console.log(`API listening on port ${PORT}`);
});
