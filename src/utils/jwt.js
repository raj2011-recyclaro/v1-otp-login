const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const env = require('../config/env');

if (!env.jwtSecret) {
  throw new Error('JWT_SECRET is required');
}

const signAccessToken = (user) => {
  return jwt.sign({ sub: user.id, role: user.userType, type: 'access' }, env.jwtSecret, {
    expiresIn: env.jwtExpiresIn
  });
};

const verifyAccessToken = (token) => {
  return jwt.verify(token, env.jwtSecret);
};

const generateRefreshToken = () => {
  return crypto.randomBytes(48).toString('hex');
};

const hashToken = (rawToken) => {
  return crypto.createHash('sha256').update(rawToken).digest('hex');
};

module.exports = {
  signAccessToken,
  verifyAccessToken,
  generateRefreshToken,
  hashToken
};
