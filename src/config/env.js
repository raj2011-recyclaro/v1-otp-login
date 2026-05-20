const dotenv = require('dotenv');

dotenv.config();

module.exports = {
  nodeEnv: process.env.NODE_ENV || 'development',
  port: Number(process.env.PORT || 3000),
  databaseUrl: process.env.DATABASE_URL,
  redisUrl: process.env.REDIS_URL,
  jwtSecret: process.env.JWT_SECRET,
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '15m',
  refreshTokenTtlDays: Number(process.env.REFRESH_TOKEN_TTL_DAYS || 30),
  firebaseProjectId: process.env.FIREBASE_PROJECT_ID,
  firebaseServiceAccountPath: process.env.FIREBASE_SERVICE_ACCOUNT_PATH,
  otpRateLimitMax: Number(process.env.OTP_RATE_LIMIT_MAX || 5),
  otpRateLimitWindowSec: Number(process.env.OTP_RATE_LIMIT_WINDOW_SEC || 300),
  adminLoginCodes: process.env.ADMIN_LOGIN_CODES
    ? process.env.ADMIN_LOGIN_CODES.split(',').map((code) => code.trim()).filter(Boolean)
    : process.env.ADMIN_LOGIN_CODE
      ? [process.env.ADMIN_LOGIN_CODE.trim()].filter(Boolean)
      : [],
  smtpHost: process.env.SMTP_HOST,
  smtpPort: Number(process.env.SMTP_PORT || 587),
  smtpSecure: process.env.SMTP_SECURE === 'true',
  smtpUser: process.env.SMTP_USER,
  smtpPass: process.env.SMTP_PASS,
  smtpFromEmail: process.env.SMTP_FROM_EMAIL || process.env.SMTP_USER,
  pickupAckEmail: process.env.PICKUP_ACK_EMAIL || 'partner@recyclaro.com',
  pickupAckCcEmails: process.env.PICKUP_ACK_CC_EMAILS
    ? process.env.PICKUP_ACK_CC_EMAILS.split(',').map((email) => email.trim()).filter(Boolean)
    : []
};
