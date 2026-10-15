const express = require('express');
const db = require('./db');

const app = express();
const PORT = process.env.PORT || 3001;

app.use(express.json());

/**
 * GET /health — liveness check.
 *
 * @param {import('express').Request} _req - Unused request.
 * @param {import('express').Response} res - Responds 200 with `{ status: 'ok' }`.
 * @returns {void}
 */
app.get('/health', (_req, res) => {
  res.json({ status: 'ok' });
});

/**
 * GET /tasks — list all tasks, oldest first.
 *
 * @param {import('express').Request} _req - Unused request.
 * @param {import('express').Response} res - Responds 200 with an array of task rows.
 * @returns {Promise<void>}
 */
app.get('/tasks', async (_req, res) => {
  const { rows } = await db.query('SELECT * FROM tasks ORDER BY created_at ASC');
  res.json(rows);
});

/**
 * POST /tasks — create a task.
 *
 * @param {import('express').Request} req - Body: `{ title: string }` (required, non-empty after trim).
 * @param {import('express').Response} res - Responds 201 with the created task,
 *   or 400 `{ error: 'title is required' }` if the title is missing or blank.
 * @returns {Promise<void>}
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
 * PATCH /tasks/:id — update a task (complete/uncomplete or rename).
 *
 * @param {import('express').Request} req - Params: `id` (integer).
 *   Body: `{ completed?: boolean, title?: string }`; omitted fields keep their current value.
 * @param {import('express').Response} res - Responds 200 with the updated task,
 *   or 404 `{ error: 'Not found' }` if no task has that id.
 * @returns {Promise<void>}
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

/**
 * DELETE /tasks/:id — delete a task.
 *
 * @param {import('express').Request} req - Params: `id` (integer).
 * @param {import('express').Response} res - Responds 204 with no body on success,
 *   or 404 `{ error: 'Not found' }` if the id is not a number or no task has that id.
 * @returns {Promise<void>}
 */
app.delete('/tasks/:id', async (req, res) => {
  const id = parseInt(req.params.id, 10);
  if (Number.isNaN(id)) return res.status(404).json({ error: 'Not found' });

  const { rowCount } = await db.query('DELETE FROM tasks WHERE id = $1', [id]);
  if (rowCount === 0) return res.status(404).json({ error: 'Not found' });

  res.status(204).end();
});

app.listen(PORT, () => {
  console.log(`API listening on port ${PORT}`);
});
