const admin = require('../config/firebase');
const env = require('../config/env');
const ApiError = require('../utils/ApiError');
const {
  signAccessToken,
  generateRefreshToken,
  hashToken
} = require('../utils/jwt');
const userRepository = require('../repositories/user.repository');
const sessionRepository = require('../repositories/session.repository');

const decodeJwtPayload = (token) => {
  try {
    const [, payload] = token.split('.');
    if (!payload) return null;

    const normalizedPayload = payload.replace(/-/g, '+').replace(/_/g, '/');
    const paddedPayload = normalizedPayload.padEnd(
      normalizedPayload.length + ((4 - (normalizedPayload.length % 4)) % 4),
      '='
    );

    return JSON.parse(Buffer.from(paddedPayload, 'base64').toString('utf8'));
  } catch (_error) {
    return null;
  }
};

const buildTokenDebugContext = (idToken) => {
  const payload = decodeJwtPayload(idToken);

  if (!payload) {
    return { tokenShape: 'unreadable' };
  }

  return {
    aud: payload.aud,
    iss: payload.iss,
    sub: payload.sub,
    phoneNumber: payload.phone_number || null,
    authTime: payload.auth_time || null,
    exp: payload.exp || null
  };
};

const findOrCreateUserByPhone = async (phone, userType = 'user') => {
  let user = await userRepository.findByPhone(phone);
  if (!user) {
    user = await userRepository.create(phone, userType);
  }
  return user;
};

const createSessionTokens = async (userId) => {
  const accessToken = signAccessToken(userId);
  const refreshToken = generateRefreshToken();
  const refreshTokenHash = hashToken(refreshToken);

  await sessionRepository.create(userId, refreshTokenHash);

  return {
    accessToken,
    refreshToken,
    expiresIn: env.jwtExpiresIn
  };
};

const firebaseLogin = async (idToken, userType = 'user') => {
  let decodedToken;
  const expectedProjectId = admin.app().options.projectId || env.firebaseProjectId;
  const tokenDebugContext = buildTokenDebugContext(idToken);

  try {
    // Verify Firebase ID token from the mobile app.
    decodedToken = await admin.auth().verifyIdToken(idToken, true);
  } catch (error) {
    console.error('Firebase token verification failed', {
      firebaseAdminCode: error.code || null,
      firebaseAdminMessage: error.message || null,
      expectedProjectId,
      token: tokenDebugContext
    });
    throw new ApiError(401, 'Invalid Firebase ID token');
  }

  // Ensure token belongs to the configured Firebase project.
  if (expectedProjectId && decodedToken.aud !== expectedProjectId) {
    console.error('Firebase token project mismatch', {
      expectedProjectId,
      tokenAudience: decodedToken.aud,
      tokenIssuer: decodedToken.iss,
      phoneNumber: decodedToken.phone_number || null,
      uid: decodedToken.uid || null
    });
    throw new ApiError(401, 'Firebase token project mismatch');
  }

  const phone = decodedToken.phone_number;
  if (!phone) {
    throw new ApiError(400, 'Phone number not found in Firebase token');
  }

  const user = await findOrCreateUserByPhone(phone, userType);
  const tokens = await createSessionTokens(user.id);

  return { user, tokens };
};

const refreshToken = async (incomingRefreshToken) => {
  const incomingHash = hashToken(incomingRefreshToken);
  const session = await sessionRepository.findByRefreshTokenHash(incomingHash);

  if (!session) {
    throw new ApiError(401, 'Invalid refresh token');
  }

  // Rotate refresh token to reduce replay risk.
  await sessionRepository.deleteById(session.id);
  const tokens = await createSessionTokens(session.userId);

  return tokens;
};

module.exports = {
  firebaseLogin,
  refreshToken
};
