Forge status update for this PR.

Commit 937e217 on this branch:
- PATCH /tasks/:id returns 400 for a non-numeric id, 400 for a non-boolean `completed`, and 400 for a missing or blank `title`. It returns 404 when the task does not exist.
- POST /tasks returns 422 when the title is longer than 500 characters.
- Express error handler returns JSON. Unexpected errors return 500 `{"error":"Internal server error"}`.
- src/api/db.js adds a pool.on('error') listener.

Verification: node --check passes on both files. The 404 and successful PATCH paths are not yet tested against a live PostgreSQL instance.
