const { createClient } = require('redis');
const env = require('./env');

if (!env.redisUrl) {
  throw new Error('REDIS_URL is required');
}

// Single Redis client used for rate limiting and cache-like operations.
const redisClient = createClient({ url: env.redisUrl });

redisClient.on('error', (error) => {
  console.error('Redis error:', error.message);
});

module.exports = redisClient;
