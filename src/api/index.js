const express = require('express');
const db = require('./db');

const app = express();
const PORT = process.env.PORT || 3001;

app.use(express.json());

/**
 * Request logging middleware
 */
app.use((req, res, next) => {
  const start = Date.now();
  res.on('finish', () => {
    const duration = Date.now() - start;
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.path} - ${res.statusCode} (${duration}ms)`);
  });
  next();
});

/**
 * Health check endpoint
 * @route GET /health
 * @returns {Object} Health status
 */
app.get('/health', (_req, res) => {
  res.json({ status: 'ok' });
});

/**
 * List all tasks
 * @route GET /tasks
 * @returns {Array} Array of task objects
 */
app.get('/tasks', async (_req, res, next) => {
  try {
    const { rows } = await db.query('SELECT * FROM tasks ORDER BY created_at ASC');
    res.json(rows);
  } catch (error) {
    next(error);
  }
});

/**
 * Create a new task
 * @route POST /tasks
 * @param {Object} body - Request body
 * @param {string} body.title - Task title (required, non-empty)
 * @returns {Object} Created task object
 */
app.post('/tasks', async (req, res, next) => {
  try {
    const { title } = req.body;
    if (!title || typeof title !== 'string' || !title.trim()) {
      return res.status(400).json({ error: 'title is required and must be a non-empty string' });
    }
    const { rows } = await db.query(
      'INSERT INTO tasks (title) VALUES ($1) RETURNING *',
      [title.trim()]
    );
    res.status(201).json(rows[0]);
  } catch (error) {
    next(error);
  }
});

/**
 * Update a task (toggle completion status or rename)
 * @route PATCH /tasks/:id
 * @param {number} id - Task ID
 * @param {Object} body - Request body
 * @param {boolean} [body.completed] - Task completion status
 * @param {string} [body.title] - Task title
 * @returns {Object} Updated task object
 */
app.patch('/tasks/:id', async (req, res, next) => {
  try {
    const id = parseInt(req.params.id, 10);
    
    if (isNaN(id) || id <= 0) {
      return res.status(400).json({ error: 'Invalid task ID' });
    }

    const { completed, title } = req.body;

    // Validate that at least one field is being updated
    if (completed === undefined && title === undefined) {
      return res.status(400).json({ error: 'At least one of completed or title must be provided' });
    }

    // Validate title if provided
    if (title !== undefined && (typeof title !== 'string' || !title.trim())) {
      return res.status(400).json({ error: 'title must be a non-empty string' });
    }

    const { rows } = await db.query('SELECT * FROM tasks WHERE id = $1', [id]);
    if (rows.length === 0) {
      return res.status(404).json({ error: 'Task not found' });
    }

    const current = rows[0];
    const newCompleted = completed !== undefined ? Boolean(completed) : current.completed;
    const newTitle = title !== undefined ? title.trim() : current.title;

    const { rows: updated } = await db.query(
      'UPDATE tasks SET completed = $1, title = $2 WHERE id = $3 RETURNING *',
      [newCompleted, newTitle, id]
    );
    res.json(updated[0]);
  } catch (error) {
    next(error);
  }
});

/**
 * Error handling middleware
 */
app.use((err, _req, res, _next) => {
  console.error('Error:', err);
  
  // Database connection errors
  if (err.code === 'ECONNREFUSED') {
    return res.status(503).json({ error: 'Database connection failed' });
  }
  
  // Default error response
  res.status(500).json({ error: 'Internal server error' });
});

/**
 * 404 handler
 */
app.use((_req, res) => {
  res.status(404).json({ error: 'Not found' });
});

app.listen(PORT, () => {
  console.log(`API listening on port ${PORT}`);
});
