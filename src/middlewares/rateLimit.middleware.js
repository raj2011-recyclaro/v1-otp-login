const crypto = require('crypto');
const redisClient = require('../config/redis');
const env = require('../config/env');

const otpRateLimit = async (req, res, next) => {
  try {
    const idToken = req.body?.idToken || '';
    const tokenFingerprint = idToken
      ? crypto.createHash('sha256').update(idToken).digest('hex').slice(0, 12)
      : 'no-token';
    const key = `otp_login:${req.ip}:${tokenFingerprint}`;

    const current = await redisClient.incr(key);
    if (current === 1) {
      await redisClient.expire(key, env.otpRateLimitWindowSec);
    }

    if (current > env.otpRateLimitMax) {
      return res.status(429).json({
        success: false,
        message: 'Too many login attempts. Please try again later.'
      });
    }

    return next();
  } catch (error) {
    return next(error);
  }
};

module.exports = otpRateLimit;
