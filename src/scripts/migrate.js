const fs = require('fs');
const path = require('path');
require('../config/env');

const pool = require('../config/database');

const runMigration = async () => {
  const sqlPath = path.resolve('db/init.sql');
  const sql = fs.readFileSync(sqlPath, 'utf8');

  try {
    await pool.query(sql);
    console.log('Migration completed successfully');
  } catch (error) {
    console.error('Migration failed:', error.message);
    process.exitCode = 1;
  } finally {
    await pool.end();
  }
};

runMigration();
