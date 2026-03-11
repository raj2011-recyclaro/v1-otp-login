require('./config/env');

const app = require('./app');
const env = require('./config/env');
const pool = require('./config/database');
const redisClient = require('./config/redis');

const startServer = async () => {
  try {
    await pool.query('SELECT 1');
    await redisClient.connect();

    app.listen(env.port, () => {
      console.log(`API server running on port ${env.port}`);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
};

startServer();
