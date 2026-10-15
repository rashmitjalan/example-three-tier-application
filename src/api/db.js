const { Pool } = require('pg');

const pool = new Pool({ 
  connectionString: process.env.DATABASE_URL,
  // Connection pool configuration
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

/**
 * Handle pool errors
 */
pool.on('error', (err) => {
  console.error('Unexpected error on idle client', err);
});

/**
 * Execute a query with the connection pool
 * @param {string} text - SQL query text
 * @param {Array} [values] - Query parameters
 * @returns {Promise<Object>} Query result with rows and rowCount
 */
module.exports = pool;
