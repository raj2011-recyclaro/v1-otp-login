const { Pool } = require('pg');
const env = require('./env');

if (!env.databaseUrl) {
  throw new Error('DATABASE_URL is required');
}

// Shared PostgreSQL pool for the application.
const pool = new Pool({
  connectionString: env.databaseUrl
});

module.exports = pool;
