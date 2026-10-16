const { Pool } = require('pg');

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

// An idle client can error (e.g. the DB restarts). Without a listener the
// error is emitted on the process and crashes the API; log it instead.
pool.on('error', (err) => {
  console.error('Unexpected PostgreSQL pool error', err);
});

module.exports = pool;
