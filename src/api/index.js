const express = require('express');
const db = require('./db');

const app = express();
const PORT = process.env.PORT || 3001;

app.use(express.json());

/**
 * GET /health
 * Liveness check. Does not touch the database.
 *
 * @param {import('express').Request} _req - Express request (unused).
 * @param {import('express').Response} res - Express response.
 * @returns {void} Responds 200 with `{ status: 'ok' }`.
 */
app.get('/health', (_req, res) => {
  res.json({ status: 'ok' });
});

/**
 * GET /tasks
 * Lists all tasks, oldest first (ordered by `created_at` ascending).
 *
 * @param {import('express').Request} _req - Express request (unused).
 * @param {import('express').Response} res - Express response.
 * @returns {Promise<void>} Responds 200 with an array of task rows.
 */
app.get('/tasks', async (_req, res) => {
  const { rows } = await db.query('SELECT * FROM tasks ORDER BY created_at ASC');
  res.json(rows);
});

/**
 * POST /tasks
 * Creates a new task. The title is trimmed before it is stored.
 *
 * @param {import('express').Request} req - Express request. Expects a JSON body with `title` (string).
 * @param {import('express').Response} res - Express response.
 * @returns {Promise<void>} Responds 201 with the created task row, or
 *   400 `{ error: 'title is required' }` when `title` is missing, not a string, or blank.
 */
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

/**
 * PATCH /tasks/:id
 * Updates a task: marks it complete/incomplete, renames it, or both.
 * Fields that are omitted keep their current value.
 *
 * @param {import('express').Request} req - Express request.
 *   `req.params.id` is the task id (parsed as an integer).
 *   `req.body` may contain `completed` (any value, coerced with Boolean) and/or `title` (string, trimmed).
 * @param {import('express').Response} res - Express response.
 * @returns {Promise<void>} Responds 200 with the updated task row, or
 *   404 `{ error: 'Not found' }` when no task has that id.
 */
app.patch('/tasks/:id', async (req, res) => {
  const id = parseInt(req.params.id, 10);
  const { completed, title } = req.body;

  const { rows } = await db.query('SELECT * FROM tasks WHERE id = $1', [id]);
  if (rows.length === 0) return res.status(404).json({ error: 'Not found' });

  const current = rows[0];
  const newCompleted = completed !== undefined ? Boolean(completed) : current.completed;
  const newTitle = title !== undefined ? title.trim() : current.title;

  const { rows: updated } = await db.query(
    'UPDATE tasks SET completed = $1, title = $2 WHERE id = $3 RETURNING *',
    [newCompleted, newTitle, id]
  );
  res.json(updated[0]);
});

app.listen(PORT, () => {
  console.log(`API listening on port ${PORT}`);
});
