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
  try {
    // Verify Firebase ID token from the mobile app.
    decodedToken = await admin.auth().verifyIdToken(idToken, true);
  } catch (error) {
    console.error('Firebase token verification failed:', error);
    throw new ApiError(401, 'Invalid Firebase ID token');
  }

  const expectedProjectId = admin.app().options.projectId || env.firebaseProjectId;

  // Ensure token belongs to the configured Firebase project.
  if (expectedProjectId && decodedToken.aud !== expectedProjectId) {
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
